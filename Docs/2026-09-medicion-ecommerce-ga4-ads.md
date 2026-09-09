# Medición de ecommerce: GA4 y Google Ads

**Fecha:** 9 de septiembre de 2026
**Rama:** `develop` → `main` → despliegue en Plesk
**Estado:** implementado, pendiente de verificar en producción y de la parte de GTM

Documento de la serie de mantenimiento. Este recoge por qué GA4 no registraba ni una venta
y qué se ha cambiado para que las compras lleguen a GA4 y, desde ahí, a Google Ads.

---

## El diagnóstico, en una línea

La web **nunca empujó eventos de ecommerce al `dataLayer`**. Cargaba GTM y GA4, así que
medía visitas, pero no existía ni un solo `view_item`, `add_to_cart` o `purchase` que las
etiquetas pudieran recoger. No era un problema de configuración en GTM: faltaba el emisor.

Lo confirma el propio código antes del cambio: la única aparición de `dataLayer` en todo
`src/` estaba en el fragmento de GTM y en el de gtag.js de [`layout.tsx`](../src/app/layout.tsx),
ambos en el layout raíz. Ningún componente de producto, carrito o checkout lo tocaba.

Coincide con lo que reportó el equipo de Paid de la agencia, y explica la contradicción que
señalaban: **21 pedidos y 2.247,53 € en el panel de administración, y cero conversiones en
Ads**. No se dejó de vender; se dejó de medir. En realidad nunca se llegó a medir.

---

## Los dos datos que anclan todo

> **1. `item_id` es SIEMPRE el id del producto en base de datos**, en los cinco eventos y
> también en `purchase` (viene de `pedidoproducto.productoIdRef`). Si algún día se cambia por
> la referencia en un sitio y no en otro, GA4 los cuenta como productos distintos y los
> informes de producto salen partidos por la mitad.

> **2. `purchase` se dispara UNA sola vez por pedido**, en `/checkout/confirmacion`, y sólo
> ahí. Es el evento del que salen los ingresos de GA4 y las conversiones de Ads: duplicarlo
> infla las ventas y descuadra la puja automática de las campañas.

---

## Parte 1 — El emisor de eventos

Todo el ecommerce pasa por un único módulo: [`src/lib/analytics.ts`](../src/lib/analytics.ts).
Nada más empuja al `dataLayer`. Cada función corresponde a un evento del ecommerce mejorado
de GA4, con los nombres y la forma del objeto `ecommerce` que espera Google.

| Evento GA4          | Cuándo se dispara                                     | Dónde está el código |
|---------------------|-------------------------------------------------------|----------------------|
| `view_item`         | Al abrir una ficha de producto                        | [`ProductDetail.tsx`](<../src/app/(public)/productos/[id]/ProductDetail.tsx>) |
| `view_item`         | Al abrir la vista rápida desde el listado             | [`ProductQuickViewModal.tsx`](../src/components/ProductQuickViewModal.tsx) |
| `add_to_cart`       | Al añadir al carrito, desde cualquier pantalla        | [`cartService.ts`](../src/lib/cartService.ts) |
| `remove_from_cart`  | Al eliminar una línea del carrito                     | [`cartService.ts`](../src/lib/cartService.ts) |
| `view_cart`         | Al entrar en `/carrito` con productos                 | [`carrito/page.tsx`](<../src/app/(public)/carrito/page.tsx>) |
| `begin_checkout`    | Al pulsar "Tramitar pedido"                           | [`carrito/page.tsx`](<../src/app/(public)/carrito/page.tsx>) |
| `add_shipping_info` | Al confirmar el método de envío                       | [`checkout/envio/page.tsx`](<../src/app/(public)/checkout/envio/page.tsx>) |
| `add_payment_info`  | Al pulsar "Pagar" con una forma de pago elegida       | [`checkout/pago/page.tsx`](<../src/app/(public)/checkout/pago/page.tsx>) |
| `purchase`          | Al llegar a la confirmación del pedido                | [`checkout/confirmacion/page.tsx`](<../src/app/(public)/checkout/confirmacion/page.tsx>) |

Tres decisiones que conviene entender antes de tocar nada:

**`add_to_cart` y `remove_from_cart` se miden dentro de `cartService`, no en los botones.**
Toda la tienda añade al carrito por esa función —la ficha, la vista rápida y lo que se añada
en el futuro—, así que se mide una vez y queda cubierto todo. Si algún día se añade un botón
de compra que escriba en `localStorage` por su cuenta, saltándose `cartService`, ese botón no
se medirá: es la única forma de romperlo.

**El `purchase` lee el pedido del servidor, no del carrito.** Cuando el cliente llega a la
confirmación el carrito ya está vacío, y en tarjeta y PayPal además ha salido de la web y ha
vuelto: en el navegador no queda ni el importe ni las líneas. Por eso hay un endpoint nuevo,
[`/api/pedidos/[id]/analytics`](<../src/app/api/pedidos/[id]/analytics/route.ts>), que
devuelve el total definitivo (con envío, recargo y cupón ya aplicados) y los productos. Y
**sólo eso**: ni nombre, ni email, ni dirección, ni teléfono.

**Las cinco formas de pago acaban en `/checkout/confirmacion?pedido=<id>`** —tarjeta, PayPal,
Bizum, transferencia y contrareembolso—, así que midiendo ahí quedan cubiertas todas sin
repetir código en cada pasarela. Se comprobó una por una antes de elegir ese punto.

### Por qué `purchase` no se duplica

La página de confirmación se puede recargar, y se puede volver a ella desde el historial del
navegador. Cada visita dispararía otro `purchase` del mismo pedido. Por eso se deja marca en
`localStorage` (`ga4_compra_<transaction_id>`): un pedido se mide una vez por navegador. GA4
también deduplica por `transaction_id`, pero ni de forma inmediata ni fiable, así que la
primera barrera se pone en la web.

El `transaction_id` que se manda es el **número de pedido** (`PED-2026-0001`), que es el que
ve el cliente y el que aparece en el panel: así una conversión de Ads se puede cruzar con un
pedido concreto sin traducir ids internos.

---

## Parte 2 — El contenedor de GTM

La web cargaba sólo `GTM-58NXXRTJ`, que no tiene ninguna etiqueta de ecommerce. Las
etiquetas de producto y compra están montadas en **`GTM-5MJWJJC2`**, que nunca se llegó a
instalar. Ahora se cargan **los dos**: es una configuración soportada, todos los contenedores
de la página comparten el mismo `window.dataLayer` y cada uno ve los eventos que empuja
`analytics.ts`. Se mantiene el antiguo porque puede tener etiquetas en uso (remarketing,
píxeles) que no hay motivo para perder.

La lista se cambia sin tocar código con `NEXT_PUBLIC_GTM_IDS` (separados por comas). Al ser
`NEXT_PUBLIC_` se incrusta en el build: **cambiarla exige redesplegar**, no basta con
reiniciar Node.

### Cuidado con contar dos veces las visitas

`layout.tsx` carga además GA4 directamente con gtag.js (`NEXT_PUBLIC_GA_MEASUREMENT_ID`).
Si el contenedor `GTM-5MJWJJC2` trae su propia etiqueta de configuración de GA4 con **esa
misma medición** (`G-B115FWF028`), habrá **dos `page_view` por visita**: sesiones infladas y
métricas que no cuadran con el histórico.

Hay que elegir una de las dos vías, no las dos:

- **GA4 por GTM** (lo que espera la agencia): poner `NEXT_PUBLIC_GA_VIA_GTM=true` en el
  entorno de producción. Apaga el gtag.js del layout y deja que GA4 lo cargue GTM.
- **GA4 directo** (como hasta ahora): dejar la variable en `false` y **pausar** la etiqueta de
  configuración de GA4 en el contenedor `GTM-5MJWJJC2`. Los eventos de ecommerce siguen
  funcionando igual.

Mientras no se confirme qué hay dentro de `GTM-5MJWJJC2`, la variable se queda en `false`:
es como estaba y no rompe el histórico.

---

## Cómo comprobar que funciona

**1. En el navegador, sin GTM de por medio.** Abre una ficha de producto, la consola y:

```js
dataLayer.filter(c => c.event && c.event.startsWith('view_') || c.event === 'add_to_cart')
```

Debe aparecer `view_item` con su array `items`. Añade al carrito y vuelve a mirar: sale
`add_to_cart`. Si estos dos aparecen, el emisor funciona y lo que quede es configuración de
GTM.

**2. Con la vista previa de GTM.** Modo Preview del contenedor `GTM-5MJWJJC2` sobre
elhogardetusuenos.com y recorrer el embudo entero: ficha → carrito → envío → pago →
confirmación. Los nueve eventos de la tabla deben ir apareciendo en el panel izquierdo.

**3. En GA4, DebugView.** Un pedido real de prueba (transferencia o contrareembolso, que no
cobran nada) debe dejar un `purchase` con `transaction_id`, `value`, `shipping` e `items`.
Recargar esa misma página de confirmación **no** debe generar un segundo `purchase`.

**4. En Google Ads.** La conversión sale de la importación de `purchase` desde GA4: hasta que
no haya `purchase` en GA4, en Ads no aparece nada, y una vez lo haya tarda unas horas.

---

## Lo que queda en manos de la agencia

El frontend ya emite. En GTM queda:

1. Comprobar que los activadores de `GTM-5MJWJJC2` escuchan exactamente estos nombres de
   evento: `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`,
   `add_shipping_info`, `add_payment_info`, `purchase`.
2. Que las variables de capa de datos lean `ecommerce.items`, `ecommerce.value`,
   `ecommerce.transaction_id`, `ecommerce.currency` (siempre `EUR`), `ecommerce.shipping` y
   `ecommerce.coupon`.
3. Decidir la vía de GA4 (el apartado anterior) y decírnoslo, para dejar
   `NEXT_PUBLIC_GA_VIA_GTM` como toque.
4. Marcar `purchase` como conversión principal en Google Ads e importarla desde GA4.

---

## Trampas: lo que NO hay que hacer

> **No disparar `purchase` en las páginas de retorno de las pasarelas.** `redsys/ok` y
> `paypal/retorno` redirigen a la confirmación; medir ahí también contaría cada venta dos
> veces.

> **No meter la referencia de la variante en `item_variant`.** El campo `atributo` del
> carrito guarda la referencia sólo en unas pantallas, así que se deja fuera a propósito:
> incluirlo haría que el mismo producto apareciera en GA4 con dos nombres según desde dónde
> se hubiera añadido al carrito.

> **No añadir datos del cliente al endpoint de analytics.** Es público por necesidad (lo
> llama el navegador de un invitado sin sesión) y por eso devuelve sólo importes y productos.

---

## Dos cosas que aparecieron por el camino

Ninguna es de medición y ninguna se ha tocado en este cambio, pero conviene no perderlas de
vista:

- **`GET /api/pedidos/[id]` es público y devuelve datos personales completos** —nombre, email,
  teléfono, dirección y NIF del pedido— sin ninguna comprobación de sesión. Sus hermanos `PUT`
  y `DELETE` sí validan con `canEdit()`; el `GET` no. Con ids correlativos, cualquiera puede
  recorrer los pedidos de la tienda. Es el motivo de que el endpoint nuevo de analytics sea
  independiente y no reutilice ese.
- **El aviso de cookies no está conectado a nada.** `CookieConsent.tsx` guarda la preferencia
  en `localStorage` y lanza un evento, pero no aplica el Consent Mode de Google: las etiquetas
  se disparan igual acepte o rechace el visitante.
