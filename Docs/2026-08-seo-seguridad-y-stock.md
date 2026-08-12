# SEO, seguridad de la API y control de existencias

**Fecha:** 11 de agosto de 2026
**Rama:** `develop` → `main` → despliegue en Plesk
**Estado:** desplegado y verificado en producción

Tercer documento de la serie. Los anteriores:

- [`plan-seo-cro-elhogardetusuenos.md`](plan-seo-cro-elhogardetusuenos.md) — el plan de la agencia: **qué** hay que hacer.
- [`2026-08-canonicalizacion-urls-y-sitemap.md`](2026-08-canonicalizacion-urls-y-sitemap.md) — canonical, dominio y sitemap.
- [`2026-08-plan-seo-siguiente-fase.md`](2026-08-plan-seo-siguiente-fase.md) — auditoría contra producción y plan por pasos.

Éste recoge **qué se cambió, dónde y por qué**, incluidos dos fallos que no eran de SEO y aparecieron al verificar.

---

## Cómo usar este documento

Si vuelves dentro de unos meses, lee sólo dos apartados: **"Los tres datos que anclan todo"** y
**"Trampas: lo que NO hay que hacer"**. Con eso no rompes nada.

El resto es el detalle de cada cambio, con el comando exacto para comprobar que sigue funcionando.

---

## Los tres datos que anclan todo

> **1. El flag `producto.tieneVariantes` NO es fiable.** Está a `false` en los 477 productos activos
> que sí tienen filas en `variante`. Nunca decidas nada con él: usa `variante.length > 0`.

> **2. Los estores digitales no descuentan stock.** Son la categoría 1, se fabrican bajo pedido y su
> stock es decorativo. La regla vive en [`src/lib/stock.ts`](../src/lib/stock.ts).

> **3. Las rutas públicas `/api/productos*` son de SÓLO LECTURA.** Toda escritura va por
> `/api/admin/*`, que valida el rol con `canEdit()`.

---

## Parte 1 — SEO

### 1.1 `/productos` no tenía título ni descripción propios

**Síntoma:** heredaba los de la portada, así que la página que debe competir por "comprar estores
online" le decía a Google exactamente lo mismo que la home.

**Por qué no se arreglaba de la forma obvia:** `productos/page.tsx` es `"use client"` (usa
`useSearchParams` para los filtros) y un componente cliente **no puede exportar `metadata`**.

**Qué se hizo:** un layout de paso, [`src/app/(public)/productos/layout.tsx`](../src/app/(public)/productos/layout.tsx),
que es el portador de los metadatos. Es el mismo truco que ya se usaba para el `noindex` de carrito y
checkout.

Las fichas `/productos/[id]` cuelgan de ese layout, pero tienen su propio `generateMetadata`, que
prevalece. No se ven afectadas.

### 1.2 La marca aparecía dos veces en los títulos

**Síntoma**, medido en producción:

| Página | Antes | Después |
|---|---:|---:|
| `/cms/preguntas-frecuentes` | 68 car. | **45** |
| `/blog/[slug]` | 94 car. | **72** |

Google corta hacia los 60 caracteres, así que en el artículo del blog lo que se perdía era el titular
real, no la marca.

**Causa:** `template: "%s | El Hogar de tus Sueños"` en el layout raíz se aplicaba **encima** de
títulos que ya traían la marca.

**Qué se hizo:** nuevo módulo [`src/lib/seo.ts`](../src/lib/seo.ts) con `SITE_NAME` y
`quitarMarcaDelTitulo()`, aplicado en el `generateMetadata` de las páginas CMS y del blog.

**El detalle que importa:** se aplica **en `generateMetadata`, no sólo en `cmsConfig.ts`**. En
[`src/lib/cmsConfig.ts:169`](../src/lib/cmsConfig.ts#L169) la resolución es
`current.metaTitle ?? definition.defaultMetaTitle`: **el valor guardado en base de datos pisa al del
fichero**. Limpiar sólo los `defaultMetaTitle` no habría arreglado producción, donde el metaTitle ya
estaba guardado. Así funciona venga de donde venga, incluido lo que se escriba mañana en `/admin/cms`.

Los 8 `defaultMetaTitle` se limpiaron igualmente, para que una instalación nueva nazca bien.

La función tolera mayúsculas distintas y los separadores `|`, `-`, `–`, `—`. Si al quitar la marca no
queda nada, devuelve el título original: mejor una marca repetida que un `<title>` vacío.

### 1.3 El JSON-LD de producto declaraba `InStock` siempre

**Riesgo:** si Google detecta que el dato estructurado no coincide con la página, puede retirar los
resultados enriquecidos de **toda la tienda**, y con ellos el precio en los resultados.

**Qué se hizo** en [`src/app/(public)/productos/[id]/page.tsx`](../src/app/(public)/productos/[id]/page.tsx):
tres estados reales (`InStock` / `BackOrder` / `OutOfStock`), más `priceValidUntil` (un año rodante,
nunca caduca) e `itemCondition`.

**Ojo con cómo se calcula.** El primer intento usaba `tieneVariantes` para decidir si mirar el stock
del producto o sumar el de las variantes. Estaba mal: ese flag está sin mantener (dato ancla nº 1), así
que en la práctica nunca sumaba, y el día que alguien lo arreglase 477 fichas se habrían declarado
agotadas de golpe.

La versión buena mira **las dos fuentes** y basta con que una tenga existencias:

```ts
const stockVariantes = productoRaw.variante.reduce((s, v) => s + (v.stock ?? 0), 0);
const hayExistencias = (productoRaw.stock ?? 0) > 0 || stockVariantes > 0;
```

El sentido del error es deliberado: marcar agotado algo que sí se vende cuesta ventas; lo contrario
sólo cuesta un aviso en Search Console.

**Verificar** (PowerShell):

```powershell
$u = 'https://elhogardetusuenos.com/productos/<slug>'
[regex]::Matches((Invoke-WebRequest $u -UseBasicParsing).Content, '"availability":"[^"]+"') | % { $_.Value }
```

---

### 1.4 Google no veía ni un solo producto (el bloqueante)

**Síntoma**, medido con `User-Agent: Googlebot`:

```
curl -s -A "Googlebot" https://elhogardetusuenos.com/ | grep -i "no hay productos"
→ No hay productos para mostrar.
```

Cero enlaces `href="/productos/"` en la portada. Cero en `/productos`. Las 693 fichas del sitemap
estaban huérfanas de enlaces internos desde la página con más autoridad del sitio.

**Causa:** la portada y el listado eran `"use client"` y cargaban los datos con `useEffect` + fetch.
El servidor devolvía el esqueleto vacío y `ProductGrid` pintaba su mensaje de "No hay productos".

**Qué se hizo:** ambas páginas pasaron a renderizarse en servidor.

**a) Módulo compartido [`src/lib/productosLista.ts`](../src/lib/productosLista.ts).** Es la pieza
central. La consulta del listado (filtros, búsqueda, orden, paginación, búsqueda ampliada y
normalización de precios con IVA) vivía dentro de `GET /api/productos`. Al necesitarla también en el
servidor había dos opciones: duplicarla —y que las dos copias se separasen con el tiempo— o extraerla.
Se extrajo. `GET /api/productos` es ahora un envoltorio de 20 líneas sobre `buscarProductos()`.

> Se verificó que la respuesta de la API sigue siendo **idéntica** a la de producción, clave por clave,
> tanto del objeto de respuesta como de cada producto.

**b) La portada** ([`src/app/(public)/page.tsx`](../src/app/(public)/page.tsx)) es ahora un Server
Component **sin componente cliente intermedio**. No hizo falta porque sus siete hijos (`Banner`,
`BannerPrincipal`, `ProductGrid`, `ReviWidget`, `BannersSection`, `SeoText`, `SubscribeForm`) ya son
`"use client"` por su cuenta, y **el estado de búsqueda que había en la portada estaba muerto**:
`setProductosFiltrados` y `setBusquedaActiva` no se llamaban desde ninguna parte, así que
`ProductGrid` siempre mostraba los destacados.

Las consultas van envueltas en un helper `seguro()`: si una falla, la portada se pinta sin esa
sección en lugar de devolver un 500, y el motivo queda en el log. Mismo criterio que el `seguro()` de
[`sitemap.ts`](../src/app/sitemap.ts).

**c) El listado** ([`src/app/(public)/productos/page.tsx`](../src/app/(public)/productos/page.tsx))
también es Server Component. La conversión salió barata porque la página ya era casi toda
presentacional: la paginación y el orden se navegaban con `<Link>` y con `router.push`, no con estado
propio. Lo único que hubo que sustituir fue el botón del estado vacío, ahora un `<Link>` con el mismo
aspecto.

**Detalle que costó un segundo intento:** el `limit=12` por defecto se inyectaba en los mismos
parámetros con los que se construyen los enlaces de paginación, así que cada enlace lo arrastraba y
salían dos URLs para el mismo contenido (`?page=2` y `?page=2&limit=12`). Ahora hay dos objetos: los
parámetros de la URL (para los enlaces, intactos) y una copia con el `limit` (para la consulta).

**Verificar** (con el servidor de producción, no el de desarrollo):

```powershell
$h = (Invoke-WebRequest 'https://elhogardetusuenos.com/' -UseBasicParsing).Content
"'no hay productos': " + ([regex]::Matches($h,'(?i)no hay productos')).Count      # debe ser 0
"fichas enlazadas  : " + ([regex]::Matches($h,'href="/productos/[^"]+"')).Count   # debe ser > 0
```

### 1.5 Datos estructurados (JSON-LD)

Antes sólo había `Product` en las fichas y `CollectionPage` + `BreadcrumbList` en las categorías.
La portada no tenía **ninguna** etiqueta. Se añadieron cuatro.

| Marcado | Dónde | Para qué |
|---|---|---|
| `Organization` | layout raíz (todas las páginas) | Quién está detrás de la tienda. Lo leen Google y los asistentes de IA |
| `FAQPage` | `/cms/preguntas-frecuentes` | Habilita el desplegable de preguntas en los resultados |
| `BlogPosting` + `BreadcrumbList` | `/blog/[slug]` | Autoría y fechas del artículo |
| `BreadcrumbList` | ficha de producto | La ruta Inicio › Productos › Categoría › Producto |

**`Organization` no lleva la dirección postal, y es deliberado.** La que hay en la configuración de
facturas es el domicilio fiscal del titular. Imprimirlo en una factura que va a un cliente concreto es
una cosa; publicarlo en datos estructurados que lee todo internet es otra distinta. Si algún día hay
una dirección comercial pública, se añade un bloque `address` en `organizationJsonLd()` y el tipo puede
pasar a `LocalBusiness`.

Tampoco lleva `sameAs` (perfiles en redes): no hay ninguna URL de redes en el código ni en la
configuración, e inventarlas sería peor que omitirlas. Cuando se tengan, se añaden a
`REDES_SOCIALES` en [`src/lib/seo.ts`](../src/lib/seo.ts) y aparecen solas.

`BlogPosting` referencia el `publisher` por `@id` (`…/#organizacion`) en lugar de repetir los datos de
la tienda, así que si cambian se cambian en un sitio.

**El `FAQPage` analiza el contenido, que es editable desde el panel.** Por eso el analizador es
defensivo y tiene dos estrategias:

- **A — encabezados:** `<h3>pregunta</h3>` y lo que sigue hasta el próximo `<h3>`. Es el formato actual
  de la página en producción.
- **B — negritas:** párrafos cuyo texto va entero en negrita son la pregunta, y los siguientes la
  respuesta. Es el formato que traía el contenido importado de PrestaShop
  (`<p><span><b>¿Pregunta?</b></span></p>`), que aún vive en algunas bases de datos.

Sólo se aceptan encabezados que contengan `?` o `¿`: la página mezcla preguntas reales con títulos
como "PRODUCTOS", y marcar eso como pregunta sería marcado falso. Si no se encuentra ningún par, **no
se emite marcado**: un `FAQPage` vacío o que no se corresponde con lo que ve el usuario es peor que no
tener ninguno.

Verificado contra el contenido real: 12 preguntas con el formato de producción, 14 con el formato
antiguo, y `null` en los siete casos límite probados (vacío, sin encabezados, encabezado sin
interrogante, encabezado sin respuesta, negrita suelta en mitad de una frase…).

### 1.6 Cada visita al blog marcaba el artículo como recién modificado

**Síntoma:** `blog/[slug]/page.tsx` incrementaba el contador de visitas **y de paso escribía
`updatedAt: new Date()`**. Ese campo alimenta el `lastModified` de los artículos en
[`sitemap.ts`](../src/app/sitemap.ts), así que el sitemap le decía a Google "esto acaba de cambiar"
cada vez que alguien —incluido el propio Googlebot— abría el artículo.

**Por qué importa:** cuando esa señal es sistemáticamente falsa, Google deja de fiarse de ella y la
ignora para todo el sitio. Se pierde la capacidad de avisar de un cambio real.

**Qué se hizo:** el contador ya sólo incrementa `vistas`. El modelo `articulo` **no** lleva
`@updatedAt`, así que Prisma no lo toca por su cuenta: ahora sólo cambia al editar el artículo, que es
lo que el campo significa. Comprobado con tres visitas seguidas: `vistas` pasó de 1 a 4 y `updatedAt`
no se movió.

### 1.7 Catorce fichas devolvían 404 y estaban en el sitemap

Apareció al verificar el marcado de una ficha cualquiera.

**Síntoma:** `https://elhogardetusuenos.com/productos/7000` → **404**. Y `7000` sale del propio
sitemap y de los enlaces del listado.

**Causa:** la ficha decidía si el segmento de la URL era un id o un slug por su aspecto:

```ts
const byId = Number.isInteger(Number(id)) && Number(id) > 0;
where: byId ? { id: idNumero } : { slug: id }
```

Hay productos cuyo **slug es un número** (`"7000"`, `"6950"`, `"8000"`…). Para ellos se buscaba el
producto con id 7000, que no existe, y salía 404. En producción son **14 fichas**: 14 URLs muertas
anunciadas a Google en el sitemap y 14 productos que ningún cliente podía comprar.

**Qué se hizo:** se busca **siempre por slug primero** —que es la forma canónica de las URLs— y sólo se
cae al id si no hay coincidencia. `slug` es `@unique`, así que es una sola consulta en el caso normal.
Es determinista incluso si algún día un slug numérico coincidiera con el id de otro producto
(hoy no ocurre en ninguno: comprobado, 0 casos).

El mismo patrón estaba en
[`/api/productos/[id]/relacionados`](../src/app/api/productos/[id]/relacionados/route.ts) y se corrigió
igual. `quick-view` **no** está afectado: recibe siempre el id numérico desde `ProductCard`.

### 1.8 Imágenes de producto: `next/image` (paso 7)

**El diagnóstico inicial era incompleto.** El plan decía "las imágenes no usan `next/image`", pero al
medir apareció algo más grave: el catálogo viene de tres migraciones distintas y tiene **tres formatos
de imagen conviviendo**, cada uno con su problema. Medido sobre los 693 productos publicados:

| Formato | Nº | Tamaño real | Problema |
|---|---:|---|---|
| `/img/p/…-home_default.jpg` (relativa) | 490 | 250×250, 17 KB | se mostraba **ampliada** en un hueco de 288 px |
| `http://elhogardetusuenos.com/…` | 101 | 1000×1000, **195 KB** | 301 http→https en **cada** imagen |
| `https://lh3.googleusercontent.com/d/…` | 99 | ~175 KB | Google Drive, **dominio no declarado** |
| sin imagen | 2 | — | van al *placeholder* |

**El dominio no declarado era un riesgo de rotura, no un detalle.** `next/image` **lanza un error y no
renderiza** si la imagen viene de un host que no esté en `remotePatterns`. Activarlo sin añadir
`lh3.googleusercontent.com` habría roto 99 fichas. Por eso, antes de tocar el componente, se
enumeraron todos los dominios del catálogo entero.

**Qué se hizo:**

1. **`lh3.googleusercontent.com` añadido a `remotePatterns`** en [`next.config.mjs`](../next.config.mjs).
2. **Nuevo módulo [`src/lib/imagenes.ts`](../src/lib/imagenes.ts)** con `urlImagenProducto()`, que
   normaliza los tres formatos:
   - `http://` → `https://` **sólo en el dominio propio**. Ahorra el 301 y satisface `remotePatterns`,
     que sólo admite https. No se toca el `http` de otros hosts: si alguno no sirviera por https,
     romperíamos su imagen sin ganar nada.
   - `-home_default.jpg` → `-large_default.jpg` **sólo en rutas `/img/p/`**. PrestaShop genera seis
     tamaños y la tienda usaba el de 250 px estirado a 288. Con el de 800 px, `next/image` reescala
     **hacia abajo**, que es nítido, en lugar de estirar.
   - Vacío o nulo → `/img/no-image.jpg`.
3. **`<img>` → `next/image`** en [`ProductCard.tsx`](../src/components/ProductCard.tsx), con `fill`
   dentro de un contenedor posicionado que conserva las medidas y márgenes originales.
4. **`priority` en la primera fila**: nueva prop `prioridad`, activada en las 4 primeras tarjetas del
   catálogo y las 3 primeras de la portada. Ahí suele estar el LCP. Si se marcaran todas no se
   priorizaría ninguna y se descargaría el catálogo entero de golpe.
5. **`sizes` distinto por rejilla**: el catálogo es de 4 columnas y la portada de 3, así que hay dos
   constantes. Un `sizes` que miente hace que se sirva un tamaño equivocado: pasarse desperdicia
   bytes y quedarse corto se ve borroso.

> **Antes de dar por buena la subida a `large_default` se comprobaron las 488 imágenes de ese formato,
> una a una: 0 fallos.** Una muestra no bastaba, porque si faltara una sola versión grande se vería
> una imagen rota en la tarjeta.

**Ahorro medido** (ancho 384 px, el que sirve la tarjeta, con el optimizador real):

| Imagen | Antes | Después | |
|---|---:|---:|---|
| Miniatura PrestaShop | 17.276 B | **12.420 B** | −28 % **y además nítida**, porque sale del original de 800 px |
| Estor digital (1000×1000) | 194.701 B | **21.662 B** | **−89 %** |

En una página de listado con 12 tarjetas de las pesadas, eso baja de unos **2,3 MB a unos 260 KB**.

**Verificado** en un servidor de producción local: las 12 tarjetas emiten `srcSet` con varios anchos,
`sizes` correcto, la primera **sin** `loading="lazy"` (es prioritaria) y la última **con** él. El
normalizador se probó con los nueve casos posibles, incluidos los que **no** debe tocar
(`home_default` fuera de `/img/p/`, y `http://` de otro dominio).

**Aviso de despliegue:** la optimización la hace el servidor la primera vez que se pide cada tamaño, y
luego la cachea en `.next/cache/images`. Tras un despliegue limpio, las primeras visitas al catálogo
irán algo más lentas mientras se llena esa caché. Es normal y se pasa solo. Requiere `sharp`, que ya
está presente en `node_modules`.

### 1.9 Los banners de la portada pesaban más que todo el catálogo junto

Al medir la portada **después** de optimizar las tarjetas, seguía pesando 2,47 MB. El desglose señaló
al culpable: de los 1,65 MB de imágenes, sólo 309 KB eran las tarjetas ya optimizadas. **1,3 MB eran
los banners**, que seguían con `<img>` directo porque el paso 7 sólo tocó `ProductCard`.

`banner-cojines.jpg` son **2208×1920 px y 508 KB** para mostrarse en una columna de ~420 px. El logo
oscuro de la cabecera, 1215×469 y 40 KB para verse a 112 px de alto — y ése sale en **todas** las
páginas del sitio, no sólo en la portada.

**Qué se hizo:** `next/image` en [`BannerPrincipal.tsx`](../src/components/BannerPrincipal.tsx),
[`BannersSection.tsx`](../src/components/BannersSection.tsx) y [`Header.tsx`](../src/components/Header.tsx).

- Los dos banners de arriba y el logo llevan `priority`: están en la mitad superior y compiten por el
  LCP. Los de abajo **no**, para que carguen al acercarse. Marcarlos todos habría equivalido a no
  priorizar ninguno.
- Los de alto fijo (`h-[250px]`, `h-[300px]`) usan `fill` dentro de un contenedor posicionado: con
  `width`/`height` el navegador respetaría la proporción del fichero y no la caja que queremos.
- Los de alto automático llevan `width`/`height` con las medidas reales del fichero. No fijan el
  tamaño en pantalla —de eso siguen encargándose las clases— pero le dan la proporción al navegador
  por adelantado, así que reserva el hueco y la página no salta al cargar (eso es el CLS).
- Se reescribieron los `alt`, que decían "Banner Cojines" o "Logotipo Oscuro". Ahora describen el
  producto ("Cojines decorativos y fundas de cojín para salón"), que es lo que lee Google.

**Ahorro medido**, fichero a fichero:

| Fichero | Antes | Después | |
|---|---:|---:|---:|
| `banner-cojines.jpg` | 508.629 B | 39.598 B | −92 % |
| `banner-medidas.jpg` | 252.120 B | 10.288 B | −96 % |
| `banner-estores-lisos.jpg` | 228.798 B | 21.774 B | −90 % |
| `banner-estores-digitales.jpg` | 93.315 B | 40.326 B | −57 % |
| `banner-fundas-sofa.jpg` | 76.486 B | 25.028 B | −67 % |
| `banner-ropa-cama.jpg` | 72.773 B | 24.490 B | −66 % |
| `banner-envios.jpg` | 50.876 B | 6.890 B | −86 % |
| `logo-hogar-dark.jpg` | 40.824 B | 188 B | −100 % |
| `logo-hogar-claro.jpg` | 7.041 B | 2.596 B | −63 % |
| **TOTAL** | **1.330.862 B** | **171.178 B** | **−87 %** |

Tras esto, la portada no tiene **ninguna** imagen sin optimizar.

---

## Parte 2 — Seguridad: tres endpoints de escritura sin autenticación

Aparecieron al investigar el flag `tieneVariantes`. No son un problema de SEO.

**Qué había:** `PUT` y `DELETE` en `/api/productos/[id]`, y `POST` en `/api/productos`. **Ninguno
comprobaba credenciales**, y [`middleware.ts`](../middleware.ts) tampoco protege `/api/` — sólo hace
redirecciones de PrestaShop. `Docs/API_PROTECTION.md` documenta `/api/admin/productos/[id]` como
protegido, pero esta ruta paralela se quedó fuera del repaso.

**Por qué no llegaron a explotarse:** porque estaban rotos, no porque estuvieran protegidos.
Referenciaban relaciones de Prisma que ya no existen (`tx.productoCategoria`, `tx.productoImagen`, y en
el `findUnique` final `Marca`, `Categorias`, `Imagenes`, `Variantes` con mayúscula, cuando el esquema
las tiene en minúscula). El `PUT` iba dentro de `$transaction`, así que revertía; el `DELETE` fallaba en
la validación del `include` antes de tocar nada.

**Por qué era una mina y no una curiosidad:** el `PUT` contenía esto:

```ts
await tx.variante.deleteMany({ where: { productoId: id } });        // incondicional
...
if (body.tieneVariantes && body.variantes?.length) { /* recrear */ } // condicional
```

Borra las variantes siempre y las recrea sólo si el flag viene a `true` — un flag que está mal en 477
productos. El día que alguien corrigiera los nombres de los modelos, eso pasaba a ser un endpoint
abierto capaz de vaciar variantes o borrar productos.

**Qué se hizo:** eliminados los tres. También el `GET /api/productos/[id]`, que devolvía **500** siempre
por el mismo motivo (su `include` usa `Atributos`/`AtributoValor`); al no haber funcionado nunca, nada
podía depender de él.

| Endpoint | Acción |
|---|---|
| `PUT /api/productos/[id]` | eliminado |
| `DELETE /api/productos/[id]` | eliminado |
| `GET /api/productos/[id]` | eliminado (devolvía 500) |
| `POST /api/productos` | eliminado |
| `GET /api/productos` | **conservado** — lo usa el listado y el buscador |
| `/api/productos/[id]/quick-view` | **intacto** (fichero aparte) |
| `/api/productos/[id]/relacionados` | **intacto** (fichero aparte) |

Se dejó un comentario en cabecera de los ficheros supervivientes explicando por qué se fueron, para
que nadie los "recupere" del historial pensando que faltan.

### Y un cuarto: la configuración de facturas exponía el NIF y la dirección

`GET /api/facturas/configuracion` **no comprobaba credenciales** (el `POST` sí). Devolvía el bloque
`seller` completo, que en producción contiene el **NIF y la dirección postal del titular**. Cualquiera
podía leerlos con una petición sin autenticar; se comprobó desde fuera y respondía.

Corregido añadiendo `canEdit()` al `GET`. Sólo lo consume el panel
(`/admin/facturas/configuracion`), así que no rompe nada: la generación de facturas no pasa por esa
ruta, lee la configuración directamente de la base de datos en el servidor.

**Verificar:**

```powershell
# debe ser 404 (ya no existe)
try { Invoke-WebRequest 'https://elhogardetusuenos.com/api/productos/2' -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
# debe ser 200
(Invoke-WebRequest 'https://elhogardetusuenos.com/api/productos/2/quick-view' -UseBasicParsing).StatusCode
```

---

## Parte 3 — El stock no se descontaba nunca

**Síntoma:** ni un `decrement` en todo `src/`, ni una sola escritura de stock en `/api/pedidos/`.
Vender no reducía existencias.

En los digitales daba igual (se fabrican bajo pedido), pero en los **lisos** el stock depende del
proveedor y debe ser lo más real posible.

### Qué se hizo

El descuento va **dentro de la misma transacción que crea el pedido**, en
[`src/app/api/pedidos/route.ts`](../src/app/api/pedidos/route.ts): o se crean pedido y descuento, o no
ocurre ninguna de las dos cosas.

Tres decisiones, cada una con su motivo:

**a) Se descuenta al CREAR el pedido, no al confirmar el pago.** Así dos clientes no compran la misma
unidad mientras uno está en la pasarela. La contrapartida es que un pago abandonado retiene stock hasta
que se cancele el pedido. No hace falta protección contra reintentos de la pasarela: éstos confirman un
pedido ya existente, no vuelven a pasar por aquí.

**b) `updateMany`, nunca `update`.** Si una línea apunta a un producto o variante borrado, `update`
lanzaría `P2025` y tumbaría la transacción entera — es decir, **el cliente no podría comprar** por
culpa de un id obsoleto. `updateMany` no encuentra nada y sigue.

**c) Los digitales quedan fuera**, por categoría. Ver abajo.

### La regla de qué descuenta y qué no

Vive en [`src/lib/stock.ts`](../src/lib/stock.ts):

```ts
export const CATEGORIAS_SIN_CONTROL_DE_STOCK = [1];   // 1 = Estores Digitales
```

Comprobado contra la base de datos el 2026-08-11:

| | |
|---|---:|
| Productos activos | 486 |
| En categoría 1 (digitales, **no** descuentan) | 458 |
| Resto (lisos y textil hogar, **sí** descuentan) | 28 |
| Productos de subcategorías temáticas que NO están en la 1 | **0** |
| Productos a la vez en Digitales y Lisos | **0** |

Las subcategorías temáticas (Ciudades, Paisajes, Infantiles, Cocina, Zen, Varios,
Estampados-Fantasía, Juveniles) suman 457 productos y **todos** pertenecen también a la 1, así que
basta con esa categoría para cubrirlos.

**Es una lista de exclusión, no de inclusión, y es a propósito.** Si mañana se añade una categoría de
producto físico, descuenta sola sin que nadie tenga que darla de alta. El fallo por olvido queda
visible (un digital bajando de stock) en vez de silencioso (un producto físico sobrevendiéndose).

**Se descartó la alternativa del "suelo de 10 unidades"** porque también habría frenado a los lisos
justo cuando quedan pocas unidades, que es cuando el dato importa.

### Por qué no hace falta reponer stock al cancelar un pedido

Porque un CSV del proveedor reescribe a diario el stock de los lisos. Se verificó el circuito completo:

```
Prestashop CSV
  → scripts/generar-stock-lisos-desde-prestashop.cjs   (sólo genera un CSV, no toca la BD)
    → importacion/stock_lisos_importacion.csv
      → /api/importaciones  →  variante.stock
```

Las columnas del CSV (`productoReferencia`, `referencia`, `color`, `tamano`, `tirador`) son de
**variante**, y la importación escribe `variante.stock`
([`importaciones/route.ts:1118`](../src/app/api/importaciones/route.ts#L1118)) — **el mismo campo** que
toca el descuento. Cualquier desvío de una jornada se corrige solo al día siguiente.

### El stock puede quedar en negativo

Es intencionado. Un liso a 0 del que se venden 5 unidades queda en **-5**, porque
`disponiblePedidos` permite comprar sin existencias. `-5` significa "debes 5 unidades", que es más
información que un `0`, y de cara al cliente la ficha trata el negativo igual que el cero
(muestra "Sin stock — reponiendo existencias"). La sincronización diaria lo reajusta.

Si algún día se prefiere que nunca baje de 0, es un cambio de una línea en el bucle de descuento.

---

## Parte 4 — El panel mostraba la casilla de stock equivocada

[`TabPrecio.tsx`](../src/app/(admin)/admin/productos/[id]/tabs/TabPrecio.tsx) decidía con
`data.tieneVariantes`. Como el flag está a `false` en los 477 productos con variantes, al editarlos
salía la casilla "Cantidad disponible" del producto —que para ellos no se usa para nada— en vez del
aviso "el stock se gestiona en Combinaciones".

Ahora mira `(data.variantes?.length ?? 0) > 0`, que es el dato real.

---

## Trampas: lo que NO hay que hacer

Las anteriores siguen vigentes en
[`2026-08-canonicalizacion-urls-y-sitemap.md`](2026-08-canonicalizacion-urls-y-sitemap.md)
(canonical `"./"`, `urls.ts`, `robots.txt`, orden al tocar el dominio, `.env.local`).
Éstas son las nuevas:

### 1. No decidas nada con `producto.tieneVariantes`

Está a `false` en 477 productos que sí tienen variantes. Usa `variante.length > 0`. Si algún día
alguien "arregla" el flag en masa, hay que revisar antes todo lo que lo lea.

### 2. No añadas escrituras a `/api/productos*`

Esas rutas son públicas y sin autenticación por diseño de Next: cualquiera puede invocarlas. Toda
escritura va a `/api/admin/*` con `canEdit()`.

### 3. No pongas un `title` con la marca en `generateMetadata`

El layout raíz ya la añade con `template`. Si el título de origen puede traerla (metaTitle de BD,
texto del panel), pásalo por `quitarMarcaDelTitulo()`.

### 4. En el descuento de stock, `updateMany` y no `update`

Con `update`, un `productoIdRef` obsoleto lanza `P2025` y tumba la transacción: el cliente no puede
comprar. Ya está documentado arriba, pero es el tipo de cosa que alguien "limpia" sin saberlo.

### 5. Si reorganizas las categorías, revisa `src/lib/stock.ts`

La exclusión de los digitales es el id numérico `1`. Cambiar categorías sin mirar ese fichero haría
que 458 productos empezaran a descontar stock, o que los lisos dejaran de hacerlo.

### 6. No vuelvas a poner `"use client"` en la portada ni en `/productos`

Es exactamente lo que hacía que Google no viera ni un producto. Si una de esas páginas necesita
interactividad, se saca a un componente hijo con `"use client"` y la página sigue siendo servidor.

### 7. La consulta del listado se toca en un solo sitio

Filtros, orden, búsqueda y normalización de precios viven en
[`src/lib/productosLista.ts`](../src/lib/productosLista.ts). `GET /api/productos`, `/productos` y la
portada la comparten. Si se modifica una copia suelta, los tres caminos empiezan a dar resultados
distintos sin que nadie se entere.

### 8. Antes de añadir un origen de imágenes nuevo, decláralo en `next.config.mjs`

`next/image` **lanza un error y no renderiza** si el host no está en `remotePatterns`. Hoy están
declarados `elhogardetusuenos.com` (https), `cdn.shopworld.cloud` y `lh3.googleusercontent.com`. Si se
importa un lote de productos con imágenes de otro sitio, esas fichas dejan de verse.

### 9. `registrarBusqueda` sólo en la API

`buscarProductos()` acepta esa opción y por defecto va a `false`. Si se activara en el render de
servidor, cada recarga de `/productos` insertaría una fila en `busqueda_log` con un término que nadie
ha tecleado.

### 10. No vuelvas a pedir fuentes con `@import` en el CSS

Si hace falta otra tipografía, se añade con `next/font` en `src/app/layout.tsx`, **nunca** con un
`@import url('https://fonts.googleapis.com/…')` ni con un `<link>` a Google. Un `@import` encadena las
descargas en serie y bloquea el pintado: eran 1.760 ms. Y sin las métricas de reserva que calcula
`next/font`, la página vuelve a dar el salto al cambiar de fuente.

Si se usa un peso que no esté en la lista de `weight` del `layout.tsx`, el navegador lo simula
estirando las letras y se ve mal. Hay que añadirlo ahí.

### 10 bis. La reescritura de imágenes es una regla de PrestaShop, no una general

`rutaFisicaPrestashop()` en [`src/lib/imagenes.ts`](../src/lib/imagenes.ts) reparte las cifras del
identificador en carpetas (`4438` → `/img/p/4/4/3/8/`) porque así las guarda PrestaShop. Si algún día se
mueven las fotos a otro alojamiento o a un CDN, esa función deja de valer y hay que cambiarla **ahí**, no
en cada plantilla. Y si se importa un lote nuevo, conviene comprobar en qué formato llegan las URLs
antes de dar por hecho que están bien.

### 10 ter. No devuelvas `PaypalProvider` al layout raíz

Si algún día hace falta PayPal en una página nueva, **no** se vuelve a poner el provider arriba: se usa
`PaypalExpressButton` o `PaypalCheckout`, que ya lo traen. Ponerlo en el layout devolvería los 100 KiB a
todas las páginas. Y ojo: el checkout normal **no** usa el SDK, redirige por servidor — si alguien ve
que `/checkout/pago` no carga PayPal, es lo correcto, no un fallo.

### 10 quater. `priority` en `next/image`: como mucho una imagen por página

Es la trampa más fácil de repetir, y ya cayó una vez. `priority` no significa "esta imagen es
importante": significa "precárgala antes que nada". Si se marcan varias, **compiten entre sí** y el
resultado es peor que no marcar ninguna.

La regla: **`priority` sólo en el elemento LCP**, y con `fetchPriority="high"` puesto a mano —`priority`
por sí solo no lo añade. Antes de ponerlo en una imagen nueva, hay que mirar en PageSpeed cuál es el
elemento LCP de esa página; no darlo por supuesto.

Y ojo con el móvil: una rejilla `md:grid-cols-3` es de **una** columna en el teléfono, así que lo que
allí parece "la primera fila visible" está en realidad muy por debajo del pliegue.

### 11. No pongas `if (!mounted) return null` en un componente de layout

Es el atajo típico para evitar el desajuste de hidratación con next-themes, pero deja el componente
**fuera del HTML del servidor** y provoca un salto cuando aparece. Sólo hay que envolver así el trozo
concreto que depende de `theme` o de `localStorage`, y dejarle un hueco del tamaño final. Con Tailwind,
las clases `dark:` **no necesitan** ese guard: dependen de la clase del `<html>`, que next-themes fija
con un script inline antes del primer pintado.

---

## Parte 5 — Velocidad: la fuente y la barra de navegación

Medido en producción el 2026-08-12 con PageSpeed Insights, ya desplegado todo lo anterior y **con el
pop-up de vacaciones quitado** para no contaminar la medición.

### De dónde partíamos

| | Antes (11 ago) | Después de imágenes (12 ago) |
|---|---|---|
| Rendimiento móvil | 38 | **71** |
| Rendimiento escritorio | ~70 | **93** |
| LCP de laboratorio (móvil) | 18,8 s | **3,5 s** |
| Entrega de imágenes | 1.129 KiB | **35 KiB** |
| Tiempos de caché | 1.558 KiB | **115 KiB**, y ya todo de terceros |

Lo de la caché se arregló solo, y conviene entender por qué porque es contraintuitivo: los ficheros de
`public/` los sirve **Apache saltándose Next**, y salen sin ninguna cabecera `Cache-Control`. Al pasar
las imágenes por `next/image`, el navegador dejó de pedir `/img/p/…` y pasó a pedir `/_next/image?…`,
que sí lleva cabecera. **No se tocó la configuración de Apache.** Si algún día se vuelve a poner un
`<img>` suelto apuntando a `/img/…`, ese fichero volverá a servirse sin caché.

### 5.1 La fuente Poppins se pedía con un `@import` a Google

La primera línea de `src/app/globals.css` era:

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
```

Es la peor forma posible de cargar una fuente. Un `@import` dentro de un CSS encadena las descargas
**en serie**: el navegador baja `globals.css`, ahí descubre el `@import`, baja el CSS de Google, y sólo
entonces descubre el `.woff2` y lo baja — de dos dominios ajenos, con su DNS y su TLS cada uno. Nada se
pinta mientras tanto. PageSpeed lo medía como **1.760 ms de renderizado bloqueado**.

Y hacía un segundo daño: al llegar la fuente tarde, el texto ya pintado con la fuente de sistema se
recomponía. En el desglose del CLS aparecían las dos `.woff2` de `fonts.gstatic.com` como causantes,
con **0,059 de los 0,130** totales.

Ahora se carga con `next/font/google` en [`src/app/layout.tsx`](../src/app/layout.tsx):

- el `.woff2` se descarga **al compilar** y se sirve desde `elhogardetusuenos.com`, así que desaparecen
  las conexiones a `fonts.googleapis.com` y `fonts.gstatic.com` (verificado: 0 referencias en el HTML);
- Next calcula una **fuente de reserva con las métricas ajustadas** (`adjustFontFallback`, activado por
  defecto), de modo que el texto provisional ocupa ya el mismo hueco y no hay recolocación.

`tailwind.config.js` apuntaba `font-poppins` a `"Poppins"` a secas, que sólo funcionaba porque el
`@import` la había cargado. Ahora apunta a `var(--fuente-poppins)`.

### 5.2 La barra de navegación no salía en el HTML

[`src/components/Navbar.tsx`](../src/components/Navbar.tsx) tenía un `if (!mounted) return null;` que
ocultaba **la barra entera** hasta que el navegador terminaba de hidratar. Tres daños:

1. El menú, el buscador y el carrito **no estaban en el HTML del servidor**.
2. Al aparecer de golpe empujaban hacia abajo todo lo de debajo → más CLS. En el informe, el bloque
   `Bienvenido a El Hogar de tus Sueños` figuraba con 0,059 de desplazamiento.
3. Durante ese rato la tienda se veía sin navegación.

El guard existía por una sola razón: `theme` viene de next-themes y en el servidor no se sabe qué tema
tiene guardado el visitante. Pero **`theme` se usa en un único sitio**, el icono del botón de modo
oscuro. Todo lo demás se pinta con las clases `dark:` de Tailwind, que dependen de la clase del `<html>`
—que next-themes fija con un script inline antes del primer pintado— y no del JS de React.

Así que el guard vive ahora dentro de ese botón, con un hueco de 1em×1em mientras tanto para que al
aparecer el icono no mueva nada. Verificado: el HTML del servidor pasó de 62.408 a 69.335 bytes y el
enlace del carrito ya aparece.

### 5.3 Accesibilidad: dos elementos sin nombre

PageSpeed los señalaba con nombre y apellidos, ambos en el Navbar:

| Elemento | Problema | Arreglo |
|---|---|---|
| `<button class="lg:hidden text-2xl…">` (hamburguesa) | Sólo contiene un icono → un lector de pantalla anuncia "botón" y nada más | `aria-label="Abrir el menú de navegación"` |
| `<a href="/carrito">` | Igual, y con el carrito vacío ni siquiera tiene el número | `aria-label` dinámico con el número de artículos |

En los dos casos el icono lleva además `aria-hidden="true"`, para que el lector no intente deletrear el
glifo. Es obligación legal en España (EN 301 549), no sólo una recomendación de Google.

### 5.4 603 fichas de producto se veían sin foto

Lo destapó la consola del informe de PageSpeed: una tanda de 404 en imágenes de producto.

**La causa.** La tabla `productoimagen` guarda la URL con el formato de catálogo de PrestaShop:

```
https://elhogardetusuenos.com/4438/estor-enrollable-lira-blindecor.jpg
```

Esa dirección **la resolvía PrestaShop**, no un fichero real. Al migrar la tienda a Next dejó de
existir quien la resolviera, y desde entonces devuelve 404. Comprobadas las **627** filas que tienen ese
formato (de 630 totales) el 2026-08-12: **fallaban todas**. También en `-large_default/` y
`-home_default/`, así que no era cuestión del tamaño.

**Lo importante: los ficheros sí están.** PrestaShop reparte cada cifra del identificador en un nivel de
directorio, así que la foto 4438 vive realmente en:

```
/img/p/4/4/3/8/4438-large_default.jpg     → HTTP 200
```

**El arreglo** va en [`src/lib/imagenes.ts`](../src/lib/imagenes.ts), dentro de `urlImagenProducto()`,
que ya era el único sitio donde se normalizan las URLs de imagen. Se reescribe al vuelo. Verificado
contra las 630 filas reales, una a una contra el servidor de producción:

| | Antes | Después |
|---|---|---|
| Imágenes que se ven | 3 | **603** |
| Imágenes rotas | 627 | 27 |

Se hizo **en código y no en la base de datos** a propósito: no toca los datos, es reversible, y las filas
que se importen mañana con el mismo formato malo quedan cubiertas igual.

**Se devuelve una ruta relativa** (`/img/p/…`), no la URL completa: así `next/image` la lee de `public/`
sin salir a la red, en vez de pedírsela a nuestro propio dominio dando la vuelta por fuera.

#### Las 27 que siguen sin foto

**24 son productos desactivados**, que no están a la venta: no los ve nadie. Las otras **3 sí están
activas** y tienen un fallo distinto — la URL viene sin el número de imagen, con doble barra
(`.com//funda-sofa-elastica-malta.jpg`). Sin ese número no se puede reconstruir la ruta, así que ahora
devuelven `IMAGEN_POR_DEFECTO` en lugar de un enlace roto. **Hay que subirles la foto a mano** desde el
panel:

| ID | Referencia | Producto |
|---|---|---|
| 514 | `Cambio-28-38` | Cambio tamaño tubo de 28" a 38" |
| 522 | `7004` | Funda Sofá Elástica Rustica Martina Home |
| 523 | `7005` | Funda Sofá Elástica Tibet Martina Home |

Los 24 desactivados, por si algún día se reactivan: 524, 526, 529, 546, 549, 553, 554, 569, 570, 572,
585, 586, 587, 588, 589, 591, 594, 600, 602, 603, 604, 614, 626, 658.

### 5.5 El SDK de PayPal se descargaba en toda la tienda

`<PaypalProvider>` envolvía el layout raíz, así que `PayPalScriptProvider` se montaba en **todas** las
páginas y arrastraba el SDK de PayPal — **100 KiB** — a la portada, al blog y al catálogo. Encima, cada
carga de página pedía `/api/paypal/config` para conseguir el client-id.

**Dónde se usa PayPal de verdad.** Sólo hay dos componentes que consuman el SDK, y se montan en tres
sitios:

| Página | Componente |
|---|---|
| `/productos/[id]` | `PaypalExpressButton` (comprar ahora) |
| `/carrito` | `PaypalExpressButton` |
| `/test-paypal` | `PaypalCheckout` |

**El checkout normal no necesita el SDK.** `/checkout/pago` llama a `/api/paypal/crear-orden` por
servidor y **redirige** el navegador a PayPal; el botón de la librería no interviene. `PasarelaPaypal` no
importa `@paypal/react-paypal-js`. Conviene tenerlo claro antes de tocar nada por aquí.

**El arreglo.** Cada botón trae ahora su propio `PaypalProvider`
([`PaypalExpressButton.tsx`](../src/components/PaypalExpressButton.tsx),
[`PaypalCheckout.tsx`](../src/components/PaypalCheckout.tsx)) y se quitó del
[`layout.tsx`](../src/app/layout.tsx).

Se hizo así, y **no** con una lista de rutas que necesiten PayPal, porque una lista se desincroniza: el
día que alguien ponga el botón en una página nueva, no aparecería y el fallo sería silencioso. Pegado al
componente, no puede pasar.

Montar dos botones en la misma página no duplica la descarga: `@paypal/paypal-js` busca si ya existe un
`<script>` con los mismos atributos y lo reutiliza.

**Verificado** sobre el build de producción, comprobando qué páginas cargan el chunk del SDK:

| Página | Antes | Después |
|---|---|---|
| `/` portada | SDK | — |
| `/blog` | SDK | — |
| `/productos` listado | SDK | — |
| `/checkout/pago` | SDK | — |
| `/productos/[id]` ficha | SDK | SDK |
| `/carrito` | SDK | SDK |

### 5.6 La portada precargaba siete imágenes y ninguna con prioridad

Medición del 2026-08-12 a las 16:48, ya con todo lo anterior desplegado. La nota de móvil **bajó de 71 a
62**, y conviene mirar por qué antes de sacar conclusiones, porque las métricas cuentan lo contrario:

| Métrica | Prueba 2 | Prueba 3 |
|---|---|---|
| **CLS** | 0,13 | **0** |
| **TBT** | 340 ms | **50 ms** |
| Bloqueo de renderizado | 1.760 ms | **150 ms** |
| Tiempos de caché | 115 KiB | **35 KiB** |
| FCP | 2,7 s | 3,6 s |
| **LCP** | 3,5 s | **12,2 s** |

O sea: la fuente, el navbar y PayPal hicieron exactamente lo que se esperaba —CLS a cero, bloqueo de
renderizado a la décima parte, PayPal desaparecido de la lista de terceros— y **el LCP se disparó**.
Como el LCP pesa un 25 % de la nota, arrastró el total.

**La causa.** PageSpeed señaló el banner `banner-estores-digitales.jpg` como elemento LCP, y falló una
comprobación concreta: *"Se debe aplicar `fetchpriority=high` a la solicitud de precarga"*. Al mirar el
HTML de producción salieron dos cosas:

1. **Se precargaban SIETE imágenes**: los 2 banners, los 2 logos y 3 tarjetas de producto. Todas con la
   misma prioridad. Con la red limitada que simula PageSpeed se estorban entre ellas y la que de verdad
   importa llega la última.
2. **Ninguna llevaba `fetchpriority`.** `priority` de `next/image` **no lo añade** en esta versión:
   comprobado, la etiqueta salía sólo con `decoding="async"`.

**De dónde salían las siete:**

| Origen | Por qué sobraba |
|---|---|
| `ProductGrid.tsx`, `prioridad={i < 3}` | El comentario razonaba "la primera fila son 3 tarjetas". Cierto en escritorio; en **móvil la rejilla es de una columna** y quedan bajo cabecera, menú, titular y dos banners |
| `Header.tsx`, logo oscuro | Los dos logos están siempre en el DOM y sólo se ve uno según el tema. A quien va en claro le sobraba entero |
| `BannerPrincipal.tsx`, segundo banner | En móvil está debajo del primero, fuera de pantalla |

**El arreglo:** precargar **sólo el LCP** (más el logo claro, que es lo primero que se ve y pesa poco), y
ponerle `fetchPriority="high"` explícito. Verificado sobre el build: **de 7 preloads a 2**, y el banner
sale con `fetchPriority="high"` tanto en el `<img>` como en el `<link rel="preload">`.

> **Nota sobre el ruido de estas mediciones.** El dato de campo (usuarios reales, 28 días) no se movió en
> ninguna de las tres pruebas: LCP 1,8 s, INP 152 ms, CLS 0,09, **Superada**. Los números de laboratorio
> son una simulación con 4G limitado y varían bastante entre ejecuciones. Sirven para *encontrar* fallos
> concretos como éste; no para juzgar la tienda por la nota de una sola medición.

### 5.7 Lo que queda en accesibilidad: el contraste del azul de marca

Accesibilidad sigue en 89. Los dos fallos de nombres accesibles (5.3) sí se arreglaron —"Navegación
agéntica" pasó de 0/2 a 1/2—, pero queda el **contraste**:

`text-primary` es `#6BAEC9`. Sobre blanco da **2,46:1**, y la norma WCAG AA pide **4,5:1** para texto
normal (3:1 para texto grande). Falla en los dos casos. Afecta a enlaces del pie, "Ver opciones", el
correo de contacto, "Política de cookies" y varios títulos.

**No se ha tocado**: cambiar `primary` altera botones, enlaces y titulares de toda la tienda, y es una
decisión de imagen de marca, no técnica. Dos caminos posibles cuando se decida:

1. Oscurecer `primary` hasta cumplir. Cambia el aspecto de todo el sitio.
2. Añadir un color aparte —`primaryTexto`— más oscuro, y usarlo **sólo donde el azul hace de texto**,
   dejando `primary` como está para fondos y botones. Más trabajo, pero no cambia la imagen.

### Lo que queda, y de quién es

| Hallazgo | Dónde se arregla |
|---|---|
| **606 KiB de Google Tag Manager en cuatro etiquetas**, una de ellas `UA-57384028-1` — Universal Analytics, que Google apagó en julio de 2023 y no recoge nada | Panel de GTM, **no es código** |
| GA4 se carga **dos veces**: por el contenedor GTM y por el `<Script>` de `layout.tsx`. Si el contenedor también tiene la etiqueta GA4, las visitas se cuentan por duplicado | Comprobar en GTM antes de tocar el código |
| ~~El SDK de **PayPal** se carga en todas las páginas~~ | ✅ Resuelto, ver 5.5 |
| ~~Imágenes de producto que dan **404**~~ | ✅ Resuelto, ver 5.4 |
| Sin cabecera `Cache-Control` en `/img/…` | Directiva de Apache en Plesk, **no es código** |

---

## Referencia rápida de ficheros

| Fichero | Papel |
|---|---|
| [`src/lib/seo.ts`](../src/lib/seo.ts) | `SITE_NAME` y `quitarMarcaDelTitulo()` |
| [`src/lib/stock.ts`](../src/lib/stock.ts) | Qué categorías NO descuentan existencias |
| [`src/lib/productosLista.ts`](../src/lib/productosLista.ts) | **Consulta única del listado**: la comparten API, `/productos` y la portada |
| [`src/lib/imagenes.ts`](../src/lib/imagenes.ts) | Normaliza los tres formatos de URL de imagen y define los `sizes` de cada rejilla |
| [`next.config.mjs`](../next.config.mjs) | `remotePatterns`: dominios de imagen permitidos |
| [`src/app/(public)/page.tsx`](../src/app/(public)/page.tsx) | Portada, Server Component |
| [`src/app/(public)/productos/page.tsx`](../src/app/(public)/productos/page.tsx) | Listado, Server Component |
| [`src/app/(public)/productos/layout.tsx`](../src/app/(public)/productos/layout.tsx) | Metadatos del listado |
| [`src/app/api/pedidos/route.ts`](../src/app/api/pedidos/route.ts) | Creación de pedidos **y** descuento de stock |
| [`src/app/api/productos/route.ts`](../src/app/api/productos/route.ts) | Listado público, **sólo lectura** |
| [`src/lib/cmsConfig.ts`](../src/lib/cmsConfig.ts) | Páginas CMS. Ojo: la BD pisa a los `default*` |
| [`src/app/(admin)/admin/productos/[id]/tabs/TabPrecio.tsx`](../src/app/(admin)/admin/productos/[id]/tabs/TabPrecio.tsx) | Casilla de stock según haya combinaciones |
| [`src/app/layout.tsx`](../src/app/layout.tsx) | Carga de la fuente Poppins (`next/font`) y scripts de terceros |
| [`src/app/globals.css`](../src/app/globals.css) | `font-family` de `body`; **ya no** pide fuentes a Google |
| [`src/components/Navbar.tsx`](../src/components/Navbar.tsx) | Barra de navegación; el guard de `mounted` va **dentro** del botón de tema |

---

## Estado del plan SEO

Referido a [`2026-08-plan-seo-siguiente-fase.md`](2026-08-plan-seo-siguiente-fase.md):

| Paso | Estado |
|---|---|
| 2 — Título de `/productos` | ✅ **Cerrado** |
| 3 — Marca duplicada en títulos | ✅ **Cerrado** |
| 5 — `availability` real del producto | ✅ **Cerrado** |
| 1 — SSR de home y `/productos` | ✅ **Cerrado** |
| 4 — JSON-LD que falta (`Organization`, `FAQPage`, `BlogPosting`, migas en ficha) | ✅ **Cerrado** |
| 7 — `next/image` en `ProductCard` | ✅ **Cerrado** |
| 6 — Enlaces internos del blog al catálogo | ⬜ (redacción, no código) |
| 8 — Flecos (dominio con ñ, sitemaps legacy) | ⬜ |

## Decisiones pendientes del titular

1. **Correo y web en la configuración de facturas.** En producción, `facturas_configuracion` guarda
   `info@elhogardetussuenos.com` y `elhogardetussuenos.com`, **con doble "s"**: un dominio que no
   existe, sin DNS ni MX. Las facturas que se emiten hoy imprimen una dirección que no recibe correo y
   una web que no carga. Se arregla a mano en `/admin/facturas/configuracion`; no es un cambio de
   código. El bueno es `elhogardetusuenos.com`.
2. **¿Publicar la dirección postal** en el `Organization`? Hoy no se publica (ver 1.5).
3. **URLs de redes sociales** para `sameAs`, si existen perfiles.

---

## Desviaciones detectadas en la documentación

Cosas que `CLAUDE.md` dice y ya no son ciertas. Anotadas para corregirlas cuando se toque ese fichero:

- El modelo de líneas de pedido es **`pedidoproducto`**, no `detallepedido`.
- `middleware.ts` **no** hace seguimiento de tráfico: sólo redirecciones de PrestaShop. El seguimiento
  lo hace el componente `TrafficTracker` desde el layout raíz.
- `npm run build` **falla en Windows**: usa `NODE_OPTIONS='...' next build`, sintaxis de bash, y
  `npm run` invoca `cmd.exe`. En Plesk (Linux) funciona. En local hay que lanzar
  `npx next build` a mano, o instalar `cross-env`.
