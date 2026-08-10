// Tipos del cliente generado (generated/prisma), igual que el resto de rutas.
import type { Prisma } from "@/lib/prisma";

/**
 * Búsqueda de productos "tolerante".
 *
 * El buscador antiguo pedía que la frase entera del cliente apareciera literal en el
 * nombre, la referencia o el slug. Eso dejaba fuera los dos casos más habituales:
 *
 *   "infantiles"  → los productos se llaman "... Estampado Digital Infantil ..."
 *   "ropa cama"   → esas dos palabras salen separadas, nunca seguidas
 *
 * Aquí la frase se parte en palabras, se les quita el plural y cada una se busca por
 * separado en nombre, referencia, slug, resumen, etiquetas, marca y NOMBRE DE CATEGORÍA.
 * Así "infantil" encuentra tanto los que lo llevan en el título como los de una
 * categoría que se llame así.
 */

/** Palabras que no aportan nada al buscar ("fundas de cama" = "fundas cama"). */
const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas",
  "y", "o", "con", "sin", "para", "por", "en", "al", "lo", "que",
]);

/** Cuántos candidatos se analizan como mucho en la búsqueda ampliada. */
export const MAX_CANDIDATOS_AMPLIADA = 500;

/** Minúsculas y sin tildes: "Traslúcido" → "traslucido". */
export const normalizarTexto = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Recorta el plural español para que la palabra valga también en singular.
 * Como después se busca por "contiene", recortar solo amplía: "infantil" sigue
 * encontrando "Infantil" e "Infantiles".
 *
 *   infantiles → infantil    estores → estor    cortinas → cortina    azul → azul
 */
function quitarPlural(palabra: string): string {
  if (/\d/.test(palabra)) return palabra; // referencias y medidas: HSCZ9324, 150x270
  if (palabra.length > 4 && palabra.endsWith("es")) return palabra.slice(0, -2);
  if (palabra.length > 3 && palabra.endsWith("s")) return palabra.slice(0, -1);
  return palabra;
}

/**
 * Parte lo que ha escrito el cliente en palabras buscables.
 * "Estores Infantiles" → ["estor", "infantil"]
 */
export function tokenizarBusqueda(consulta: string): string[] {
  const tokens: string[] = [];
  const vistos = new Set<string>();

  for (const palabra of consulta.split(/[^0-9A-Za-zÀ-ÿñÑ]+/).filter(Boolean)) {
    const limpia = palabra.toLowerCase();
    if (limpia.length < 2) continue;
    if (STOPWORDS.has(normalizarTexto(limpia))) continue;

    const raiz = quitarPlural(limpia);
    if (vistos.has(raiz)) continue;
    vistos.add(raiz);
    tokens.push(raiz);
  }

  // Si solo escribió palabras vacías ("de la"), se busca la frase tal cual.
  if (tokens.length === 0) {
    const frase = consulta.trim().toLowerCase();
    return frase ? [frase] : [];
  }

  return tokens;
}

/**
 * El cliente puede escribir con tildes o sin ellas, y el slug nunca las lleva,
 * así que se prueban las dos formas.
 */
function formasDelToken(token: string): string[] {
  const sinTildes = normalizarTexto(token);
  return sinTildes === token ? [token] : [token, sinTildes];
}

/** Dónde se busca cada palabra. */
function clausulasToken(token: string): Prisma.productoWhereInput[] {
  return formasDelToken(token).flatMap((forma) => [
    { nombre: { contains: forma } },
    { referencia: { contains: forma } },
    { slug: { contains: forma } },
    { resumen: { contains: forma } },
    { etiquetas: { contains: forma } },
    { marca: { nombre: { contains: forma } } },
    { productocategoria: { some: { categoria: { nombre: { contains: forma } } } } },
  ]);
}

/**
 * Filtro de búsqueda para Prisma.
 *
 *   "todas"  → el producto tiene que casar con TODAS las palabras (búsqueda normal)
 *   "alguna" → le vale con una (red de seguridad cuando la normal no devuelve nada)
 */
export function filtroBusqueda(
  tokens: string[],
  modo: "todas" | "alguna"
): Prisma.productoWhereInput | null {
  if (tokens.length === 0) return null;

  if (modo === "todas") {
    return { AND: tokens.map((token) => ({ OR: clausulasToken(token) })) };
  }
  return { OR: tokens.flatMap(clausulasToken) };
}

/**
 * Cuántas palabras de la búsqueda aparecen en el nombre del producto.
 * Sirve para ordenar la búsqueda ampliada: primero los que más se acercan.
 */
export function puntuarPorNombre(nombre: string, tokens: string[]): number {
  const normalizado = normalizarTexto(nombre);
  return tokens.reduce(
    (puntos, token) => (normalizado.includes(normalizarTexto(token)) ? puntos + 1 : puntos),
    0
  );
}
