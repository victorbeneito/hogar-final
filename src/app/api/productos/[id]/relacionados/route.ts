import { NextRequest, NextResponse } from "next/server";
import { prisma, type Prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * Productos relacionados.
 *
 * Estrategia (se combinan y se puntúan los candidatos):
 *  1. Misma categoría  → estores, cortinas, alfombras... (productos del mismo tipo)
 *  2. Nombre parecido  → "Funda nórdica", "Colcha", "Sábanas"... (misma familia textil)
 *  3. Misma marca      → refuerzo suave
 *  4. Destacados       → relleno si no hay suficientes coincidencias
 */

// Palabras vacías / genéricas que no aportan nada al parecido entre nombres.
const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "con", "sin",
  "para", "por", "que", "mas", "muy", "the", "and", "cama", "casa", "hogar", "color",
  "colores", "modelo", "modelos", "talla", "tallas", "ref", "referencia", "medida",
  "medidas", "tejido", "calidad", "nuevo", "nueva", "pack", "set", "cms", "grs",
]);

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Extrae las palabras significativas del nombre.
 * "Funda Nórdica Estampada 150x270" → [{ limpio: "funda" }, { limpio: "nordica", original: "nórdica" }, ...]
 * Se guardan las dos versiones para buscar también con acentos (por si la colación de MySQL los distingue).
 */
function extraerTokens(nombre: string): { limpio: string; original: string }[] {
  const palabras = nombre.split(/[^0-9A-Za-zÀ-ÿñÑ]+/).filter(Boolean);
  const tokens: { limpio: string; original: string }[] = [];

  for (const palabra of palabras) {
    const limpio = normalizar(palabra);
    if (limpio.length < 4) continue;
    if (STOPWORDS.has(limpio)) continue;
    if (/^\d+$/.test(limpio)) continue; // números sueltos
    if (/^\d+x\d+/.test(limpio)) continue; // medidas tipo 150x270
    tokens.push({ limpio, original: palabra.toLowerCase() });
    if (tokens.length === 3) break; // las primeras palabras definen el tipo de producto
  }

  return tokens;
}

// Campos que necesita la tarjeta del carrusel.
const SELECT_TARJETA = {
  id: true,
  nombre: true,
  slug: true,
  precio: true,
  precioOferta: true,
  stock: true,
  destacado: true,
  enOferta: true,
  marcaId: true,
  reglaimpuesto: { select: { porcentaje: true } },
  mapeoProductoPs: { select: { idPrestashop: true }, take: 1 },
  productoimagen: {
    orderBy: [{ esPortada: "desc" }, { orden: "asc" }],
    select: { url: true },
    take: 1,
  },
  productocategoria: {
    select: { categoriaId: true, esPrincipal: true, categoria: { select: { id: true, nombre: true } } },
  },
  marca: { select: { id: true, nombre: true } },
} satisfies Prisma.productoSelect;

type Candidato = Prisma.productoGetPayload<{ select: typeof SELECT_TARJETA }>;

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const { searchParams } = new URL(req.url);
    const limite = Math.min(20, Math.max(4, Number(searchParams.get("limit") ?? "12")));

    const idNumero = Number(idString);
    const esId = Number.isInteger(idNumero) && idNumero > 0;

    // Producto de referencia (acepta id o slug, igual que la ficha pública)
    const base = await prisma.producto.findFirst({
      where: esId ? { id: idNumero } : { slug: idString },
      select: {
        id: true,
        nombre: true,
        marcaId: true,
        productocategoria: { select: { categoriaId: true, esPrincipal: true } },
      },
    });

    if (!base) {
      return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });
    }

    const categoriaIds = base.productocategoria.map((pc) => pc.categoriaId);
    const categoriaPrincipalId =
      base.productocategoria.find((pc) => pc.esPrincipal)?.categoriaId ?? categoriaIds[0] ?? null;
    const tokens = extraerTokens(base.nombre);

    const baseWhere: Prisma.productoWhereInput = {
      id: { not: base.id },
      activo: true,
    };

    // Los candidatos más recientes/destacados primero; el scoring posterior decide el orden final.
    const orden: Prisma.productoOrderByWithRelationInput[] = [
      { destacado: "desc" },
      { enOferta: "desc" },
      { id: "desc" },
    ];

    const [porCategoria, porNombre, porMarca, destacados] = await Promise.all([
      categoriaIds.length
        ? prisma.producto.findMany({
            where: { ...baseWhere, productocategoria: { some: { categoriaId: { in: categoriaIds } } } },
            select: SELECT_TARJETA,
            orderBy: orden,
            take: 60,
          })
        : Promise.resolve([] as Candidato[]),

      tokens.length
        ? prisma.producto.findMany({
            where: {
              ...baseWhere,
              OR: tokens.flatMap((token) =>
                token.limpio === token.original
                  ? [{ nombre: { contains: token.limpio } }]
                  : [{ nombre: { contains: token.limpio } }, { nombre: { contains: token.original } }]
              ),
            },
            select: SELECT_TARJETA,
            orderBy: orden,
            take: 40,
          })
        : Promise.resolve([] as Candidato[]),

      base.marcaId
        ? prisma.producto.findMany({
            where: { ...baseWhere, marcaId: base.marcaId },
            select: SELECT_TARJETA,
            orderBy: orden,
            take: 20,
          })
        : Promise.resolve([] as Candidato[]),

      prisma.producto.findMany({
        where: { ...baseWhere, destacado: true },
        select: SELECT_TARJETA,
        orderBy: orden,
        take: limite,
      }),
    ]);

    // Unificamos candidatos (sin duplicados) y puntuamos el parecido
    const candidatos = new Map<number, Candidato>();
    for (const p of [...porCategoria, ...porNombre, ...porMarca, ...destacados]) {
      if (!candidatos.has(p.id)) candidatos.set(p.id, p);
    }

    const puntuar = (p: Candidato) => {
      let puntos = 0;

      const catsCandidato = p.productocategoria.map((pc) => pc.categoriaId);
      const compartidas = catsCandidato.filter((catId) => categoriaIds.includes(catId));
      if (compartidas.length) puntos += 35 + (compartidas.length - 1) * 10;
      if (categoriaPrincipalId != null && compartidas.includes(categoriaPrincipalId)) puntos += 25;

      const nombreCandidato = normalizar(p.nombre);
      const coincidencias = tokens.filter((token) => nombreCandidato.includes(token.limpio)).length;
      puntos += coincidencias * 20;

      if (base.marcaId && p.marcaId === base.marcaId) puntos += 12;
      if (p.destacado) puntos += 6;
      if (p.enOferta || (p.precioOferta != null && p.precioOferta < p.precio)) puntos += 4;
      if ((p.stock ?? 0) > 0) puntos += 3;
      if (p.productoimagen.length) puntos += 5; // sin foto no luce en el carrusel

      return puntos;
    };

    const relacionados = [...candidatos.values()]
      .map((p) => ({ producto: p, puntos: puntuar(p) }))
      .sort((a, b) => b.puntos - a.puntos || b.producto.id - a.producto.id)
      .slice(0, limite)
      .map(({ producto: p }) => {
        // El precio en BD es sin IVA → se muestra con IVA, igual que en /api/productos
        const factorIva = 1 + Number(p.reglaimpuesto?.porcentaje ?? 0) / 100;
        return {
          id: p.id,
          nombre: p.nombre,
          slug: p.slug,
          precio: Number(p.precio) * factorIva,
          precioOferta: p.precioOferta != null ? Number(p.precioOferta) * factorIva : null,
          stock: p.stock,
          destacado: p.destacado,
          imagenPortada: p.productoimagen[0]?.url ?? null,
          marca: p.marca,
          categoria: p.productocategoria[0]?.categoria ?? null,
          prestashopProductId: p.mapeoProductoPs?.[0]?.idPrestashop ?? null,
        };
      });

    return NextResponse.json(
      { ok: true, productos: relacionados, total: relacionados.length },
      {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
      }
    );
  } catch (error) {
    console.error("❌ Error GET /api/productos/[id]/relacionados:", error);
    return NextResponse.json({ ok: false, error: "Error servidor" }, { status: 500 });
  }
}
