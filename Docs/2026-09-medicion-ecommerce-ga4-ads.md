# Medición de ecommerce: GA4, Google Ads y Consent Mode

**Fecha:** 9 de septiembre de 2026 · **Actualizado:** 17 de septiembre de 2026
**Rama:** `develop` → `main` → despliegue en Plesk
**Estado:** desplegado y verificado en producción, evento por evento

Documento de la serie de mantenimiento. Recoge por qué GA4 no registraba ni una venta, todo lo que
se cambió para arreglarlo —en la web y en Tag Manager— y la implantación del Consent Mode v2.

---

## Cómo usar este documento

Si vuelves dentro de unos meses, lee sólo **"Los cuatro datos que anclan todo"** y **"Trampas: lo
que NO hay que hacer"**. Si algo ha dejado de medir, ve directo a **"Cómo comprobar que funciona"**:
ahí están los comandos exactos y cómo interpretar lo que devuelven.

---

## El diagnóstico, en una línea

La web **nunca empujó eventos de ecommerce al `dataLayer`**. Cargaba GTM y GA4, así que medía
visitas, pero no existía ni un `view_item`, ni un `add_to_cart`, ni un `purchase`. De ahí la
contradicción que señaló la agencia: **21 pedidos y 2.247,53 € en el panel, y cero conversiones en
Ads**. No se dejó de vender; nunca se llegó a medir.

Al arreglarlo aparecieron tres problemas más, esta vez dentro de Tag Manager, que están en la
Parte 2.

## Antes y después

| | 9 de septiembre | 17 de septiembre |
|---|---|---|
| Eventos de ecommerce que llegan a GA4 | ninguno | los 8 |
| Cargas de GA4 por página | 3 | 1 |
| `page_view` por visita | 2 | 1 |
| `view_item` por ficha | — | 1, con producto, precio, categoría y marca |
| `purchase` | inexistente | 1 por pedido, con referencia e importe |
| Consentimiento de cookies | se guardaba y no se aplicaba | Consent Mode v2 |

---

## Los cuatro datos que anclan todo

> **1. `item_id` es SIEMPRE el id del producto en base de datos**, en todos los eventos, incluido
> `purchase` (sale de `pedidoproducto.productoIdRef`). Si en un sitio se cambia por la referencia y
> en otro no, GA4 los cuenta como productos distintos y los informes salen partidos.

> **2. `purchase` se dispara UNA sola vez por pedido**, en `/checkout/confirmacion`, y sólo ahí. Es
> el evento del que salen los ingresos de GA4 y las conversiones de Ads: duplicarlo infla las
> ventas y descuadra la puja automática de las campañas.

> **3. Los dos contenedores de GTM tienen papeles separados y no hay que volver a mezclarlos.**
> `GTM-58NXXRTJ` es el de **Google Ads**; `GTM-5MJWJJC2` es el de **Analytics**. Detalle en la
> Parte 2.

> **4. Desde el 17 de septiembre sólo se mide a quien acepta cookies.** Las conversiones y
> sesiones medidas bajan respecto a las ventas reales del panel. No es una caída de ventas: es el
> efecto del consentimiento, y es lo correcto.

---

## Parte 1 — El emisor de eventos (la web)

Todo el ecommerce pasa por un único módulo: [`src/lib/analytics.ts`](../src/lib/analytics.ts).
Nada más empuja eventos de ecommerce al `dataLayer`.

| Evento GA4          | Cuándo se dispara                               | Dónde está el código |
|---------------------|-------------------------------------------------|----------------------|
| `view_item`         | Al abrir una ficha de producto                  | [`ProductDetail.tsx`](<../src/app/(public)/productos/[id]/ProductDetail.tsx>) |
| `view_item`         | Al abrir la vista rápida desde el listado       | [`ProductQuickViewModal.tsx`](../src/components/ProductQuickViewModal.tsx) |
| `add_to_cart`       | Al añadir al carrito, desde cualquier pantalla  | [`cartService.ts`](../src/lib/cartService.ts) |
| `remove_from_cart`  | Al eliminar una línea del carrito               | [`cartService.ts`](../src/lib/cartService.ts) |
| `view_cart`         | Al entrar en `/carrito` con productos           | [`carrito/page.tsx`](<../src/app/(public)/carrito/page.tsx>) |
| `begin_checkout`    | Al pulsar "Tramitar pedido"                     | [`carrito/page.tsx`](<../src/app/(public)/carrito/page.tsx>) |
| `add_shipping_info` | Al confirmar el método de envío                 | [`checkout/envio/page.tsx`](<../src/app/(public)/checkout/envio/page.tsx>) |
| `add_payment_info`  | Al pulsar "Pagar" con una forma de pago elegida | [`checkout/pago/page.tsx`](<../src/app/(public)/checkout/pago/page.tsx>) |
| `purchase`          | Al llegar a la confirmación del pedido          | [`checkout/confirmacion/page.tsx`](<../src/app/(public)/checkout/confirmacion/page.tsx>) |

**`add_to_cart` y `remove_from_cart` se miden dentro de `cartService`, no en los botones.** Toda
la tienda añade al carrito por esa función, así que queda cubierta cualquier pantalla presente o
futura. La única forma de romperlo es un botón que escriba en `localStorage` por su cuenta.

**Las cinco formas de pago acaban en `/checkout/confirmacion?pedido=<id>`** —tarjeta, PayPal,
Bizum, transferencia y contrareembolso—, así que el `purchase` se mide en un único sitio.

### El `purchase` lee el pedido del servidor

Cuando el cliente llega a la confirmación el carrito ya está vacío, y en tarjeta y PayPal además ha
salido de la web y ha vuelto. Por eso los datos salen de
[`/api/pedidos/[id]/analytics`](<../src/app/api/pedidos/[id]/analytics/route.ts>), que devuelve el
total definitivo (con envío, recargo y cupón) y las líneas. **Sólo eso**: ni nombre, ni email, ni
dirección. Es público por necesidad —lo llama el navegador de un invitado sin sesión—.

- **`transaction_id`** es el número de pedido (`PED-2026-0072`), el que ve el cliente y aparece en
  el panel. Decisión nuestra: la agencia no tenía preferencia.
- **No se envía `tax`.** GA4 calcula los ingresos con `value` y el IVA desglosado no hace falta.
- **`item_name` va sin la variante.** La línea del pedido guarda el nombre con la variante pegada
  (`Estor Zen - Tamaño : 140x180- Tirador : Derecha`, ver
  [`checkoutPricing.ts`](../src/lib/checkoutPricing.ts)). El endpoint quita ese sufijo exacto para
  que el nombre coincida con el del `view_item`; si no, el mismo producto saldría en los informes
  con un nombre por cada combinación vendida. La variante sigue llegando en `item_variant`.

### Por qué `purchase` no se duplica

La confirmación se puede recargar o volver a abrir desde el historial. Para que no cuente otra
venta, se deja una marca en `localStorage` con la clave `ga4_compra_<numeroPedido>`: un pedido se
mide una vez por navegador.

---

## Parte 2 — Tag Manager

### Lo que se encontró

La web cargaba sólo `GTM-58NXXRTJ`. Las etiquetas de ecommerce estaban montadas en `GTM-5MJWJJC2`,
que nunca se había instalado. Al instalarlo salieron tres problemas, que se resolvieron en este
orden:

1. **GA4 se cargaba tres veces**: con gtag.js desde el layout y con una etiqueta de configuración
   en *cada* contenedor. Se medía cada visita por duplicado.
2. **La etiqueta de ecommerce del contenedor viejo enviaba por su cuenta.** Llevaba el ID de
   medición metido a mano (`measurementIdOverride`), así que seguía enviando aunque se pausara su
   configuración. Resultado: cada `view_item` llegaba dos veces.
3. **El activador "Ecommerce Events" de `GTM-5MJWJJC2` no escuchaba tres eventos**: `view_cart`,
   `add_shipping_info` y `add_payment_info`. Ésa era la causa de lo que la agencia describía como
   "sólo llegan dos eventos": la web los emitía, pero nadie los recogía.

### Lo que se cambió

| Dónde | Cambio |
|---|---|
| Plesk, entorno de producción | `NEXT_PUBLIC_GA_VIA_GTM=true` → apaga el gtag.js del layout |
| `GTM-58NXXRTJ` | **pausada** "Etiqueta de Google Analytics G-B115FWF028" (versión 6) |
| `GTM-58NXXRTJ` | **pausada** "GoogleA4 - Ecommerce events" (versión 7) |
| `GTM-5MJWJJC2`, activador "Ecommerce Events" | añadidos `view_cart`, `add_shipping_info` y `add_payment_info` a la expresión regular |

La expresión del activador ha quedado así:

```
begin_checkout|add_to_cart|remove_from_cart|view_item|select_item|view_item_list|select_promotion|view_promotion|purchase|refund|view_cart|add_shipping_info|add_payment_info
```

`select_item`, `view_item_list`, `select_promotion` y `view_promotion` están en la lista pero la web
no los emite. No molestan. Si algún día interesa saber qué posiciones del listado convierten, el
trabajo sería en la web.

### Reparto final de los contenedores

| | `GTM-58NXXRTJ` | `GTM-5MJWJJC2` |
|---|---|---|
| Conversión de Google Ads (`compra sh - 26`) | **sí** | no |
| Etiqueta de Google `AW-323652071` (remarketing) | **sí** | no |
| Vinculación de conversiones | **sí** | no |
| Configuración de GA4 `G-B115FWF028` | pausada | **sí** |
| Eventos de ecommerce de GA4 | pausada | **sí** |
| Evento `Click_correo` | no | sí |

Los dos se cargan desde [`layout.tsx`](../src/app/layout.tsx) (`NEXT_PUBLIC_GTM_IDS`, que por defecto
vale los dos). **No retirar ninguno**: el viejo lleva todo lo de Google Ads.

### Permisos

En `GTM-5MJWJJC2`, `liberiogasss@gmail.com` sólo tiene permiso de **Lectura**. Tienen permiso de
publicación `desarrolloweb@sh.marketing`, `info@sh.marketing` e `info@elhogardetusuenos.com`, pero
la invitación de este último estaba **pendiente de aceptar**. En `GTM-58NXXRTJ` sí se puede
publicar con `liberiogasss@gmail.com`.

---

## Parte 3 — Consent Mode v2

Hasta el 17 de septiembre, el aviso de cookies guardaba la respuesta en `localStorage` y no hacía
nada más: las etiquetas se disparaban igual aceptara o rechazara el visitante.

**Tres piezas:**

- [`src/lib/consent.ts`](../src/lib/consent.ts) traduce la respuesta del banner a las señales de
  Google y se las comunica.
- [`src/app/layout.tsx`](../src/app/layout.tsx) declara el estado por defecto con un `<script>`
  normal, lo primero del `<body>`. No es un `<Script>` de Next a propósito: tiene que ejecutarse
  mientras el navegador lee el HTML, antes que Tag Manager. Si el consentimiento llega después de
  que arranquen las etiquetas, Google lo ignora.
- [`src/components/CookieConsent.tsx`](../src/components/CookieConsent.tsx) es el banner.

**Correspondencia entre el banner y las señales de Google:**

| Categoría del banner | Señales |
|---|---|
| Necesarias (siempre) | `security_storage` |
| Analíticas | `analytics_storage` |
| **Publicidad** (nueva) | `ad_storage`, `ad_user_data`, `ad_personalization` |
| Personalización | `functionality_storage`, `personalization_storage` |

**Decisiones tomadas:**

- **Se añadió la categoría Publicidad.** El banner no preguntaba por ella y la web hace remarketing
  de Google Ads, que el Consent Mode v2 exige consentir de forma explícita.
- **Se subió la versión del consentimiento a 2**, así que el aviso reapareció a todos. Quien aceptó
  con el banner anterior nunca fue preguntado por la publicidad y su "sí" no la cubre.
- **Todo denegado por defecto**, salvo `security_storage`. Quien ya eligió en una visita anterior
  tiene su decisión aplicada desde la primera línea, sin pasar por "denegado".
- **Modo avanzado**: las etiquetas cargan aunque se rechace, pero sin cookies y con señales anónimas
  que Google usa para modelar conversiones.
- **`ads_data_redaction`** activo mientras no haya consentimiento de publicidad, y
  **`url_passthrough`** para conservar el `gclid` de las campañas entre páginas sin cookies.

---

## Cómo comprobar que funciona

Todo se hace desde la consola del navegador (`F12` → Consola). Si sale el aviso de *"no pegues
código que no entiendas"*, hay que teclear a mano `allow pasting` (Chrome) o `permitir pegar`
(Firefox) y **borrar esa línea** antes de pegar.

### Qué eventos llegan a GA4

```js
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/g/collect'))
  .map(r => new URL(r.name).searchParams.get('en'))
```

En una ficha de producto recién cargada debe salir `["view_item", "page_view"]`, uno de cada.
Recorriendo el embudo **sin recargar** se van sumando los demás. Pueden aparecer también `scroll` o
`form_start`: son automáticos de GA4 y normales. Un `null` suele ser un envío que agrupa varios
eventos en el cuerpo de la petición.

### Si un evento falta: medir las tres cosas a la vez

```js
JSON.stringify({
  push: dataLayer.filter(c => c.event === 'purchase').length,   // lo emite la web
  marca: localStorage.getItem('ga4_compra_PED-2026-0072'),      // antiduplicado
  ga4: performance.getEntriesByType('resource')                 // lo envía GTM
        .filter(r => r.name.includes('/g/collect'))
        .map(r => new URL(r.name).searchParams.get('en')) })
```

Cambiando `'purchase'` por el evento que se busque. Si `push` es 1 y el evento no está en `ga4`, el
fallo está en Tag Manager, no en la web.

### El `purchase` sin crear un pedido

1. `https://elhogardetusuenos.com/api/pedidos/ID/analytics` con el **id interno** de un pedido (el
   número de la URL de su ficha en `/admin/pedidos/ID`, no el `PED-2026-...`). Sólo lee: no dispara
   nada. Comprueba importes, productos y nombres.
2. `https://elhogardetusuenos.com/checkout/confirmacion?pedido=ID` dispara el `purchase` de ese
   pedido. **Esperar 2-3 segundos** antes de comprobar, porque primero pide los datos al servidor.
   Ojo: esta pantalla vacía el carrito del navegador.

### El Consent Mode

En una ventana privada, antes de tocar el aviso:

```js
dataLayer.filter(e => e[0] === 'consent').map(e => [e[1], e[2].analytics_storage, e[2].ad_storage])
```

Debe salir `[["default", "denied", "denied"]]`. Tras pulsar *Aceptar todo* se añade
`["update", "granted", "granted"]`.

---

## Trampas: lo que NO hay que hacer

> **No filtrar las peticiones por el dominio `analytics.google.com`.** La ruta
> `/measurement/conversion` de ese mismo dominio es la señal a **Google Ads**, no a Analytics, y
> también lleva un parámetro `en=`. Da falsos duplicados. Filtrar siempre por `/g/collect`.

> **Tag Manager tiene 15 minutos de caché en el navegador.** Tras publicar un cambio, probar con
> "Desactivar caché" marcado en la pestaña Red y `Ctrl+Shift+R`, o esperar. Si no, parece que el
> cambio no ha funcionado.

> **En GTM, guardar no es publicar.** Hasta pulsar *Enviar → Publicar*, el cambio no sale a la web.

> **No reactivar las etiquetas pausadas de `GTM-58NXXRTJ`.** Vuelve el GA4 duplicado.

> **No disparar `purchase` en las páginas de retorno de las pasarelas** (`redsys/ok`,
> `paypal/retorno`): redirigen a la confirmación y cada venta contaría dos veces.

> **No meter la referencia de la variante en `item_variant`.** El campo `atributo` del carrito
> guarda la referencia sólo en unas pantallas; incluirlo daría dos nombres al mismo producto.

> **No añadir datos del cliente al endpoint de analytics.** Es público por necesidad.

> **No bajar `VERSION_CONSENTIMIENTO`** ni dar por aceptada la publicidad a quien no la aceptó.

---

## Pendiente con la agencia

1. **Avisarles** de que desde el 17 de septiembre las conversiones medidas bajan por el
   consentimiento, no por las ventas.
2. **¿Está `view_item` marcado como acción de conversión en Google Ads?** Llega a Ads con valor.
   Para remarketing dinámico es normal; como conversión falsearía las campañas.
3. **¿Se retira la etiqueta de conversión `compra sh - 26`** de `GTM-58NXXRTJ` cuando importen la
   conversión desde GA4? Si conviven, cada venta cuenta dos veces en Ads.

---

## Cosas que aparecieron por el camino

Ninguna es de medición.

- **RESUELTO el 17 de septiembre: los pedidos y sus datos personales eran públicos.** Respondían a
  cualquiera sin sesión el listado `GET /api/pedidos`, la ficha `GET /api/pedidos/[id]` (nombre,
  email, teléfono, dirección y NIF, con ids correlativos) y los mensajes
  `/api/pedidos/[id]/mensajes`, donde además se podía **publicar** un mensaje firmado como "admin".
  Ahora:

  | Ruta | Sin sesión | Cliente | Administrador |
  |---|---|---|---|
  | `GET /api/pedidos` | 401 | sólo sus pedidos, ignora `?clienteId=` | todos |
  | `GET /api/pedidos/[id]` | 401 | 401 | cualquier rol |
  | `GET /api/pedidos/[id]/mensajes` | 401 | 401 | cualquier rol |
  | `POST /api/pedidos/[id]/mensajes` | 403 | 403 | roles con `canEdit()` |

  Siguen abiertos a propósito `POST /api/pedidos` (crea los pedidos del checkout),
  `/api/pedidos/[id]/analytics` (sin datos personales) y `/api/pedidos/seguimiento` (exige
  referencia y email exactos). El token de cliente se verifica con `getClienteFromRequest` de
  [`src/lib/clienteAuth.ts`](../src/lib/clienteAuth.ts); el de admin viaja en la cookie httpOnly
  `admin_token`.

- **Por comprobar en Plesk: `SECRETO_JWT_ADMIN` tiene que estar definido.** Si falta,
  [`adminAuth.ts`](../src/lib/adminAuth.ts) usa un secreto de reserva escrito en el código, y con él
  cualquiera podría fabricarse un token de administrador y saltarse todas estas protecciones.
- **El tracker del agente de chat no graba nada.** `agente.elhogardetusuenos.com/tracker.js` envía
  con `sendBeacon`, que siempre lleva credenciales, y el servidor responde
  `Access-Control-Allow-Origin: *`, que el navegador no acepta en ese caso. Se arregla en ese
  proyecto (en Vercel, no en este repositorio) devolviendo
  `Access-Control-Allow-Origin: https://elhogardetusuenos.com`,
  `Access-Control-Allow-Credentials: true` y `Vary: Origin`. Es el origen de los errores rojos
  repetidos en la consola.
- **`npm run build` no funciona en Windows.** El prefijo `NODE_OPTIONS='...'` del script es
  sintaxis de shell POSIX y `cmd` no la entiende (en Plesk, que es Linux, sí funciona). Además
  `next build` a secas, que en Next 16 usa Turbopack, falla con la fuente Poppins. Para compilar en
  local: `npx next build --webpack`.
