import { NextRequest, NextResponse } from "next/server";
import { prisma, type Prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * Productos relacionados.
 *
 * La idea: si el cliente está viendo un estor digital INFANTIL, lo que quiere ver
 * son otros diseños infantiles, no estores de cocina o zen. Por eso mandan dos señales:
 *
 *  1. La categoría MÁS ESPECÍFICA del producto (la más profunda del árbol) pesa mucho
 *     más que las categorías generales que comparten todos los productos de la familia.
 *  2. Las palabras del nombre se pesan por lo raras que son en el catálogo: "estor" o
 *     "digital" están en cientos de productos y casi no informan; "infantil" o el nombre
 *     de la colección sí distinguen, así que valen mucho más.
 *
 * Con esto funciona tanto si "infantiles" es una subcategoría propia como si la temática
 * solo aparece en el nombre del producto.
 */

// Palabras vacías / genéricas que no aportan nada al parecido entre nombres.
const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "con", "sin",
  "para", "por", "que", "mas", "muy", "the", "and", "cama", "casa", "hogar", "color",
  "colores", "modelo", "modelos", "talla", "tallas", "ref", "referencia", "medida",
  "medidas", "tejido", "calidad", "nuevo", "nueva", "pack", "set", "cms", "grs",
]);

const MAX_TOKENS = 4;

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

type Token = { limpio: string; original: string; peso: number };

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
    if (tokens.some((t) => t.limpio === limpio)) continue;
    tokens.push({ limpio, original: palabra.toLowerCase() });
    if (tokens.length === MAX_TOKENS) break;
  }

  return tokens;
}

/**
 * Peso de una palabra según lo poco frecuente que sea en el catálogo (idea del IDF).
 * "estor" (en 800 de 3000 productos) → ~17 puntos; "infantil" (en 30) → ~40 puntos.
 */
function pesoToken(apariciones: number, totalProductos: number): number {
  if (totalProductos < 2) return 30;
  const rareza = Math.log(totalProductos / Math.max(apariciones, 1)) / Math.log(totalProductos);
  return Math.round(Math.min(60, Math.max(8, 8 + 55 * rareza)));
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
    const tokensBase = extraerTokens(base.nombre);

    // Árbol de categorías + frecuencia de cada palabra en el catálogo
    const [arbol, totalActivos, apariciones] = await Promise.all([
      prisma.categoria.findMany({ select: { id: true, parentId: true } }),
      prisma.producto.count({ where: { activo: true } }),
      Promise.all(
        tokensBase.map((token) =>
          prisma.producto.count({ where: { activo: true, nombre: { contains: token.limpio } } })
        )
      ),
    ]);

    const tokens: Token[] = tokensBase.map((token, i) => ({
      ...token,
      peso: pesoToken(apariciones[i] ?? 0, totalActivos),
    }));

    // Profundidad de cada categoría en el árbol (raíz = 0). Cuanto más profunda, más específica.
    const padrePorId = new Map(arbol.map((c) => [c.id, c.parentId]));
    const profundidadCache = new Map<number, number>();
    const profundidad = (categoriaId: number): number => {
      const memo = profundidadCache.get(categoriaId);
      if (memo !== undefined) return memo;

      let nivel = 0;
      let actual: number | null | undefined = padrePorId.get(categoriaId);
      const vistos = new Set<number>([categoriaId]);
      while (actual != null && !vistos.has(actual) && nivel < 10) {
        vistos.add(actual);
        nivel += 1;
        actual = padrePorId.get(actual);
      }

      profundidadCache.set(categoriaId, nivel);
      return nivel;
    };

    // Categoría objetivo: la más específica del producto ("Estores Digitales Infantiles"
    // en lugar de "Estores" o "Estores Digitales").
    const categoriaObjetivoId = categoriaIds.length
      ? [...categoriaIds].sort((a, b) => profundidad(b) - profundidad(a))[0]
      : null;

    // Palabras más distintivas del nombre ("dinosaurios", "infantil"... antes que "estor" o "digital").
    // Se consultan por separado para que ninguna de las dos se quede fuera de los candidatos.
    const tokensClave = [...tokens].sort((a, b) => b.peso - a.peso).slice(0, 2);

    const baseWhere: Prisma.productoWhereInput = {
      id: { not: base.id },
      activo: true,
    };

    const orden: Prisma.productoOrderByWithRelationInput[] = [
      { destacado: "desc" },
      { enOferta: "desc" },
      { id: "desc" },
    ];

    // Buscar por nombre con y sin acentos (por si la colación distingue)
    const contieneToken = (token: Token): Prisma.productoWhereInput[] =>
      token.limpio === token.original
        ? [{ nombre: { contains: token.limpio } }]
        : [{ nombre: { contains: token.limpio } }, { nombre: { contains: token.original } }];

    const [porCategoriaObjetivo, porTokensClave, porCategorias, porNombre, destacados] = await Promise.all([
      // 1. Misma subcategoría exacta: la fuente principal de recomendaciones
      categoriaObjetivoId != null
        ? prisma.producto.findMany({
            where: { ...baseWhere, productocategoria: { some: { categoriaId: categoriaObjetivoId } } },
            select: SELECT_TARJETA,
            orderBy: orden,
            take: 40,
          })
        : Promise.resolve([] as Candidato[]),

      // 2. Misma temática dentro de la familia ("infantil", "dinosaurios"... + alguna categoría
      //    del producto). Cubre el caso de que la temática solo esté en el nombre y no en una
      //    subcategoría: sin esta consulta, en una categoría con cientos de productos los
      //    infantiles podrían no llegar ni a entrar en la lista de candidatos.
      categoriaIds.length
        ? Promise.all(
            tokensClave.map((token) =>
              prisma.producto.findMany({
                where: {
                  ...baseWhere,
                  OR: contieneToken(token),
                  productocategoria: { some: { categoriaId: { in: categoriaIds } } },
                },
                select: SELECT_TARJETA,
                orderBy: orden,
                take: 20,
              })
            )
          ).then((listas) => listas.flat())
        : Promise.resolve([] as Candidato[]),

      // 3. Resto de categorías del producto (familia amplia): relleno
      categoriaIds.length
        ? prisma.producto.findMany({
            where: { ...baseWhere, productocategoria: { some: { categoriaId: { in: categoriaIds } } } },
            select: SELECT_TARJETA,
            orderBy: orden,
            take: 40,
          })
        : Promise.resolve([] as Candidato[]),

      // 4. Nombre parecido en cualquier categoría (misma colección o diseño)
      tokens.length
        ? prisma.producto.findMany({
            where: { ...baseWhere, OR: tokens.flatMap(contieneToken) },
            select: SELECT_TARJETA,
            orderBy: orden,
            take: 30,
          })
        : Promise.resolve([] as Candidato[]),

      // 5. Destacados: último recurso para no dejar el carrusel vacío
      prisma.producto.findMany({
        where: { ...baseWhere, destacado: true },
        select: SELECT_TARJETA,
        orderBy: orden,
        take: limite,
      }),
    ]);

    // Unificamos candidatos (sin duplicados) y puntuamos el parecido
    const candidatos = new Map<number, Candidato>();
    for (const p of [...porCategoriaObjetivo, ...porTokensClave, ...porCategorias, ...porNombre, ...destacados]) {
      if (!candidatos.has(p.id)) candidatos.set(p.id, p);
    }

    const puntuar = (p: Candidato) => {
      let puntos = 0;

      // Categorías: la coincidencia más específica manda
      const compartidas = p.productocategoria
        .map((pc) => pc.categoriaId)
        .filter((catId) => categoriaIds.includes(catId));

      if (compartidas.length) {
        const nivelMasEspecifico = Math.max(...compartidas.map(profundidad));
        puntos += 20 + 22 * nivelMasEspecifico;
        puntos += (compartidas.length - 1) * 8;
        // Bonus fuerte por estar exactamente en la subcategoría del producto que se está viendo
        if (categoriaObjetivoId != null && compartidas.includes(categoriaObjetivoId)) puntos += 45;
      }

      // Nombre: cada palabra vale según lo distintiva que sea
      const nombreCandidato = normalizar(p.nombre);
      for (const token of tokens) {
        if (nombreCandidato.includes(token.limpio)) puntos += token.peso;
      }

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
