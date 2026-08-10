# Plan de mejora técnica, SEO y CRO — elhogardetusuenos.com

**Stack:** Next.js (App Router asumido — ajustar si es Pages Router)
**Fuentes:** Auditoría Técnica SEO (28/07/2026, 29 páginas rastreadas), Informe CRO & UX de la agencia, e inspección directa de la home.

Este documento está pensado para trabajarlo con Claude Code dentro del repo. Cada bloque incluye qué revisar y qué debería quedar hecho.

---

## Cómo usar este documento

Trabaja de arriba abajo. Los bloques están ordenados por impacto real, no por facilidad. El bloque 1 es el que más importa: mientras no esté resuelto, el resto rinde poco.

Antes de tocar nada, crea una rama:

```bash
git checkout -b seo/mejoras-tecnicas
```

---

## 1. BLOQUEANTE — Los productos no se están renderizando

**Síntoma:** al cargar la home sin ejecutar JavaScript, aparece "No hay productos para mostrar". La página `/productos` tiene 48 palabras según la auditoría, lo que sugiere lo mismo.

**Por qué importa:** si el catálogo se pinta solo en el cliente, Google puede no verlo. Da igual todo el contenido que escribamos: si el rastreador no ve productos, la tienda no compite.

**Qué revisar:**

- Cómo se cargan los productos en la home y en `/productos`. Si es un `useEffect` + `fetch` en un componente cliente, hay que moverlo a Server Component o a `getStaticProps`/`getServerSideProps` según el router.
- Si hay `"use client"` en la cabecera del componente que lista productos, es la pista principal.
- Comprobar si la llamada a la API falla en servidor (variables de entorno, URL relativa vs absoluta, CORS).

**Cómo verificar que está arreglado:**

```bash
curl -s https://www.elhogardetusuenos.com/ | grep -i "no hay productos"
```

Si no devuelve nada y en su lugar aparecen nombres de producto en el HTML, está resuelto. También sirve desactivar JavaScript en el navegador y recargar.

---

## 2. Títulos duplicados en todo el sitio

**Síntoma:** en la auditoría, prácticamente todas las URLs comparten el mismo título: `El Hogar de tus Sueños | Decoración y Estores Online`. La home, `/productos` y las 10 páginas de `/auth` tienen exactamente el mismo. Además, las páginas CMS repiten el nombre de marca dos veces: `Contacto con nosotros | El Hogar de tus Sueños | El Hogar de tus Sueños`.

**Por qué importa:** el título es la señal más fuerte que tiene Google sobre de qué va cada página. Si todas dicen lo mismo, ninguna destaca para nada concreto.

**Qué hacer:**

- Definir un `template` en el layout raíz y un título propio por página:

```ts
// app/layout.tsx
export const metadata = {
  title: {
    default: 'El Hogar de tus Sueños | Estores y Decoración Online',
    template: '%s | El Hogar de tus Sueños',
  },
  description: '...',
}
```

- Revisar dónde se está concatenando el nombre de marca en las páginas CMS: se está añadiendo dos veces. Probablemente el título que viene de la base de datos ya incluye la marca y encima se le aplica el template.
- Cada categoría y cada ficha de producto debe generar su título con `generateMetadata`, usando la keyword principal de esa página.

**Referencia de keywords por página** (del calendario de contenidos de la agencia):

| Página | Keyword principal |
|---|---|
| `/categorias/1` | Estores digitales |
| `/categorias/2` | Estores lisos |
| `/categorias/3` | Textil cocina |
| `/categorias/4` | Ropa de cama / Fundas nórdicas |
| `/categorias/5` | Accesorios hogar |

Verificar que estos IDs corresponden realmente a esas categorías antes de aplicarlo.

---

## 3. Duplicación www / sin www

**Síntoma:** de las 29 páginas rastreadas, casi todas aparecen dos veces: `elhogardetusuenos.com/...` y `www.elhogardetusuenos.com/...`.

**Por qué importa:** Google ve dos sitios con el mismo contenido. La autoridad se reparte entre ambos en lugar de sumarse.

**Qué hacer:**

- Elegir una versión canónica (recomendación: sin `www`, es lo que usan los enlaces internos actuales) y forzar redirección 301 desde la otra.
- Lo más limpio es hacerlo en el proveedor de hosting o CDN. Si no es posible, en `next.config.js`:

```js
async redirects() {
  return [{
    source: '/:path*',
    has: [{ type: 'host', value: 'www.elhogardetusuenos.com' }],
    destination: 'https://elhogardetusuenos.com/:path*',
    permanent: true,
  }]
}
```

- Añadir `metadataBase` y canonical en el layout:

```ts
export const metadata = {
  metadataBase: new URL('https://elhogardetusuenos.com'),
  alternates: { canonical: './' },
}
```

**Verificar:**

```bash
curl -sI https://www.elhogardetusuenos.com/ | grep -i "location\|HTTP/"
```

Debe devolver 301 apuntando a la versión sin www.

---

## 4. Páginas de login indexables

**Síntoma:** 10 URLs del tipo `/auth?redirect=/account`, `/auth?redirect=/account/orders`, etc., todas con 71 palabras y el mismo título. Son la mitad de los avisos de "bajo número de palabras" de la auditoría.

**Qué hacer:**

- Añadir `noindex` en la ruta de autenticación:

```ts
// app/auth/page.tsx
export const metadata = { robots: { index: false, follow: false } }
```

- Y bloquear el patrón en `robots.ts`:

```ts
export default function robots() {
  return {
    rules: [{ userAgent: '*', disallow: ['/auth', '/account', '/carrito', '/checkout'] }],
    sitemap: 'https://elhogardetusuenos.com/sitemap.xml',
  }
}
```

Nota: `noindex` es lo que realmente saca la página del índice. El `disallow` de robots.txt solo evita el rastreo, así que conviene tener ambos, pero si una URL ya está indexada, primero hay que dejarla rastreable con `noindex` hasta que Google la procese.

---

## 5. Sitemap y robots

**Qué revisar:** si existe `/sitemap.xml` y si incluye categorías, productos, páginas CMS y entradas del blog.

Con App Router, un `app/sitemap.ts` dinámico que lea de la base de datos:

```ts
export default async function sitemap() {
  const productos = await getProductos()
  return [
    { url: 'https://elhogardetusuenos.com', priority: 1 },
    ...productos.map(p => ({
      url: `https://elhogardetusuenos.com/producto/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ]
}
```

Una vez generado, darlo de alta en Google Search Console.

---

## 6. Datos estructurados (JSON-LD)

Ninguno detectado. Es de lo que más rendimiento da por esfuerzo invertido, y además es lo que hace que ChatGPT, Perplexity y compañía entiendan bien la tienda.

**Por prioridad:**

1. **`Product`** en cada ficha: nombre, imagen, descripción, `offers` con precio, moneda y disponibilidad. Es lo que habilita que aparezca el precio en los resultados de Google.
2. **`FAQPage`** en `/cms/preguntas-frecuentes`. La página ya está redactada en formato pregunta-respuesta, solo falta el marcado. Habilita el desplegable de preguntas en los resultados.
3. **`LocalBusiness`** u `Organization` en el layout: nombre, teléfonos (961154226 y 684004525), email, localidad Ontinyent (Valencia), URL, logo, redes sociales.
4. **`BreadcrumbList`** en categorías y productos. Ya existe la miga de pan visual, falta el marcado.

Validar todo en el Rich Results Test de Google antes de dar por hecho el bloque.

---

## 7. Contenido de categorías

La auditoría no las marca por poco contenido, pero el informe CRO pregunta explícitamente por descripciones SEO en categorías y lo deja sin responder.

**Qué hacer:** cada página de categoría necesita un bloque de texto de 200-400 palabras, idealmente debajo del listado de productos para no empujar el catálogo hacia abajo. Es donde se compite por "estores digitales", "estores lisos", "ropa de cama".

Si el texto no está en la base de datos, hará falta un campo `descripcionSeo` en el modelo de categoría, o un archivo de contenido estático mapeado por slug.

---

## 8. Blog

Con 3 entradas publicadas, la infraestructura ya existe. El calendario de la agencia plantea 18 artículos organizados en clústeres temáticos.

**Qué revisar en el código:**

- Que cada entrada genere su propio `<title>` y meta descripción con `generateMetadata`.
- Que exista marcado `Article` o `BlogPosting` en JSON-LD.
- Que las entradas estén en el sitemap.
- Que haya enlaces desde los artículos hacia las categorías de producto correspondientes. Sin esos enlaces, el blog atrae visitas pero no las lleva al catálogo.
- Que las imágenes usen `next/image` con `alt` descriptivo que incluya la keyword.

---

## 9. Correcciones pequeñas

- **Errata en el email del pie:** aparece `info@elhogardetsuenos.com` (falta la "u"). El enlace `mailto:` no funciona en todo el sitio.
- **`/cms/quienes-somos`** daba 404 estando enlazada desde el pie. Ya resuelto, pero conviene comprobar que no queden más enlaces del footer apuntando a rutas inexistentes.
- Revisar que ningún enlace interno apunte a la versión `www` una vez montada la redirección.

---

## 10. Mejoras de conversión (del informe CRO de la agencia)

El informe marca como "Recomendado" (es decir, pendiente) los puntos siguientes. Ordenados por lo que yo priorizaría:

### Alta prioridad

- **Checkout como invitado.** Obligar a registrarse antes de comprar es de las fricciones que más venta cuestan en una primera compra. Revisar el flujo de `/checkout` y permitir finalizar solo con email y datos de envío, ofreciendo crear cuenta al final.
- **Checkout en 3 pasos o menos**, con indicador de progreso y resumen completo del pedido (productos, cantidades, envío, total, método de pago) antes de confirmar.
- **Métodos de pago.** Comprobar cuáles están activos y ampliar si falta alguno relevante (Bizum tiene mucha penetración en España). Mostrar los logos en la ficha y en el checkout.

### Media prioridad

- **Bloque de ventajas competitivas** en la home: envío, devoluciones, fabricación a medida, atención personalizada. Iconos con texto corto, debajo del banner principal.
- **Buscador en la cabecera** con autocompletado. Si el catálogo crece, pasa a ser crítico.
- **Teléfono y email clicables en la cabecera**, no solo en el pie. En móvil, un `tel:` visible convierte.
- **Cross-selling** en la ficha de producto: "productos relacionados" o "complementa con". Es una vía directa a subir el ticket medio, y encaja muy bien con vuestro catálogo (estor + cojines + funda nórdica del mismo estilo).

### Baja prioridad

- Lista de deseos o "guardar para más tarde".
- Botón de compartir por WhatsApp en la ficha de producto.

---

## 11. Rendimiento

No estaba en los informes, pero afecta tanto a posicionamiento como a conversión.

```bash
npx @lhci/cli autorun --collect.url=https://elhogardetusuenos.com
```

Puntos habituales en tiendas Next.js:

- Imágenes de producto sin `next/image` o sin `sizes` correcto.
- `priority` ausente en la imagen del banner principal (afecta al LCP).
- Fuentes cargadas sin `next/font`, que provoca salto visual al cargar.
- Bundle de cliente demasiado grande por componentes marcados como `"use client"` sin necesidad.

---

## Orden de trabajo sugerido

1. Bloque 1 (productos no renderizados) — sin esto, lo demás rinde poco
2. Bloques 3 y 4 (duplicados y noindex) — limpian el 70% de los avisos de la auditoría
3. Bloque 2 (títulos únicos)
4. Bloques 5 y 6 (sitemap y datos estructurados)
5. Bloque 9 (correcciones pequeñas, son 10 minutos)
6. Bloque 10, alta prioridad (checkout)
7. Bloques 7 y 8 (contenido de categorías y blog)

---

## Una nota sobre el informe de CRO

El informe de la agencia es una checklist genérica, no un análisis de comportamiento real. No contiene datos de tu tienda: ni tasa de conversión, ni embudo, ni puntos de abandono, ni mapas de calor, ni sesiones grabadas. Los puntos que señala son razonables y merece la pena aplicarlos, pero no sabemos cuáles están costando ventas de verdad.

Si quieres priorizar con criterio en lugar de por intuición, instala analítica de embudo (Google Analytics 4 con eventos de ecommerce, o algo como Microsoft Clarity, que es gratuito y graba sesiones). En un mes tendrás datos propios y sabrás si el problema está en el checkout, en la ficha de producto o simplemente en que no llega suficiente tráfico.

Un apunte adicional: el calendario de contenidos que te entregaron menciona en su objetivo final "facilitar la conversión de visitantes en alumnos". Es una frase de una plantilla de un cliente del sector formación que se les ha quedado sin adaptar. No afecta al trabajo, pero da una idea de cuánto de esos documentos es material reutilizado.
