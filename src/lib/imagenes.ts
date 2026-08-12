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
