import { NextRequest, NextResponse } from "next/server";
import { prisma, type Prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * Productos relacionados.
 *
 * En esta tienda la familia de un producto está en el NOMBRE, no en la categoría:
 * los 556 estores digitales (zen, cocina, infantil, ciudades...) cuelgan todos de
 * "Estores Digitales". Lo único que distingue a un zen es la palabra "Zen" del título
 * "Happystor HSCZ9324 Estor Enrollable Estampado Digital Zen Tejido Traslúcido".
 *
 * Por eso el parecido se calcula sobre el nombre, pesando cada palabra por lo poco
 * frecuente que es dentro de su categoría (la idea del TF-IDF):
 *
 *   estor / enrollable / estampado / digital / traslucido → están en los 556 → peso 0
 *   zen                                                   → está en 58       → peso alto
 *
 * Así solo puntúan las palabras que de verdad definen la temática, y después se corta
 * por umbral para no mezclar familias: si estás viendo un zen, solo salen zen.
 */

// Palabras vacías / genéricas que no aportan nada al parecido entre nombres.
const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "con", "sin",
  "para", "por", "que", "mas", "muy", "the", "and", "cama", "casa", "hogar", "color",
  "colores", "modelo", "modelos", "talla", "tallas", "ref", "referencia", "medida",
  "medidas", "calidad", "nuevo", "nueva", "pack", "cms", "grs",
]);

/** Tope del corpus que se analiza en memoria (el catálogo ronda los 700 productos). */
const MAX_CORPUS = 2000;
/** Un candidato entra si alcanza este % de la puntuación del mejor. */
const UMBRAL_RELATIVO = 0.55;
/** Si el corte por umbral deja menos de esto, se completa con los siguientes mejores. */
const MIN_AFINES = 4;

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Palabras significativas del nombre, ya normalizadas.
 * "Happystor HSCZ9324 Estor Enrollable Estampado Digital Zen Tejido Traslúcido"
 *   → ["estor", "enrollable", "estampado", "digital", "zen", "tejido", "traslucido"]
 * Se quitan la marca y las referencias porque no relacionan nada (HSCZ9324 es único).
 */
function extraerTokens(nombre: string, marca?: string | null): string[] {
  const palabrasMarca = new Set(marca ? normalizar(marca).split(/\s+/).filter(Boolean) : []);
  const tokens: string[] = [];
  const vistos = new Set<string>();

  for (const palabra of nombre.split(/[^0-9A-Za-zÀ-ÿñÑ]+/).filter(Boolean)) {
    const limpio = normalizar(palabra);
    if (limpio.length < 3) continue; // "Zen" tiene 3 letras: el mínimo no puede ser mayor
    if (STOPWORDS.has(limpio)) continue;
    if (/\d/.test(limpio)) continue; // referencias (HSCZ9324), medidas (150x270), hilos (144)
    if (palabrasMarca.has(limpio)) continue; // la marca está en todos los productos
    if (vistos.has(limpio)) continue;
    vistos.add(limpio);
    tokens.push(limpio);
  }

  return tokens;
}

// Campos que necesita la tarjeta del carrusel (solo se piden para los finalistas).
const SELECT_TARJETA = {
  id: true,
  nombre: true,
  slug: true,
  precio: true,
  precioOferta: true,
  stock: true,
  destacado: true,
  reglaimpuesto: { select: { porcentaje: true } },
  mapeoProductoPs: { select: { idPrestashop: true }, take: 1 },
  productoimagen: {
    orderBy: [{ esPortada: "desc" }, { orden: "asc" }],
    select: { url: true },
    take: 1,
  },
  productocategoria: {
    select: { categoria: { select: { id: true, nombre: true } } },
    take: 1,
  },
  marca: { select: { id: true, nombre: true } },
} satisfies Prisma.productoSelect;

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const { searchParams } = new URL(req.url);
    const limite = Math.min(20, Math.max(4, Number(searchParams.get("limit") ?? "12")));

    const idNumero = Number(idString);
    const esId = Number.isInteger(idNumero) && idNumero > 0;

    // Producto de referencia (acepta id o slug, igual que la ficha pública).
    // El OR es necesario porque hay productos cuyo slug ES un número ("7000"):
    // decidir por el aspecto del segmento hacía que se buscara un id inexistente.
    // No hay ningún caso en la base de datos en que el slug numérico de un producto
    // coincida con el id de otro, así que el OR no puede devolver el equivocado.
    const base = await prisma.producto.findFirst({
      where: { OR: [{ slug: idString }, ...(esId ? [{ id: idNumero }] : [])] },
      select: {
        id: true,
        nombre: true,
        marcaId: true,
        marca: { select: { nombre: true } },
        productocategoria: { select: { categoriaId: true } },
      },
    });

    if (!base) {
      return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });
    }

    const categoriaIds = [...new Set(base.productocategoria.map((pc) => pc.categoriaId))];
    const tokens = extraerTokens(base.nombre, base.marca?.nombre);

    // Si el producto está en varias categorías nos quedamos con la más específica (la que
    // menos productos tiene): evita que un cajón de sastre tipo "Ofertas" ensucie el corpus.
    let categoriaObjetivoId: number | null = null;
    if (categoriaIds.length === 1) {
      categoriaObjetivoId = categoriaIds[0];
    } else if (categoriaIds.length > 1) {
      const conteos = await Promise.all(
        categoriaIds.map((categoriaId) =>
          prisma.producto.count({
            where: { activo: true, productocategoria: { some: { categoriaId } } },
          })
        )
      );
      const indiceMenor = conteos.reduce((mejor, n, i) => (n < conteos[mejor] ? i : mejor), 0);
      categoriaObjetivoId = categoriaIds[indiceMenor];
    }

    // Corpus a analizar: los productos de esa categoría, solo con campos ligeros
    const corpus = await prisma.producto.findMany({
      where: {
        id: { not: base.id },
        activo: true,
        ...(categoriaObjetivoId != null
          ? { productocategoria: { some: { categoriaId: categoriaObjetivoId } } }
          : {}),
      },
      select: { id: true, nombre: true, destacado: true, enOferta: true, marcaId: true, stock: true },
      orderBy: { id: "desc" },
      take: MAX_CORPUS,
    });

    if (corpus.length === 0) {
      return NextResponse.json({ ok: true, productos: [], total: 0 }, { status: 200 });
    }

    const candidatos = corpus.map((p) => ({ ...p, normalizado: normalizar(p.nombre) }));

    // Peso de cada palabra: cuantos menos productos la lleven, más define la familia.
    // "estor" está en los 555 → peso 0; "zen" está en 58 → peso 2,24.
    const pesos = tokens.map((token) => {
      const apariciones = candidatos.reduce((n, p) => n + (p.normalizado.includes(token) ? 1 : 0), 0);
      return { token, peso: Math.max(0, Math.log(candidatos.length / (1 + apariciones))) };
    });

    const puntuar = (p: (typeof candidatos)[number]) => {
      // x100 para trabajar con enteros cómodos; los bonus de abajo solo desempatan
      let puntos = Math.round(
        pesos.reduce((total, w) => total + (p.normalizado.includes(w.token) ? w.peso : 0), 0) * 100
      );

      if (base.marcaId && p.marcaId === base.marcaId) puntos += 12; // misma marca primero
      if (p.destacado) puntos += 6;
      if (p.enOferta) puntos += 4;
      if ((p.stock ?? 0) > 0) puntos += 3;

      return puntos;
    };

    const puntuados = candidatos
      .map((p) => ({ p, puntos: puntuar(p) }))
      .sort((a, b) => b.puntos - a.puntos || b.p.id - a.p.id);

    // Corte por umbral: solo productos de la misma familia. Si salen muy pocos
    // (colecciones pequeñas), se completa con los siguientes más parecidos.
    const mejorPuntuacion = puntuados[0]?.puntos ?? 0;
    const umbral = mejorPuntuacion * UMBRAL_RELATIVO;
    const afines = puntuados.filter((x) => x.puntos > 0 && x.puntos >= umbral);
    const seleccion = (afines.length >= MIN_AFINES ? afines : puntuados).slice(0, limite * 2);

    // Ahora sí, los datos completos de los finalistas
    const fichas = await prisma.producto.findMany({
      where: { id: { in: seleccion.map((s) => s.p.id) } },
      select: SELECT_TARJETA,
    });
    const fichaPorId = new Map(fichas.map((f) => [f.id, f]));

    const ordenados = seleccion
      .map((s) => fichaPorId.get(s.p.id))
      .filter((f): f is NonNullable<typeof f> => Boolean(f));

    // Los que tienen foto lucen mejor en el carrusel
    const finales = [
      ...ordenados.filter((f) => f.productoimagen.length > 0),
      ...ordenados.filter((f) => f.productoimagen.length === 0),
    ].slice(0, limite);

    const relacionados = finales.map((p) => {
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
