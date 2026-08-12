/**
 * Normalización de las URLs de imagen de producto.
 *
 * El catálogo viene de tres migraciones distintas y las imágenes están en tres
 * formatos. Medido sobre los 693 productos publicados el 2026-08-12:
 *
 * | Formato                                   | Nº  | Tamaño real   | Problema                          |
 * |-------------------------------------------|-----|---------------|-----------------------------------|
 * | `/img/p/…-home_default.jpg` (relativa)    | 490 | 250×250, 17 KB| se amplía a 288 px → se ve blanda |
 * | `http://elhogardetusuenos.com/…`          | 101 | 1000×1000, 195 KB | 301 http→https en cada imagen  |
 * | `https://lh3.googleusercontent.com/d/…`   |  99 | ~175 KB       | dominio ajeno (Google Drive)      |
 *
 * Esta función deja todas en una forma que `next/image` pueda optimizar.
 */

const DOMINIO_TIENDA = "elhogardetusuenos.com";

/** Imagen que se muestra cuando un producto no tiene ninguna (hay 2 así). */
export const IMAGEN_POR_DEFECTO = "/img/no-image.jpg";

/**
 * Reconstruye la ruta física de una imagen de PrestaShop a partir de su número.
 *
 * PrestaShop no guarda las fotos en una carpeta plana: reparte cada cifra del
 * identificador en un nivel de directorio. La imagen 4438 vive en
 * `/img/p/4/4/3/8/4438-large_default.jpg`, y la 46481 en
 * `/img/p/4/6/4/8/1/46481-large_default.jpg`.
 *
 * Es un detalle de PrestaShop, no una convención general: si algún día se migran
 * las fotos a otro sitio, esta función deja de valer y hay que cambiarla aquí.
 */
function rutaFisicaPrestashop(numeroImagen: string): string {
  return `/img/p/${numeroImagen.split("").join("/")}/${numeroImagen}-large_default.jpg`;
}

/**
 * Devuelve la mejor URL disponible para mostrar la imagen de un producto.
 *
 * Hace dos cosas:
 *
 * 1. **Sube de `home_default` a `large_default`.** PrestaShop genera seis tamaños de
 *    cada imagen y la tienda estaba usando el de 250×250 en un hueco de 288 px, así
 *    que se veía ampliada. El de 800×800 permite que `next/image` reescale hacia
 *    abajo, que es nítido, en vez de estirar. Comprobado el 2026-08-12 que existe
 *    para **las 488 imágenes** de este formato: 0 fallos.
 *
 * 2. **Pasa `http://` a `https://` en el dominio propio.** Esas URLs devuelven un 301
 *    a https, así que cada imagen costaba un salto de más; y `remotePatterns` sólo
 *    admite `https`, de modo que con `http` `next/image` las rechazaría.
 *
 * Las de Google Drive y cualquier otra se devuelven tal cual: su dominio está
 * declarado en `next.config.mjs`.
 */
export function urlImagenProducto(url: string | null | undefined): string {
  const limpia = (url ?? "").trim();
  if (!limpia) return IMAGEN_POR_DEFECTO;

  let resultado = limpia;

  // URL "bonita" de PrestaShop → ruta física real.
  //
  // 627 de las 630 filas de `productoimagen` guardan la URL con este formato:
  //
  //     https://elhogardetusuenos.com/4438/estor-enrollable-lira-blindecor.jpg
  //
  // Esa dirección **da 404**. Comprobadas las 627 el 2026-08-12: fallaban todas, y
  // también en `-large_default/` y `-home_default/`. Era una URL de catálogo de
  // PrestaShop que dejó de resolverse al migrar la tienda a Next, así que esos
  // productos se estaban mostrando sin foto.
  //
  // El fichero sí existe, en la ruta física: de las 627, **603 aparecen** al
  // reescribirlas así. Las 24 restantes no están en el servidor y caen en la imagen
  // por defecto; hay que volver a subirlas a mano (lista en la documentación).
  //
  // Se deja relativa a propósito: `next/image` la sirve desde `public/`, sin salir a
  // la red, que es más rápido que pedírsela a nuestro propio dominio por fuera.
  const urlBonitaPrestashop = resultado.match(
    new RegExp(`^https?://${DOMINIO_TIENDA.replace(/\./g, "\\.")}/(\\d+)/[^/]+\\.jpe?g$`, "i")
  );
  if (urlBonitaPrestashop) {
    return rutaFisicaPrestashop(urlBonitaPrestashop[1]);
  }

  // Variante rota de lo anterior: la misma URL pero **sin el número de imagen**, con
  // doble barra: `https://elhogardetusuenos.com//funda-sofa-elastica-malta.jpg`.
  // Hay 3 así (productos 514, 522 y 523). Sin ese número no se puede reconstruir la
  // ruta física, así que no hay nada que rescatar: se devuelve la imagen por defecto
  // en lugar de un enlace que da 404 y deja el hueco roto en la ficha.
  if (new RegExp(`^https?://${DOMINIO_TIENDA.replace(/\./g, "\\.")}//`, "i").test(resultado)) {
    return IMAGEN_POR_DEFECTO;
  }

  // http → https, sólo en el dominio propio. No se toca el de otros hosts: si alguno
  // no sirviera por https, romperíamos su imagen sin ganar nada.
  if (resultado.startsWith(`http://${DOMINIO_TIENDA}/`)) {
    resultado = `https://${DOMINIO_TIENDA}/${resultado.slice(`http://${DOMINIO_TIENDA}/`.length)}`;
  }

  // Miniatura de PrestaShop → versión grande. Se limita a las rutas /img/p/ para no
  // tocar por accidente otra imagen que llevara ese texto en el nombre.
  if (resultado.includes("/img/p/") && resultado.endsWith("-home_default.jpg")) {
    resultado = resultado.replace(/-home_default\.jpg$/, "-large_default.jpg");
  }

  return resultado;
}

/**
 * Atributos `sizes` de las tarjetas de producto.
 *
 * Cada uno debe reflejar la rejilla donde se usa. Si `sizes` miente, `next/image`
 * sirve una imagen del tamaño equivocado: pasarse desperdicia bytes, quedarse corto
 * se ve borroso. Por eso hay dos, y no uno "que valga para todo".
 */

/** Catálogo y categorías: `grid-cols-1 sm:2 lg:3 xl:4` en un contenedor de 1400 px. */
export const SIZES_TARJETA_CATALOGO =
  "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 350px";

/** Portada (destacados): `grid-cols-1 sm:2 md:3` en un contenedor de 1280 px. */
export const SIZES_TARJETA_PORTADA =
  "(max-width: 639px) 100vw, (max-width: 767px) 50vw, 420px";
