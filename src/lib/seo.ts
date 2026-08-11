/**
 * Utilidades de SEO compartidas.
 *
 * El dominio NO se escribe aquí: vive en src/lib/urls.ts, que es la fuente única.
 */

/** Nombre de la marca, tal y como aparece en la plantilla de títulos del layout raíz. */
export const SITE_NAME = "El Hogar de tus Sueños";

/**
 * Quita la marca del final de un título.
 *
 * `src/app/layout.tsx` define `template: "%s | El Hogar de tus Sueños"`, así que Next
 * añade la marca a TODO título que no la traiga ya. Cuando el título de origen
 * (el metaTitle guardado en /admin/cms, o el sufijo del blog) también la incluye,
 * sale dos veces y el `<title>` se pasa de largo: Google lo corta hacia los 60
 * caracteres y lo que se pierde es el titular real, no la marca.
 *
 * Se aplica sobre valores que escribe el administrador a mano, por eso tolera
 * mayúsculas/minúsculas distintas, espacios de más y los separadores habituales
 * (| - – —). Si al quitarla no queda nada, se devuelve el título original: es
 * preferible una marca repetida a un <title> vacío.
 */
export function quitarMarcaDelTitulo(titulo: string): string {
  if (!titulo) return titulo;

  const marca = SITE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const limpio = titulo.replace(new RegExp(`\\s*[|\\-–—]\\s*${marca}\\s*$`, "i"), "").trim();

  return limpio.length > 0 ? limpio : titulo;
}
