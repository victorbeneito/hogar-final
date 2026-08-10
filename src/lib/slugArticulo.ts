import { prisma } from "@/lib/prisma";

/** Convierte un texto libre en un slug apto para URL. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Devuelve un slug único para la tabla `articulo`.
 * Usa el slug propuesto (el que escribe el admin) y, si está vacío, lo deriva
 * del título. Si ya existe en otro artículo le añade un sufijo numérico
 * (-2, -3...) en lugar de un timestamp, para que la URL siga siendo legible.
 *
 * @param idActual id del artículo que se está editando, para no chocar consigo mismo.
 */
export async function generarSlugUnico(
  slugPropuesto: string | null | undefined,
  titulo: string,
  idActual?: number
): Promise<string> {
  const base = slugify(slugPropuesto ?? "") || slugify(titulo) || "articulo";

  let candidato = base;
  for (let n = 2; ; n++) {
    const existente = await prisma.articulo.findUnique({
      where: { slug: candidato },
      select: { id: true },
    });
    if (!existente || existente.id === idActual) return candidato;
    candidato = `${base}-${n}`;
  }
}
