# SEO — qué queda por hacer, paso a paso

**Fecha:** 11 de agosto de 2026
**Estado del código analizado:** rama `develop`, commit `efc2b56`
**Verificado contra producción** (`https://elhogardetusuenos.com`) el mismo día, con `User-Agent: Googlebot`.

Continuación de [`plan-seo-cro-elhogardetusuenos.md`](plan-seo-cro-elhogardetusuenos.md) y
[`2026-08-canonicalizacion-urls-y-sitemap.md`](2026-08-canonicalizacion-urls-y-sitemap.md).

Aquel plan se escribió a partir de la auditoría de la agencia. Este parte de **lo que hay hoy en el
repo y lo que devuelve hoy el servidor**, así que corrige algunas cosas que el plan daba por
pendientes y que ya están hechas, y confirma una que sigue rota.

---

## Resumen en tres frases

1. La parte técnica de indexación (canonicals, 301, sitemap, `noindex`) **está resuelta y verificada**.
2. **Google sigue sin ver ni un solo producto en la home ni en `/productos`.** Es el bloque 1 del plan
   original, sigue abierto, y mientras siga así el resto rinde la mitad.
3. Faltan cuatro datos estructurados (`Organization`, `FAQPage`, `BlogPosting`, migas en ficha) y tres
   títulos con la marca escrita dos veces. Todo eso son horas, no días.

---

## Lo que YA está hecho (no tocar)

Comprobado hoy contra el servidor real, no contra la documentación:

| Cosa | Comprobación | Resultado |
|---|---|---|
| Canonical propio por página | `/productos`, `/categorias/1`, `/blog`, `/blog/[slug]` | ✅ cada una se auto-referencia |
| 301 de `www` → sin `www` | ver doc de canonicalización | ✅ |
| Sitemap | `sitemap.xml` | ✅ **729 URLs** (productos, 20 categorías, 8 CMS, blog) |
| `robots.txt` | no bloquea lo que lleva `noindex` | ✅ correcto |
| `noindex` en zona privada | carrito, checkout, auth, direcciones, pedido | ✅ |
| `generateMetadata` propio | producto, categoría, blog, CMS | ✅ |
| JSON-LD `Product` | ficha de producto | ✅ presente |
| JSON-LD `CollectionPage` + `BreadcrumbList` | páginas de categoría | ✅ presente |
| Texto SEO de categorías | 6 categorías muestreadas | ✅ 745–1029 palabras cada una |
| Campos SEO en BD | `categoria.metaTitulo`, `metaDescripcion`, `textoSeo` | ✅ existen y están rellenos |
| GA4 + Google Tag Manager | `layout.tsx` | ✅ |
| Verificación Search Console | `layout.tsx` | ✅ |

> **Corrección respecto al plan original:** el bloque 7 ("contenido de categorías") y buena parte del
> bloque 6 (JSON-LD) ya estaban hechos. El plan de la agencia no los recogía porque se escribió antes.

---

## PASO 1 — 🔴 Home y `/productos` no se renderizan en el servidor

Esto es lo único de la lista que es realmente grave. Todo lo demás puede esperar.

### Qué pasa exactamente

```bash
curl -s -A "Googlebot" https://elhogardetusuenos.com/ | grep -i "no hay productos"
# → No hay productos para mostrar.
```

En el HTML que recibe Google **hay cero enlaces a fichas de producto**. Ni en la home ni en
`/productos`. Lo mismo devuelve `/productos`: 0 enlaces, 30 KB de HTML sin catálogo.

### Por qué

[`src/app/(public)/page.tsx:1`](../src/app/(public)/page.tsx#L1) y
[`src/app/(public)/productos/page.tsx:1`](../src/app/(public)/productos/page.tsx#L1) empiezan
las dos con `"use client"` y cargan los datos con `useEffect` + `axios`:

```ts
useEffect(() => {
  const { data } = await clienteAxios.get("/productos?destacado=true&limit=12...");
  setProductosDestacados(data.productos);
}, []);
```

El servidor devuelve el esqueleto vacío. `ProductGrid` recibe una lista vacía y pinta su mensaje de
"No hay productos para mostrar" ([`ProductGrid.tsx:27`](../src/components/ProductGrid.tsx#L27)).
Los productos aparecen sólo después, en el navegador.

### Por qué importa de verdad

- La home es la página con más autoridad del sitio y **no reparte ni un enlace al catálogo**. Las 693
  fichas del sitemap están huérfanas de enlaces internos desde la portada.
- Google renderiza JavaScript, pero en una segunda pasada, con retraso y sin garantías. Bing y los
  buscadores de IA (ChatGPT, Perplexity) mucho menos.
- El primer texto que lee un rastreador en tu portada es literalmente *"No hay productos para mostrar"*.

### Cómo arreglarlo sin romper nada

El patrón seguro es el que ya usáis en `/categorias/[id]`: **la página es un Server Component que
consulta la BD y pasa los datos ya cargados a un componente cliente**. No se reescribe la interfaz,
sólo se cambia de dónde llegan los datos iniciales.

**Home:**

1. Renombrar el contenido actual de `src/app/(public)/page.tsx` a `src/app/(public)/HomeClient.tsx`
   (mantiene su `"use client"` y todo su estado: búsqueda, filtrado, etc.).
2. Que reciba `categoriasIniciales` y `destacadosIniciales` por props, y que los use como valor
   inicial del `useState` en lugar de `[]`.
3. Nuevo `page.tsx` como Server Component: consulta las categorías y los 12 destacados con Prisma
   (la misma consulta que hace hoy la API) y renderiza `<HomeClient ... />`.
4. **Dejar los `useEffect` puestos.** Si la consulta de servidor fallara, la carga en cliente sigue
   funcionando como red de seguridad. Sólo hay que hacer que no pisen datos ya presentes.

**`/productos`:** exactamente lo mismo, con `ProductosClient.tsx`. Ojo: esta página lee
`useSearchParams` para los filtros, así que el Server Component tiene que leer `searchParams` y
hacer la consulta con esos mismos filtros y paginación.

### Cómo verificar

```bash
curl -s -A "Googlebot" https://elhogardetusuenos.com/ | grep -c 'href="/productos/'
```

Hoy devuelve `0`. Después debe devolver al menos 12. Y `grep -i "no hay productos"` no debe
devolver nada.

### Riesgo

Medio — es el cambio más grande de la lista. Mitigaciones:

- Hacerlo en rama aparte (`seo/ssr-home-productos`) y probar en local antes de fusionar a `develop`.
- No tocar `ProductGrid`, `ProductCard` ni `BannerPrincipal`: sólo cambia quién les pasa los datos.
- Conservar los `useEffect` como respaldo, como se ha dicho.
- Probar expresamente: búsqueda en la home, filtros de `/productos`, paginación y modo oscuro.

---

## PASO 2 — `/productos` no tiene título ni descripción propios

Ahora mismo hereda los de la portada:

```
<title>El Hogar de tus Sueños | Decoración y Estores Online</title>
<meta name="description" content="Tienda online especializada en decoración del hogar...">
```

La página que debería competir por *"comprar estores online"* está diciéndole a Google exactamente lo
mismo que la portada. Es el bloque 2 del plan original, y es lo último que queda de él.

**Por qué no se puede arreglar de la forma obvia:** al ser `"use client"`, `page.tsx` no puede exportar
`metadata`.

**Solución en 10 minutos y riesgo cero** — el mismo truco que ya usáis para el `noindex` del carrito.
Crear `src/app/(public)/productos/layout.tsx`:

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Todos los productos: estores, ropa de cama y textil hogar",
  description:
    "Catálogo completo de El Hogar de tus Sueños: estores digitales y lisos, "
    + "fundas nórdicas, textil de cocina y accesorios. Envío a toda España.",
};

export default function ProductosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

Sin `| El Hogar de tus Sueños` al final: la plantilla del layout raíz ya lo añade sola.

> Se puede hacer **hoy mismo**, sin esperar al paso 1. Son dos ficheros que no se estorban.

---

## PASO 3 — La marca aparece dos veces en algunos títulos

Verificado en producción:

| Página | Título actual | Largo |
|---|---|---|
| `/cms/preguntas-frecuentes` | `Preguntas frecuentes \| El Hogar de tus Sueños \| El Hogar de tus Sueños` | 68 |
| `/blog/estores-digitales-guia...` | `Estores digitales: guía... \| El blog de tu Hogar \| El Hogar de tus Sueños` | **94** |

Google corta alrededor de los 60 caracteres. En el artículo del blog, lo que se ve en los resultados
se queda en la marca repetida y el titular real desaparece.

**Causa:** la plantilla `template: "%s | El Hogar de tus Sueños"` del layout raíz se aplica **encima**
de títulos que ya traían la marca.

**Dos arreglos, ambos de un minuto:**

1. En [`src/lib/cmsConfig.ts:45`](../src/lib/cmsConfig.ts#L45) y siguientes, quitar
   `| El Hogar de tus Sueños` de los ocho `defaultMetaTitle`.
   ⚠️ **Ojo:** son *valores por defecto*. Si en `/admin/cms` ya se guardó un metaTitle con la marca,
   hay que corregirlo también ahí — la BD manda sobre el fichero.
2. En [`src/app/(public)/blog/[slug]/page.tsx:26`](../src/app/(public)/blog/[slug]/page.tsx#L26),
   cambiar `title: \`${title} | El blog de tu Hogar\`` por simplemente `title`.

**Verificar:**

```bash
curl -s https://elhogardetusuenos.com/cms/preguntas-frecuentes | grep -o '<title>[^<]*</title>'
```

La marca debe aparecer **una sola vez**.

---

## PASO 4 — Los cuatro datos estructurados que faltan

Los dos que más rinden ya están (`Product` y `CollectionPage`). Faltan estos, por orden de utilidad:

### 4.1 `Organization` en el layout raíz — *la home no tiene ni un JSON-LD*

```bash
curl -s https://elhogardetusuenos.com/ | grep -c 'application/ld+json'   # → 0
```

Es lo que le dice a Google (y a ChatGPT y Perplexity) **quién sois**: nombre, logo, teléfonos,
localidad, redes. Va en `src/app/layout.tsx`, dentro del `<body>`:

```ts
const organizacion = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "El Hogar de tus Sueños",
  url: CANONICAL_BASE_URL,
  logo: `${CANONICAL_BASE_URL}/img/logo.png`,   // comprobar la ruta real
  email: "info@elhogardetusuenos.com",
  telephone: ["+34961154226", "+34684004525"],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ontinyent",
    addressRegion: "Valencia",
    addressCountry: "ES",
  },
  sameAs: [ /* URLs reales de Facebook / Instagram */ ],
};
```

El módulo SEO del panel ya tiene el interruptor `jsonLdOrganizacion` con valor por defecto `true`
([`moduleRegistry.ts:113`](../src/lib/moduleRegistry.ts#L113)), **pero no hay código detrás**. Está
declarado y no implementado.

### 4.2 `FAQPage` en `/cms/preguntas-frecuentes`

La página ya está redactada en formato pregunta-respuesta en `cmsConfig.ts`. Con el marcado, Google
puede mostrar el desplegable de preguntas directamente en los resultados. Es de las cosas que más
espacio ganan en pantalla por menos trabajo.

### 4.3 `BlogPosting` en los artículos

`headline`, `datePublished`, `dateModified`, `author`, `image`, `publisher`. Los campos ya existen
todos en el modelo `articulo`.

### 4.4 `BreadcrumbList` en la ficha de producto

Las categorías ya lo llevan ([`categorias/[id]/page.tsx:186`](../src/app/(public)/categorias/[id]/page.tsx#L186));
las fichas no. Se copia el mismo bloque añadiendo la categoría del producto, que ya está disponible en
`productoAdaptado.categoria`.

**Verificar los cuatro** en el Rich Results Test de Google (`search.google.com/test/rich-results`)
antes de dar el paso por cerrado.

**Riesgo:** bajo. Son etiquetas `<script>` que no afectan a lo que ve el usuario.

---

## PASO 5 — El `availability` del producto siempre dice "en stock"

En [`productos/[id]/page.tsx:202`](../src/app/(public)/productos/[id]/page.tsx#L202):

```ts
"availability": "https://schema.org/InStock",   // ← fijo, siempre
```

Se envía `InStock` incluso para productos con `stock: 0` y sin `disponiblePedidos`. Si Google detecta
que el dato estructurado no coincide con la página, puede retirar los resultados enriquecidos de toda
la tienda — se pierde el precio en los resultados, que es justo lo que más se nota.

**Arreglo:**

```ts
"availability": (productoRaw.stock ?? 0) > 0
  ? "https://schema.org/InStock"
  : productoRaw.disponiblePedidos
    ? "https://schema.org/BackOrder"
    : "https://schema.org/OutOfStock",
```

Añadir también `priceValidUntil` y `itemCondition: "https://schema.org/NewCondition"`, que Google
recomienda.

---

## PASO 6 — El blog no enlaza al catálogo

Los cuatro artículos están indexados y con metadatos correctos, pero **no llevan enlaces a las
categorías de producto**. Un artículo que atrae visitas y no las conduce al catálogo es tráfico
que se va.

No es tarea de programación, es de redacción: en `/admin/blog`, editar cada artículo y meter 2-3
enlaces de texto natural hacia `/categorias/N`. El artículo de estores digitales debería enlazar a
la categoría de estores digitales, y así.

De paso, en ese mismo repaso:

- Quitar los **34 `<p></p>` vacíos** del primer artículo (se metieron a mano cuando faltaba el CSS de
  `prose`; ya no hacen falta).
- Comprobar que todas las imágenes tienen `alt` descriptivo con la palabra clave.

---

## PASO 7 — Imágenes de producto sin `next/image`

[`ProductCard.tsx:100`](../src/components/ProductCard.tsx#L100) usa `<img>` directo. Afecta al LCP,
que es factor de posicionamiento y de conversión: son las imágenes que más pesan y más se repiten
en el sitio.

Cambiar a `next/image` con `sizes` correcto y `priority` sólo en la primera fila. **Hacerlo después
del paso 1**, no a la vez: si algo se ve mal, conviene saber cuál de los dos cambios lo causó.

---

## PASO 8 — Flecos que ya estaban anotados

Del apartado *Pendientes* del documento de canonicalización, siguen abiertos:

- **Dominio con ñ.** `elhogardetussueños.com` hace un **302** a `http://www.elhogardetusuenos.com`:
  temporal, por http, al host no canónico y perdiendo la ruta. Debería ser **301 directo** a
  `https://elhogardetusuenos.com` conservando la ruta. Se arregla en el panel del otro hosting
  (217.160.0.83), **no en este código**.
- **Sitemaps legacy en Search Console.** Quedan dos de PrestaShop dando error. Retirarlos. Cosmético.
- **Campo *Web* de las facturas.** Dice `www.…`, la versión abandonada. Editable en
  `/admin/facturas/configuracion`. Cosmético.

---

## Orden recomendado y esfuerzo

| # | Tarea | Impacto | Esfuerzo | Riesgo |
|---|---|---|---|---|
| 2 | Título y descripción de `/productos` | Alto | 10 min | Ninguno |
| 3 | Marca duplicada en títulos | Medio | 15 min | Ninguno |
| 1 | **SSR de home y `/productos`** | **Muy alto** | 3-5 h | Medio |
| 4 | JSON-LD que falta (×4) | Alto | 2-3 h | Bajo |
| 5 | `availability` real del producto | Medio-alto | 15 min | Ninguno |
| 6 | Enlaces internos del blog | Medio | 1 h (redacción) | Ninguno |
| 7 | `next/image` en `ProductCard` | Medio | 1-2 h | Bajo |
| 8 | Flecos (dominio ñ, sitemaps) | Bajo | 30 min | Ninguno |

Los pasos 2, 3 y 5 son de riesgo cero y se pueden hacer y desplegar en una sola sesión corta. Merece
la pena sacarlos primero aunque el paso 1 sea más importante: así el despliegue grande va solo y, si
algo falla, se sabe exactamente qué lo causó.

---

## Lo que NO hay que tocar

Cinco cosas que ya funcionan y que romperlas cuesta meses de recuperación:

1. **`alternates: { canonical: "./" }`** en `layout.tsx`. Poner ahí una URL fija hace que **todas** las
   páginas le digan a Google que son la portada. Ya pasó una vez.
2. **`src/lib/urls.ts`.** El dominio se escribe ahí y en ningún otro sitio. Ver el documento de
   canonicalización.
3. **`robots.txt`.** No añadir `Disallow` para carrito ni checkout: llevan `noindex`, y bloquearlos
   impide que el rastreador entre a leerlo, con lo que nunca se desindexan.
4. **El orden al tocar el dominio.** Variables → build → probar pago Redsys → *y sólo entonces* el 301.
   `DS_MERCHANT_MERCHANTURL` no sigue redirecciones.
5. **`.env.local` apunta a localhost.** Si se le pone el dominio real, las pruebas locales mandan la
   notificación de Redsys a la tienda de producción.

---

## Qué mirar en Search Console mientras tanto

**Paciencia.** Los cambios de agosto (canonical, 301, sitemap) tardan **semanas** en digerirse. El
riesgo real no es que no funcionen: es leer un número normal como una catástrofe y deshacer algo que
estaba bien.

Dos métricas, en `sc-domain:elhogardetusuenos.com` → Indexación → Páginas:

| Métrica | Dirección correcta |
|---|---|
| "Duplicada: el usuario no ha indicado ninguna versión canónica" | **A cero** |
| "Página alternativa con etiqueta canónica adecuada" | **Debe subir** — significa que Google obedece |

Y una señal nueva que vigilar cuando esté hecho el paso 1: en **Rendimiento**, filtrar por páginas que
contengan `/productos/`. Hoy las fichas reciben visitas casi sólo desde el sitemap. Si el paso 1
funciona, esas impresiones deben empezar a crecer, porque por fin habrá enlaces internos desde la
portada.
