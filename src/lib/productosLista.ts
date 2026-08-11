import { prisma, type Prisma } from "@/lib/prisma";
import {
  MAX_CANDIDATOS_AMPLIADA,
  filtroBusqueda,
  puntuarPorNombre,
  tokenizarBusqueda,
} from "@/lib/busquedaProductos";

/**
 * Consulta del listado de productos.
 *
 * Este módulo existe para que **la API y las páginas renderizadas en servidor usen
 * exactamente el mismo código**. Antes la lógica vivía dentro de GET /api/productos y
 * el listado sólo se pintaba en el navegador; al pasar /productos y la home a
 * renderizado en servidor había dos opciones: duplicar la consulta (y que las dos
 * copias se separaran con el tiempo) o extraerla aquí. Se extrajo.
 *
 * Si hay que tocar el filtrado, el orden o la forma de los datos, se toca AQUÍ y
 * ambos caminos se enteran a la vez.
 */

/** Campos que necesita la tarjeta de producto en el listado. */
export const SELECT_LISTA = {
  id:          true,
  nombre:      true,
  slug:        true,
  referencia:  true,
  precio:      true,
  precioOferta:true,
  stock:       true,
  activo:      true,
  destacado:   true,
  enOferta:    true,
  createdAt:   true,
  mapeoProductoPs: { select: { idPrestashop: true }, take: 1 },
  reglaimpuesto: { select: { porcentaje: true } },
  productoimagen: {
    where:  { esPortada: true },
    select: { url: true },
    take:   1,
  },
  productocategoria: {
    select: {
      categoria: { select: { id: true, nombre: true } },
    },
    take: 1,
  },
  marca: { select: { id: true, nombre: true } },
} satisfies Prisma.productoSelect;

export type ProductoLista = ReturnType<typeof normalizarProductoLista>;

/**
 * Pasa el precio de la BD (sin IVA) a precio de venta y aplana las relaciones que la
 * tarjeta espera planas. Es la forma que consume `ProductCard`.
 */
export function normalizarProductoLista(p: any) {
  const porcentajeIva = Number(p.reglaimpuesto?.porcentaje ?? 0);
  const factorIva = 1 + porcentajeIva / 100;

  return {
    ...p,
    precio: Number(p.precio) * factorIva,
    precioOferta: p.precioOferta != null ? Number(p.precioOferta) * factorIva : null,
    prestashopProductId: p.mapeoProductoPs?.[0]?.idPrestashop ?? null,
    imagenPortada: p.productoimagen?.[0]?.url ?? null,
    categoria:     p.productocategoria?.[0]?.categoria ?? null,
  };
}

export type ResultadoListado = {
  productos: ReturnType<typeof normalizarProductoLista>[];
  total: number;
  page: number;
  limit: number;
  sortBy: string;
  sortDir: "asc" | "desc";
  /** true cuando no había resultados con todas las palabras y se muestran los más parecidos. */
  busquedaAmpliada: boolean;
};

/**
 * Busca productos aplicando filtros, orden y paginación.
 *
 * `registrarBusqueda` sólo debe ir a true en la API: si se registrara también en el
 * render de servidor, cada recarga de /productos inflaría la tabla de búsquedas.
 */
export async function buscarProductos(
  searchParams: URLSearchParams,
  { registrarBusqueda = false }: { registrarBusqueda?: boolean } = {}
): Promise<ResultadoListado> {
  const page    = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit   = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip    = (page - 1) * limit;
  const sortBy  = searchParams.get("sortBy")  ?? "relevance";
  const sortDir = (searchParams.get("sortDir") ?? "desc") === "asc" ? "asc" : "desc";

  const fieldMap: Record<string, string> = {
    id: "id",
    nombre: "nombre",
    precio: "precio",
    stock: "stock",
    activo: "activo",
    referencia: "referencia",
    createdAt: "createdAt",
  };
  const orderBy: Prisma.productoOrderByWithRelationInput | Prisma.productoOrderByWithRelationInput[] =
    sortBy === "relevance"
      ? [
          { destacado: "desc" },
          { enOferta: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ]
      : { [fieldMap[sortBy] ?? "id"]: sortDir };

  const where: Prisma.productoWhereInput = {};

  const q = searchParams.get("q")?.trim();
  // La frase se parte en palabras y cada una se busca por separado (nombre, resumen,
  // etiquetas, marca, categoría...). Ver src/lib/busquedaProductos.ts
  const tokensBusqueda = q ? tokenizarBusqueda(q) : [];
  if (q) {
    const filtro = filtroBusqueda(tokensBusqueda, "todas");
    if (filtro) where.AND = [filtro];

    // Registrar búsqueda (sin romper el flujo si falla)
    if (registrarBusqueda && q.length > 2) {
      prisma.busqueda_log.create({
        data: { termino: q.toLowerCase() }
      }).catch(() => {});
    }
  }

  const idMin = searchParams.get("idMin");
  const idMax = searchParams.get("idMax");
  if (idMin || idMax) where.id = {
    ...(idMin ? { gte: parseInt(idMin) } : {}),
    ...(idMax ? { lte: parseInt(idMax) } : {}),
  };

  const nombre = searchParams.get("nombre");
  if (nombre) where.nombre = { contains: nombre };

  const referencia = searchParams.get("referencia");
  if (referencia) where.referencia = { contains: referencia };

  const categoria = searchParams.get("categoria");
  if (categoria) {
    const categoryIds = categoria.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (categoryIds.length > 0) {
      where.productocategoria = {
        some: { categoriaId: { in: categoryIds } },
      };
    }
  }

  const precioMin = searchParams.get("precioMin");
  const precioMax = searchParams.get("precioMax");
  if (precioMin || precioMax) where.precio = {
    ...(precioMin ? { gte: parseFloat(precioMin) } : {}),
    ...(precioMax ? { lte: parseFloat(precioMax) } : {}),
  };

  const stockMin = searchParams.get("stockMin");
  const stockMax = searchParams.get("stockMax");
  if (stockMin || stockMax) where.stock = {
    ...(stockMin ? { gte: parseInt(stockMin) } : {}),
    ...(stockMax ? { lte: parseInt(stockMax) } : {}),
  };

  const activo = searchParams.get("activo");
  // Filtrar por activo: si no se especifica, mostrar solo productos activos (para tienda pública)
  if (activo !== null && activo !== "") {
    where.activo = activo === "true";
  } else {
    where.activo = true;
  }

  const destacado = searchParams.get("destacado");
  if (destacado !== null && destacado !== "") where.destacado = destacado === "true";

  let [productos, total] = await Promise.all([
    prisma.producto.findMany({ where, orderBy, skip, take: limit, select: SELECT_LISTA }),
    prisma.producto.count({ where }),
  ]);

  // Red de seguridad: si pidiendo TODAS las palabras no sale nada ("estor infantil
  // marino"), se repite aceptando cualquiera de ellas y se ordenan por cuántas
  // palabras de la búsqueda lleva el nombre, para que lo más parecido salga primero.
  let busquedaAmpliada = false;
  if (total === 0 && tokensBusqueda.length > 1) {
    const filtroAmplio = filtroBusqueda(tokensBusqueda, "alguna");
    const whereAmplio: Prisma.productoWhereInput = { ...where, AND: filtroAmplio ? [filtroAmplio] : [] };

    if (sortBy !== "relevance") {
      // El cliente ha pedido un orden concreto (precio, nombre...): se respeta tal cual.
      const [lista, cuantos] = await Promise.all([
        prisma.producto.findMany({ where: whereAmplio, orderBy, skip, take: limit, select: SELECT_LISTA }),
        prisma.producto.count({ where: whereAmplio }),
      ]);
      if (cuantos > 0) {
        productos = lista;
        total = cuantos;
        busquedaAmpliada = true;
      }
    } else {
      // Orden por relevancia: primero los que más palabras de la búsqueda llevan en el nombre.
      const candidatos = await prisma.producto.findMany({
        where: whereAmplio,
        orderBy,
        take: MAX_CANDIDATOS_AMPLIADA,
        select: { id: true, nombre: true },
      });

      if (candidatos.length > 0) {
        // sort estable: a igual puntuación se mantiene el orden por defecto
        const ordenados = candidatos
          .map((p) => ({ id: p.id, puntos: puntuarPorNombre(p.nombre, tokensBusqueda) }))
          .sort((a, b) => b.puntos - a.puntos);

        const idsPagina = ordenados.slice(skip, skip + limit).map((c) => c.id);
        const fichas = await prisma.producto.findMany({
          where: { id: { in: idsPagina } },
          select: SELECT_LISTA,
        });
        const fichaPorId = new Map(fichas.map((f) => [f.id, f]));

        productos = idsPagina
          .map((id) => fichaPorId.get(id))
          .filter((f): f is NonNullable<typeof f> => Boolean(f));
        total = ordenados.length;
        busquedaAmpliada = true;
      }
    }
  }

  return {
    productos: productos.map(normalizarProductoLista),
    total,
    page,
    limit,
    sortBy,
    sortDir,
    busquedaAmpliada,
  };
}
