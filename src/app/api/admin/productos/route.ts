import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page    = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit   = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip    = (page - 1) * limit;
  const sortBy  = searchParams.get("sortBy")  ?? "id";
  const sortDir = (searchParams.get("sortDir") ?? "asc") === "desc" ? "desc" : "asc";

  const fieldMap: Record<string, string> = {
    id: "id", nombre: "nombre", referencia: "referencia",
    precio: "precio", stock: "stock", activo: "activo",
  };
  const orderBy = { [fieldMap[sortBy] ?? "id"]: sortDir };

  // ── Filtros ────────────────────────────────────────────────────────
  const where: Prisma.productoWhereInput = {};

  const idMin = searchParams.get("idMin");
  const idMax = searchParams.get("idMax");
  if (idMin || idMax) {
    where.id = {
      ...(idMin ? { gte: parseInt(idMin) } : {}),
      ...(idMax ? { lte: parseInt(idMax) } : {}),
    };
  }

  const nombre = searchParams.get("nombre");
  if (nombre) where.nombre = { contains: nombre };

  const referencia = searchParams.get("referencia");
  if (referencia) where.referencia = { contains: referencia };

  // ✅ CORREGIDO: nombre real de la relación en minúsculas
  const categoria = searchParams.get("categoria");
  if (categoria) {
    where.productocategoria = {
      some: {
        categoria: { nombre: { contains: categoria } },
      },
    };
  }

  const precioMin = searchParams.get("precioMin");
  const precioMax = searchParams.get("precioMax");
  if (precioMin || precioMax) {
    where.precio = {
      ...(precioMin ? { gte: parseFloat(precioMin) } : {}),
      ...(precioMax ? { lte: parseFloat(precioMax) } : {}),
    };
  }

  const stockMin = searchParams.get("stockMin");
  const stockMax = searchParams.get("stockMax");
  if (stockMin || stockMax) {
    where.stock = {
      ...(stockMin ? { gte: parseInt(stockMin) } : {}),
      ...(stockMax ? { lte: parseInt(stockMax) } : {}),
    };
  }

  const activo = searchParams.get("activo");
  if (activo !== null && activo !== "") where.activo = activo === "true";

  // ── Consulta ──────────────────────────────────────────────────────
  const [productos, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        nombre: true,
        referencia: true,
        precio: true,
        precioOferta: true,
        stock: true,
        activo: true,
        destacado: true,
        slug: true,
        // ✅ CORREGIDO: nombres reales de relaciones en minúsculas
        productoimagen: true,
        productocategoria: {
          select: {
            categoria: { select: { id: true, nombre: true } },
          },
          take: 1,
        },
        marca: { select: { id: true, nombre: true } },
      },
    }),
    prisma.producto.count({ where }),
  ]);

  return NextResponse.json({ productos, total, page, limit });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { imagenes, variantes, categoriaId, ...campos } = body;
  if (!campos.referencia) {
    return NextResponse.json({ ok: false, error: "La referencia es obligatoria" }, { status: 400 });
  }
  const reglaImpuestoDefault = await prisma.reglaimpuesto.findFirst({
    where: {
      OR: [
        { nombre: "IVA GENERAL" },
        { porcentaje: 21 },
      ],
    },
  });

  try {
    const producto = await prisma.$transaction(async (tx) => {

      // 1. Crear producto
      const nuevo = await tx.producto.create({
        data: {
          nombre:               campos.nombre,
          referencia:           campos.referencia,
          resumen:              campos.resumen              ?? null,
          descripcion:          campos.descripcion          ?? null,
          descripcion_html:     campos.descripcion_html     ?? null,
          precio:               parseFloat(campos.precio)   || 0,
          precioOferta:         campos.precioOferta         ? parseFloat(campos.precioOferta)  : null,
          precioCoste:          campos.precioCoste          ? parseFloat(campos.precioCoste)   : null,
          reglaImpuestoId:      campos.reglaImpuestoId      ?? reglaImpuestoDefault?.id ?? null,
          stock:                parseInt(campos.stock)      || 0,
          stockMinimo:          parseInt(campos.stockMinimo) || 0,
          activo:               campos.activo               ?? true,
          destacado:            campos.destacado            ?? false,
          enOferta:             campos.enOferta             ?? false,
          visibilidad:          campos.visibilidad          ?? "tienda",
          condicion:            campos.condicion            ?? "nuevo",
          mostrarCondicion:     campos.mostrarCondicion     ?? false,
          disponiblePedidos:    campos.disponiblePedidos    ?? true,
          soloWeb:              campos.soloWeb              ?? false,
          // ✅ CORREGIDO: etiquetas es String en BD, no array
          etiquetas:            Array.isArray(campos.etiquetas)
                                  ? JSON.stringify(campos.etiquetas)
                                  : campos.etiquetas ?? null,
          ean13:                campos.ean13                ?? null,
          upc:                  campos.upc                  ?? null,
          isbn:                 campos.isbn                 ?? null,
          tieneVariantes:       campos.tieneVariantes       ?? false,
          anchura:              campos.anchura              ? parseFloat(campos.anchura)       : null,
          altura:               campos.altura               ? parseFloat(campos.altura)        : null,
          profundidad:          campos.profundidad          ? parseFloat(campos.profundidad)   : null,
          peso:                 campos.peso                 ? parseFloat(campos.peso)          : null,
          plazoEntregaStock:    campos.plazoEntregaStock    ?? null,
          plazoEntregaSinStock: campos.plazoEntregaSinStock ?? null,
          gastosEnvioExtra:     campos.gastosEnvioExtra     ? parseFloat(campos.gastosEnvioExtra) : 0,
          metaTitulo:           campos.metaTitulo           ?? null,
          metaDescripcion:      campos.metaDescripcion      ?? null,
          slug:                 campos.slug                 ?? null,
          marcaId:              campos.marcaId              ?? null,
          updatedAt:            new Date(),
        },
      });

      // 2. Categoría
      // ✅ CORREGIDO: productocategoria en minúsculas
      if (categoriaId) {
        await tx.productocategoria.create({
          data: { productoId: nuevo.id, categoriaId },
        });
      }

      // 3. Imágenes
      // ✅ CORREGIDO: productoimagen en minúsculas
      if (imagenes?.length > 0) {
        await tx.productoimagen.createMany({
          data: imagenes.map((img: any, i: number) => ({
            productoId: nuevo.id,
            url:        img.url,
            esPortada:  img.esPortada ?? i === 0,
            orden:      img.orden     ?? i,
          })),
        });
      }

      // 4. Variantes
      if (variantes?.length > 0) {
        await tx.variante.createMany({
          data: variantes.map((v: any) => ({
            productoId:    nuevo.id,
            color:         v.color         ?? null,
            imagenMuestra: v.imagenMuestra ?? null,
            imagen:        v.imagen        ?? null,
            imagenesVariante: v.imagenesVariante ?? null,
            tamano:        v.tamano        ?? null,
            tirador:       v.tirador       ?? null,
            precio_extra:  v.precio_extra  ? parseFloat(v.precio_extra)  : 0,
            stock:         v.stock         ? parseInt(v.stock)           : 0,
            referencia:    v.referencia    ?? null,
          })),
        });
      }

      return nuevo;
    });

    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    console.error("Error al crear producto:", error);
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}
