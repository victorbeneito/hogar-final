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

### 8. `registrarBusqueda` sólo en la API

`buscarProductos()` acepta esa opción y por defecto va a `false`. Si se activara en el render de
servidor, cada recarga de `/productos` insertaría una fila en `busqueda_log` con un término que nadie
ha tecleado.

---

## Referencia rápida de ficheros

| Fichero | Papel |
|---|---|
| [`src/lib/seo.ts`](../src/lib/seo.ts) | `SITE_NAME` y `quitarMarcaDelTitulo()` |
| [`src/lib/stock.ts`](../src/lib/stock.ts) | Qué categorías NO descuentan existencias |
| [`src/lib/productosLista.ts`](../src/lib/productosLista.ts) | **Consulta única del listado**: la comparten API, `/productos` y la portada |
| [`src/app/(public)/page.tsx`](../src/app/(public)/page.tsx) | Portada, Server Component |
| [`src/app/(public)/productos/page.tsx`](../src/app/(public)/productos/page.tsx) | Listado, Server Component |
| [`src/app/(public)/productos/layout.tsx`](../src/app/(public)/productos/layout.tsx) | Metadatos del listado |
| [`src/app/api/pedidos/route.ts`](../src/app/api/pedidos/route.ts) | Creación de pedidos **y** descuento de stock |
| [`src/app/api/productos/route.ts`](../src/app/api/productos/route.ts) | Listado público, **sólo lectura** |
| [`src/lib/cmsConfig.ts`](../src/lib/cmsConfig.ts) | Páginas CMS. Ojo: la BD pisa a los `default*` |
| [`src/app/(admin)/admin/productos/[id]/tabs/TabPrecio.tsx`](../src/app/(admin)/admin/productos/[id]/tabs/TabPrecio.tsx) | Casilla de stock según haya combinaciones |

---

## Estado del plan SEO

Referido a [`2026-08-plan-seo-siguiente-fase.md`](2026-08-plan-seo-siguiente-fase.md):

| Paso | Estado |
|---|---|
| 2 — Título de `/productos` | ✅ **Cerrado** |
| 3 — Marca duplicada en títulos | ✅ **Cerrado** |
| 5 — `availability` real del producto | ✅ **Cerrado** |
| 1 — SSR de home y `/productos` | ✅ **Cerrado** |
| 4 — JSON-LD que falta (`Organization`, `FAQPage`, `BlogPosting`, migas en ficha) | ⬜ |
| 6 — Enlaces internos del blog al catálogo | ⬜ |
| 7 — `next/image` en `ProductCard` | ⬜ |
| 8 — Flecos (dominio con ñ, sitemaps legacy) | ⬜ |

---

## Desviaciones detectadas en la documentación

Cosas que `CLAUDE.md` dice y ya no son ciertas. Anotadas para corregirlas cuando se toque ese fichero:

- El modelo de líneas de pedido es **`pedidoproducto`**, no `detallepedido`.
- `middleware.ts` **no** hace seguimiento de tráfico: sólo redirecciones de PrestaShop. El seguimiento
  lo hace el componente `TrafficTracker` desde el layout raíz.
- `npm run build` **falla en Windows**: usa `NODE_OPTIONS='...' next build`, sintaxis de bash, y
  `npm run` invoca `cmd.exe`. En Plesk (Linux) funciona. En local hay que lanzar
  `npx next build` a mano, o instalar `cross-env`.
