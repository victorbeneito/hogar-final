import { NextRequest, NextResponse } from "next/server";
import { prisma, type Prisma } from "@/lib/prisma";
import {
  MAX_CANDIDATOS_AMPLIADA,
  filtroBusqueda,
  puntuarPorNombre,
  tokenizarBusqueda,
} from "@/lib/busquedaProductos";

// Campos que necesita la tarjeta de producto en el listado.
const SELECT_LISTA = {
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
  productoimagen: {                          // ← Imagenes con mayúscula
    where:  { esPortada: true },
    select: { url: true },
    take:   1,
  },
  productocategoria: {                        // ← Categorias en plural
    select: {
      categoria: { select: { id: true, nombre: true } },
    },
    take: 1,
  },
  marca: { select: { id: true, nombre: true } },
} satisfies Prisma.productoSelect;

// Helper para formatear variantes en la lista (MANTENIDO TU CÓDIGO ORIGINAL)
function formatearVariantesParaFrontend(variantes: any[]) {
  if (!Array.isArray(variantes)) return [];
  return variantes.map((v) => {
    let tipo = "";
    let valor = "";
    if (v.Atributos) {
      v.Atributos.forEach((attr: any) => {
        // ← ahora el Atributo viene dentro de AtributoValor
        if (attr.AtributoValor?.valor) {
          const nombreAtributo = attr.AtributoValor.Atributo?.nombre || "";
          if (attr.AtributoValor.valor.includes("x")) tipo = "TAMAÑO";
          else if (
            attr.AtributoValor.valor.toLowerCase().includes("izq") ||
            attr.AtributoValor.valor.toLowerCase().includes("der")
          ) tipo = "TIRADOR";
          else tipo = nombreAtributo || "OTRO";
          valor = attr.AtributoValor.valor;
        }
      });
    }
    return { ...v, tipo, valor, precio_extra: Number(v.precio_extra || 0) };
  });
}

// ----------------------------------------------------------------------
// GET /api/productos
// ----------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

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
    if (q.length > 2) {
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

  // Normalizar para el frontend
  const productosNormalizados = productos.map((p) => {
    // Aplicar IVA
    const porcentajeIva = Number(p.reglaimpuesto?.porcentaje ?? 0);
    const factorIva = 1 + porcentajeIva / 100;
    const precioConIva = Number(p.precio) * factorIva;
    const ofertaConIva = p.precioOferta != null ? Number(p.precioOferta) * factorIva : null;

    return {
      ...p,
      precio: precioConIva,
      precioOferta: ofertaConIva,
      prestashopProductId: p.mapeoProductoPs?.[0]?.idPrestashop ?? null,
      imagenPortada: p.productoimagen?.[0]?.url ?? null,
      categoria:     p.productocategoria?.[0]?.categoria ?? null,
    };
  });

  return NextResponse.json({ ok: true, productos: productosNormalizados, total, page, limit, sortBy, sortDir, busquedaAmpliada });
}


// ----------------------------------------------------------------------
// POST /api/productos
// ----------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const reglaImpuestoDefault = await prisma.reglaimpuesto.findFirst({
      where: {
        OR: [
          { nombre: "IVA GENERAL" },
          { porcentaje: 21 },
        ],
      },
    });

    // 1. Validar si existen Marca y Categoría Principal — IGUAL QUE TENÍAS
    let marcaConnect = undefined;
    let categoriaPrincipalConnect = undefined;

    if (body.marca) {
      const m = await prisma.marca.findFirst({ where: { nombre: body.marca } });
      if (m) marcaConnect = { connect: { id: m.id } };
      else return NextResponse.json({ ok: false, error: `Marca "${body.marca}" no encontrada` }, { status: 400 });
    }

    if (body.categoriaPrincipal) {
      const c = await prisma.categoria.findFirst({ where: { nombre: body.categoriaPrincipal } });
      if (c) categoriaPrincipalConnect = { connect: { id: c.id } };
      else return NextResponse.json({ ok: false, error: `Categoría principal "${body.categoriaPrincipal}" no encontrada` }, { status: 400 });
    }

    // 2. Crear producto — ADAPTADO AL NUEVO SCHEMA
    const nuevoProducto = await prisma.$transaction(async (tx) => {
      // A. Crear Producto
      const producto = await tx.producto.create({
        data: {
          nombre: body.nombre,
          referencia: body.referencia,
          resumen: body.resumen,
          descripcion: body.descripcion,
          descripcion_html: body.descripcion_html,
          precio: parseFloat(body.precio),
          precioOferta: body.precioOferta ? parseFloat(body.precioOferta) : null,
          precioCoste: body.precioCoste ? parseFloat(body.precioCoste) : null,
          activo: body.activo !== undefined ? body.activo : true,
          destacado: body.destacado || false,
          enOferta: body.enOferta || false,
          visibilidad: body.visibilidad || "tienda",
          tieneVariantes: body.tieneVariantes || false,
          marca: marcaConnect,
          reglaimpuesto: body.reglaImpuestoId
            ? { connect: { id: parseInt(body.reglaImpuestoId) } }
            : reglaImpuestoDefault
              ? { connect: { id: reglaImpuestoDefault.id } }
              : undefined
        },
        include: {
          marca: true,
          reglaimpuesto: true
        }
      });

      // B. Categorías (N:M)
      if (body.categorias?.length) {
        await tx.productoCategoria.createMany({
          data: body.categorias.map((catId: number, index: number) => ({
            productoId: producto.id,
            categoriaId: catId,
            esPrincipal: index === 0 // primera es principal
          }))
        });
      }

      // C. Imágenes
      if (body.imagenes?.length) {
        const imagenesData = body.imagenes.map((url: string, index: number) => ({
          url,
          orden: index,
          esPortada: index === 0,
          productoId: producto.id
        }));
        await tx.productoImagen.createMany({ data: imagenesData });
      }

      // D. Características
      if (body.caracteristicas?.length) {
        await tx.caracteristica.createMany({
          data: body.caracteristicas.map((car: any, index: number) => ({
            clave: car.clave,
            valor: car.valor,
            orden: index,
            productoId: producto.id
          }))
        });
      }

      // E. Variantes (solo si tieneVariantes = true)
      if (body.tieneVariantes && body.variantes?.length) {
        // Primero crear las variantes
        const variantesData = body.variantes.map((v: any) => ({
          productoId: producto.id,
          referencia: v.referencia,
          precioExtra: parseFloat(v.precio_extra || "0"),
          stock: parseInt(v.stock || "0"),
          esDefault: v.esDefault || false,
          imagen: v.imagen || null,
          activa: v.activa !== undefined ? v.activa : true
        }));
        const variantes = await Promise.all( variantesData.map((v: any) => tx.variante.create({ data: v })));

        // Luego crear las relaciones VarianteAtributo
        for (let i = 0; i < variantes.length; i++) {
          const variante = variantes[i];
          const atributos = body.variantes[i].atributos || [];
          const relaciones = atributos.map((attr: any) => ({
            varianteId: variante.id,
            atributoValorId: parseInt(attr.atributoValorId)
          }));
          if (relaciones.length > 0) {
            await tx.varianteAtributo.createMany({ data: relaciones });
          }
        }
      }

      // F. Cargar el producto completo
      return tx.producto.findUnique({
        where: { id: producto.id },
        include: {
          marca: true,
          productocategoria: { include: { categoria: true } },
          productoimagen: true,
          caracteristica: true,
          variante: {
            include: {
              Atributos: {
  include: {
    AtributoValor: {
      include: {
        Atributo: true   // ← se llega al Atributo a través de AtributoValor
      }
    }
  }
}
            }
          },
          reglaimpuesto: true
        }
      });
    });

    // Formatear respuesta con tu helper
    const respuesta = {
      ...nuevoProducto,
      marca: (nuevoProducto as any).marca,
      categoria: (nuevoProducto as any).productocategoria?.[0]?.categoria,
      categorias: (nuevoProducto as any).productocategoria?.map((pc: any) => pc.categoria),
      imagenPortada: (nuevoProducto as any).productoimagen?.find((img: any) => img.esPortada)?.url,
      imagenes: (nuevoProducto as any).productoimagen?.map((img: any) => img.url),
      variantes: formatearVariantesParaFrontend((nuevoProducto as any).variante),
      precioSinDescuento: (nuevoProducto as any).precioOferta ? (nuevoProducto as any).precio : null
    };

    return NextResponse.json({ ok: true, producto: respuesta }, { status: 201 });

  } catch (error: any) {
    console.error("❌ POST Error /api/productos:", error.message);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}
