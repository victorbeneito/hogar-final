# Canonicalización del dominio, URLs base y sitemap

**Fechas:** 10 y 11 de agosto de 2026
**Rama:** `develop` → `main` → despliegue en Plesk
**Commits:** `0d1f884`, `0f3adc3` (10 ago) · `dc71c77`, `efc2b56` (11 ago)
**Estado:** desplegado y verificado en producción

Documento complementario de [`plan-seo-cro-elhogardetusuenos.md`](../plan-seo-cro-elhogardetusuenos.md).
Aquel dice **qué hay que hacer**; este dice **qué se hizo, por qué y cómo comprobarlo**.

---

## Cómo usar este documento

Si vuelves a este tema dentro de unos meses, lee sólo dos apartados: **"El dato que ancla todo"** y **"Trampas: lo que NO hay que hacer"**. Con eso ya no rompes nada.

El resto es el detalle de cada arreglo, con el comando exacto para comprobar que sigue funcionando.

---

## El dato que ancla todo

> **El dominio canónico es `https://elhogardetusuenos.com`, SIN `www` y SIN barra final.**

Todo lo demás se deriva de ahí. Estado actual, verificado:

| Elemento | Valor |
|---|---|
| Dominio canónico | `https://elhogardetusuenos.com` (91.142.214.209, Plesk) |
| `www.elhogardetusuenos.com` | **301** conservando la ruta → dominio canónico |
| `APP_URL` y `NEXT_PUBLIC_BASE_URL` en Plesk | `https://elhogardetusuenos.com` |
| Fuente única en código | [`src/lib/urls.ts`](../src/lib/urls.ts) |
| Search Console | propiedad de Dominio `sc-domain:elhogardetusuenos.com` |
| Google Cloud OAuth | registradas **las dos** URIs (con y sin www) |

Hay un **tercer dominio**, `elhogardetussueños.com` (con ñ, punycode `xn--elhogardetussueos-txb.com`). Es nuestro, atrapa erratas, y vive en **otro hosting** (217.160.0.83, Apache — no el Plesk). No aparece en el código. Ver *Pendientes*.

---

## 1. El canonical apuntaba a la home desde todas las páginas

**Síntoma:** cada página del sitio le decía a Google "la versión buena de esto es la portada". Google respondía lo lógico: no indexar nada más que la portada.

**Causa:** en `src/app/layout.tsx` el canonical estaba escrito como una URL fija:

```ts
alternates: { canonical: "https://elhogardetusuenos.com" }
```

En el App Router, los metadatos del layout raíz **se heredan**. Cualquier página que no sobreescriba su propio canonical adopta ese valor literal. Sólo era correcto para una página de todo el sitio: la home.

**Qué se hizo:**

```ts
alternates: {
  // "./" lo resuelve Next contra la ruta actual, así cada página se
  // auto-referencia. Si se pone una URL fija aquí, TODA página que no
  // sobreescriba su canonical le dice a Google que es la home.
  canonical: "./",
}
```

Además se añadió canonical propio en `/blog`, `/blog/[slug]`, `/categorias/[id]` y las fichas de producto.

**Cómo verificar:**

```powershell
$h = Invoke-WebRequest 'https://elhogardetusuenos.com/blog' -UseBasicParsing
if ($h.Content -match '<link rel="canonical" href="([^"]+)"') { $Matches[1] }
```

Cada URL debe devolver **su propia dirección**, nunca la home.

---

## 2. Páginas privadas indexables

**Síntoma:** carrito, checkout, login, direcciones y seguimiento de pedido eran rastreables. Son páginas sin valor de búsqueda que además diluyen el presupuesto de rastreo.

**Qué se hizo:** como todas esas páginas son `"use client"` y no pueden exportar `metadata`, se creó un `layout.tsx` de paso en cada segmento:

```
src/app/(public)/{carrito,checkout,auth,direcciones,pedido}/layout.tsx
```

Cada uno exporta `robots: { index: false, follow: true }` y devuelve `<>{children}</>`.

**Detalle importante:** se **quitaron** de `public/robots.txt` las líneas `Disallow: /checkout/` y `Disallow: /carrito/`. Parece contradictorio, pero no lo es: **si bloqueas una ruta en robots.txt, el rastreador nunca entra y por tanto nunca lee la etiqueta `noindex`**. La URL puede seguir apareciendo en resultados sin descripción. Para desindexar hay que **permitir el rastreo** y dejar que lea el `noindex`.

Se mantiene el bloqueo de `/admin/`, `/api/` y `/account/`.

---

## 3. El campo "url (slug)" del blog no hacía nada

**Síntoma:** el slug que se escribía en el panel se ignoraba. Al crear, se regeneraba desde el título con un sufijo `Date.now()`. Al editar, sencillamente no se actualizaba nunca.

**Qué se hizo:** nuevo módulo [`src/lib/slugArticulo.ts`](../src/lib/slugArticulo.ts) con `slugify()` y `generarSlugUnico()`. Este último respeta el slug propuesto, cae al título si viene vacío, y ante una colisión añade `-2`, `-3`… en lugar de un timestamp, para que la URL siga siendo legible.

Las rutas POST y PUT lo usan, y ahora la PUT **sí** actualiza el slug. Se añadió `revalidatePath()` en crear, editar y borrar — incluida la ruta del slug **anterior** cuando cambia, para que no quede cacheada una URL huérfana.

---

## 4. El editor del blog mostraba una cosa y la web otra

Dos problemas encadenados:

**a) Faltaba el plugin de tipografía.** El artículo se renderiza con clases `prose` de `@tailwindcss/typography`, pero **el plugin nunca se había instalado**. Esas clases no generaban ni una línea de CSS, mientras que Preflight de Tailwind ya había quitado los estilos por defecto del navegador. Resultado: párrafos sin separación y títulos sin jerarquía. Se instaló y se registró en `tailwind.config.js`.

**b) Se añadió el botón Visual ⇄ HTML** en `BlogRichTextEditor.tsx`, que era la petición original. Permite editar el HTML a mano y lo reaplica al volver a Visual. Etiquetas admitidas sin escapar: `h2, h3, p, strong, em, ul, ol, li, a, img, br, blockquote`.

Se verificó que la API **no** sanea ni escapa el HTML al guardarlo, y que `/blog/[slug]` lo interpreta con `dangerouslySetInnerHTML`.

---

## 5. Unificación de las URLs base — `src/lib/urls.ts`

Este es el cambio con más superficie: **24 ficheros**.

**Síntoma:** había ~12 copias de esto repartidas por Redsys, PayPal, pedidos, registro y correos:

```ts
process.env.APP_URL || "https://www.elhogardetusuenos.com"
```

**Por qué era grave:** ese *fallback* apunta a `www`, que desde el 10 de agosto devuelve un **301**. La variable `APP_URL` alimenta `DS_MERCHANT_MERCHANTURL`, la notificación servidor-a-servidor de Redsys. **Ese POST no sigue redirecciones.** Si `APP_URL` faltara en un despliegue, el resultado sería: cobro realizado, pedido sin confirmar, y **ni un solo error visible en ninguna parte**.

**Qué se hizo:** un único módulo con tres exportaciones.

```ts
// src/lib/urls.ts
export const CANONICAL_BASE_URL = "https://elhogardetusuenos.com";
export function getBaseUrl(): string   // APP_URL || NEXT_PUBLIC_BASE_URL || fallback
export function buildUrl(path): string // URL absoluta a partir de una ruta
```

Cuándo usar cada una:

| Función | Para qué |
|---|---|
| `CANONICAL_BASE_URL` | SEO y metadatos: sitemap, `metadataBase`, canonicals, `og:image`. Siempre el dominio público, **aunque estés en local**. |
| `getBaseUrl()` | Valor efectivo en ejecución. Normaliza quitando barras finales. |
| `buildUrl(path)` | Atajo para URLs absolutas. |

**El orden `APP_URL` antes que `NEXT_PUBLIC_BASE_URL` es deliberado:** `APP_URL` se lee al arrancar, así un cambio en las variables de Plesk surte efecto **reiniciando**. `NEXT_PUBLIC_BASE_URL` se incrusta en tiempo de *build*, de modo que si mandara ella un cambio exigiría **redesplegar entero**. En el navegador `APP_URL` no existe y cae sola en la pública, que es justo lo deseable.

Además del patrón original, el barrido destapó más casos de la misma familia:

- **4 rutas de PayPal** con `|| "http://localhost:3000"`. Si faltara la variable en producción, PayPal recibiría URLs de retorno apuntando a localhost.
- **7 usos en el login de Google** con `${process.env.NEXT_PUBLIC_BASE_URL}` y **sin ningún fallback**: habrían generado redirecciones literales a `undefined/auth?error=…`.
- **9 dominios escritos a mano** en sitemap, layout, fichas y categorías.

**Cómo verificar (sin gastar un céntimo):**

```powershell
$g = Invoke-RestMethod 'https://elhogardetusuenos.com/api/auth/google'
([System.Web.HttpUtility]::ParseQueryString(([System.Uri]$g.url).Query))['redirect_uri']
```

Debe devolver `https://elhogardetusuenos.com/api/auth/google/callback`. Esa URL la construye **la misma función `getBaseUrl()`** que alimenta la notificación de Redsys, con las mismas variables y en el servidor real: si ahí sale bien, en Redsys también.

---

## 6. Dos bugs colaterales encontrados al unificar

### 6.1 Las URLs enviadas a Revi estaban rotas

`src/lib/reviService.ts` usaba `process.env.NEXT_PUBLIC_APP_URL` — una variable **que no está definida en ningún `.env`** del proyecto. A la plataforma de reseñas le llegaba, por cada producto, la cadena literal:

```
undefined/productos/123
```

Corregido con `buildUrl()`. El mismo nombre de variable inexistente aparecía en el panel (`/admin/personalizar/modulos/revi`), en el ejemplo de `curl` que se muestra en pantalla.

### 6.2 Dominio muerto en los datos de facturación

`src/lib/invoiceSettings.ts` traía por defecto:

```ts
email: "info@elhogardetussuenos.com",   // ← doble "s"
web:   "www.elhogardetussuenos.com",
```

Ese dominio **no existe**: sin registro A y **sin MX**. La web impresa en la factura no cargaría, y cualquier correo que un cliente enviara a esa dirección se perdería sin rebotar.

**Matiz importante:** son *valores por defecto*. La configuración guardada en base de datos ya tenía el correo bueno, así que **no se perdió ningún mensaje de ningún cliente**. El riesgo era latente: habría aflorado en un despliegue limpio o si se resetease la configuración. Editable en `/admin/facturas/configuracion`.

El dominio correcto es `elhogardetusuenos.com` (una sola "s"), que es el que usa todo el resto del código y el que tiene MX en `mail.elhogardetusuenos.com`.

---

## 7. El sitemap no tenía ni una sola categoría

**Síntoma:** `sitemap.xml` publicaba 695 URLs: 693 productos, la home y `/productos`. **Cero categorías, cero blog, cero páginas legales.**

**Causa — y es la más instructiva de todo el documento:**

```ts
const categorias = await prisma.categoria.findMany({
  where: { activa: true },
  select: { id: true, updatedAt: true },   // ← updatedAt NO existe en el modelo
}).catch(() => []);                        // ← y el catch se lo traga en silencio
```

El modelo `categoria` **no tiene campo `updatedAt`**. Prisma lanzaba un error de validación en cada generación del sitemap, el `.catch(() => [])` lo convertía en una lista vacía, y el sitemap se publicaba **sin fallar y sin categorías**. Sin log, sin aviso, sin nada. Llevaba así quién sabe cuánto tiempo.

**Qué se hizo** en [`src/app/sitemap.ts`](../src/app/sitemap.ts):

1. Quitado el `updatedAt` inexistente.
2. Sustituido el `.catch` mudo por un helper `seguro()` que sigue tolerando el fallo — mejor un sitemap incompleto que un 500 — pero **deja el motivo escrito en el log del servidor**.
3. Añadidos los artículos del blog (`activo: true`), que nunca habían estado.
4. Añadidas las 8 páginas CMS legales, leyendo su interruptor `active` de la fila `configuracion` con clave `cms_paginas`.
5. Añadidas `/blog` y `/medidas-personalizadas`.
6. **Sólo entran las categorías que tienen al menos un producto activo.** Hay 22 activas pero varias están vacías: publicar páginas sin contenido perjudica más de lo que suma.

**Resultado en producción:**

| | Antes | Después |
|---|---:|---:|
| Productos + listado | 694 | 694 |
| Categorías | **0** | **20** |
| Páginas CMS legales | **0** | **8** |
| Blog (índice + artículos) | **0** | **5** |
| Home | 1 | 1 |
| Medidas personalizadas | 0 | 1 |
| **Total** | **695** | **729** |

**Cómo verificar:**

```powershell
$s = Invoke-WebRequest 'https://elhogardetusuenos.com/sitemap.xml' -UseBasicParsing
$locs = [regex]::Matches($s.Content,'<loc>([^<]+)</loc>') | % { $_.Groups[1].Value }
"Total: $($locs.Count) | con www: $(([regex]::Matches($s.Content,'<loc>https://www\.')).Count)"
$locs | % { $p=([System.Uri]$_).AbsolutePath.Trim('/'); if($p -eq ''){'(home)'}else{($p -split '/')[0]} } |
  Group-Object | Sort-Object Count -Descending | Format-Table Count,Name -Auto
```

Se comprobaron una a una las **34 URLs nuevas**: todas HTTP 200. Un sitemap que apunta a páginas muertas es peor que no tenerlas.

---

## Trampas: lo que NO hay que hacer

Estas cinco cosas son las que romperían algo de verdad. Léelas antes de tocar el dominio o las variables.

### 1. Nunca actives una redirección de dominio antes de cambiar las variables

El orden correcto, y no es negociable:

```
Google Cloud Console (URIs OAuth)
  → variables APP_URL / NEXT_PUBLIC_BASE_URL
    → build + despliegue
      → probar un pago real de Redsys
        → y SÓLO entonces activar el 301
```

Si activas el 301 primero, `DS_MERCHANT_MERCHANTURL` apunta a una URL que redirige, Redsys no sigue redirecciones, y te quedan cobros hechos con pedidos sin confirmar.

### 2. `NEXT_PUBLIC_BASE_URL` no se lee al arrancar

Se **incrusta en el build**. Cambiarla en Plesk y reiniciar Node no hace nada: hay que redesplegar para que se ejecute `npm run build`. `APP_URL` sí se lee al arrancar.

### 3. `.env.local` debe seguir apuntando a localhost

Es la configuración de la máquina de desarrollo, está en `.gitignore` y nunca llega a Plesk. Si le pones el dominio de producción, las pruebas locales mandarían la notificación de Redsys **a la tienda real** y PayPal devolvería a producción a mitad de un checkout de prueba.

> **Cada sitio con su URL: Plesk → dominio real. Tu máquina → localhost.**

Nota: el `.env` local (sin `.local`) aún conserva un `APP_URL` con `www`. Es inofensivo porque `.env.local` lo pisa y ninguno de los dos se despliega, pero conviene limpiarlo.

### 4. Bloquear en robots.txt no desindexa

Es al revés: impide que el rastreador lea el `noindex`. Para sacar una página del índice hay que **permitir** el rastreo. Ver apartado 2.

### 5. Cuidado con los `.catch(() => [])` mudos

El fallo del sitemap estuvo escondido justo ahí. Si una consulta puede fallar, que al menos lo escriba en el log.

---

## Estado del plan SEO

Referido a los bloques de [`plan-seo-cro-elhogardetusuenos.md`](../plan-seo-cro-elhogardetusuenos.md):

| Bloque | Estado |
|---|---|
| 3 — Duplicación www / sin www | ✅ **Cerrado.** 301 activo, canonicals correctos, propiedad de Dominio en Search Console |
| 4 — Páginas de login indexables | ✅ **Cerrado.** `noindex` en los 5 segmentos privados |
| 5 — Sitemap y robots | ✅ **Cerrado.** 729 URLs con categorías, CMS y blog. Ya dado de alta y en estado "Correcto" |
| 8 — Blog | 🟡 **Parcial.** `generateMetadata` propio y entradas en el sitemap, hechos. Falta JSON-LD `BlogPosting` y enlaces internos hacia categorías |
| 2 — Títulos duplicados | 🟡 **Parcial.** La plantilla del layout raíz existe. Queda el `<title>` doble de los artículos (ver Pendientes) |
| 9 — Correcciones pequeñas | 🟡 La errata del email del pie está resuelta (`info@elhogardetusuenos.com`). El repaso de enlaces internos a `www` se hizo en este trabajo |
| 1, 6, 7, 10, 11 | ⬜ Sin tocar |

---

## Pendientes

Ordenados por lo que yo priorizaría.

1. **JSON-LD (bloque 6 del plan).** Es lo que más rinde por esfuerzo y no se ha tocado nada. `Product` en fichas, `FAQPage` en preguntas frecuentes, `Organization` en el layout, `BreadcrumbList`.

2. **`<title>` duplicado en los artículos.** La página añade `| El blog de tu Hogar` y la plantilla del layout raíz añade `| El Hogar de tus Sueños`. Salen 88 caracteres y Google lo corta. Arreglo de un minuto.

3. **Dominio con ñ.** `elhogardetussueños.com` hace hoy un **302** (temporal) a `http://www.elhogardetusuenos.com`: al host no canónico, por http, encadenando un segundo salto y perdiendo la ruta. Debería ser un **301 directo** a `https://elhogardetusuenos.com` conservando la ruta. Se arregla en el panel del otro hosting (217.160.0.83), no en este código.

4. **Campo *Web* de las facturas.** Dice `www.elhogardetusuenos.com`. Funciona porque redirige, pero es la versión que hemos abandonado. Cosmético.

5. **34 `<p></p>` vacíos** en el primer artículo, metidos a mano para compensar el CSS de `prose` que faltaba. Ya no hacen falta.

6. **Conversión de Markdown a HTML.** El contenido de los artículos llega en `.md`, lo que explica el problema original de "las negritas no se aplican". Merece una vía de conversión en el editor.

7. **Sitemaps legacy en Search Console.** Quedan dos de PrestaShop dando error (`/es/sitemap.xml` y uno de 2018). Retirarlos es cosmético.

---

## Search Console: qué mirar y qué ignorar

**Lo primero: esperar.** Se cambiaron el canonical, el 301 y el sitemap en 24 horas. Google tarda **semanas** en digerir eso. El riesgo real no es que no funcione: es leer un número normal como una catástrofe y deshacer algo que estaba bien.

Un solo informe importa: **Indexación → Páginas**, en `sc-domain:elhogardetusuenos.com`.

**Lo que parece malo y no lo es:**

- **~12.205 páginas no indexadas.** Son las URLs viejas de PrestaShop (`/es/…`) que ahora redirigen. Bajarán muy despacio, durante meses. No hay nada que hacer.
- **La propiedad vieja `https://elhogardetusuenos.com/es/` se irá a cero.** No es una caída de tráfico: ese espacio de URLs ya no existe. **No compares las dos propiedades.**

**El termómetro — dos métricas y su dirección correcta:**

| Métrica | Hacia dónde debe ir |
|---|---|
| "Duplicada: el usuario no ha indicado ninguna versión canónica" | **A cero.** Era el fallo del canonical |
| "Página alternativa con etiqueta canónica adecuada" | **Debe subir, y eso es bueno.** Significa que Google encontró la versión `www`, leyó cuál es la buena y obedeció |

**Qué no hacer:** pedir indexación en masa. La cuota diaria es pequeña y gastarla en cientos de URLs no acelera nada. Se solicitó para la home el 10 de agosto; los 4 artículos del blog son el otro caso justificado, por ser contenido nuevo y sin enlaces entrantes. Nada más.

---

## Referencia rápida de ficheros

| Fichero | Papel |
|---|---|
| [`src/lib/urls.ts`](../src/lib/urls.ts) | **Fuente única del dominio.** No escribirlo a mano en ningún otro sitio |
| [`src/lib/slugArticulo.ts`](../src/lib/slugArticulo.ts) | Slugs únicos y legibles de artículos |
| [`src/app/layout.tsx`](../src/app/layout.tsx) | `metadataBase`, plantilla de títulos, `canonical: "./"` |
| [`src/app/sitemap.ts`](../src/app/sitemap.ts) | Sitemap dinámico con el helper `seguro()` |
| [`public/robots.txt`](../public/robots.txt) | Bloquea sólo `/admin/`, `/api/`, `/account/` |
| `src/app/(public)/{carrito,checkout,auth,direcciones,pedido}/layout.tsx` | Portadores de `noindex` |
| [`src/lib/invoiceSettings.ts`](../src/lib/invoiceSettings.ts) | Datos del vendedor en facturas (los reales están en BD) |
| [`src/lib/reviService.ts`](../src/lib/reviService.ts) | Sincronización con Revi |
