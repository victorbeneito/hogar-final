import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";

type Params = { params: Promise<{ id: string }> };


// ── GET — carga producto completo ─────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: idStr } = await params;
  const id = Number(idStr);

  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const producto = await prisma.producto.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      referencia: true,
      precio: true,
      precioOferta: true,
      stock: true,
      activo: true,
      destacado: true,
      tieneVariantes: true,
      productoimagen: {
        orderBy: { orden: "asc" },
        select: { id: true, url: true, orden: true, esPortada: true },
      },
          variante: {
            select: {
              id: true,
              productoId: true,
              referencia: true,
              stock: true,
              imagen: true,
              color: true,
              imagenMuestra: true,
              imagenesVariante: true,
              precio_extra: true,
              tamano: true,
              tirador: true,
            },
      },
      productocategoria: {
        select: {
          categoria: {
            select: { id: true, nombre: true },
          },
        },
        take: 3,
      },
      marca: {
        select: { id: true, nombre: true },
      },
      reglaimpuesto: {
        select: { id: true, nombre: true, porcentaje: true },
      },
      composicion: true,
    },
  });

  if (!producto) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  return NextResponse.json(producto);
}


// ── PUT — actualiza producto ──────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  if (!canEdit(req)) {
    return NextResponse.json({ error: "No tienes permiso para editar productos" }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = Number(idStr);

if (!Number.isInteger(id)) {
  return NextResponse.json({ error: "ID inválido" }, { status: 400 });
}
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json();
  const { imagenes, variantes, categoriaId, ...campos } = body;
  if (!campos.referencia) {
    return NextResponse.json({ error: "La referencia es obligatoria" }, { status: 400 });
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

      // 1. Actualizar campos del producto
      await tx.producto.update({
        where: { id },
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
          // ✅ CORREGIDO: etiquetas es String en BD
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
          // ✅ CORREGIDO: parseFloat puede devolver NaN, usamos || en lugar de ??
          gastosEnvioExtra:     campos.gastosEnvioExtra     ? parseFloat(campos.gastosEnvioExtra) : 0,
          metaTitulo:           campos.metaTitulo           ?? null,
          metaDescripcion:      campos.metaDescripcion      ?? null,
          composicion:          campos.composicion          ?? null,
          slug:                 campos.slug                 ?? null,
          marcaId:              campos.marcaId              ?? null,
          updatedAt:            new Date(),
        },
      });

      // 2. Sincronizar categoría
      // ✅ CORREGIDO: productocategoria en minúsculas
      if (categoriaId !== undefined) {
        await tx.productocategoria.deleteMany({ where: { productoId: id } });
        if (categoriaId) {
          await tx.productocategoria.create({
            data: { productoId: id, categoriaId },
          });
        }
      }

      // 3. Sincronizar imágenes
      // ✅ CORREGIDO: productoimagen en minúsculas
      if (imagenes !== undefined) {
        await tx.productoimagen.deleteMany({ where: { productoId: id } });
        if (imagenes.length > 0) {
          await tx.productoimagen.createMany({
            data: imagenes.map((img: any, i: number) => ({
              productoId: id,
              url:        img.url,
              esPortada:  img.esPortada ?? i === 0,
              orden:      img.orden     ?? i,
            })),
          });
        }
      }

      // 4. Sincronizar variantes - Siempre eliminar las viejas si se envía el campo
      if (Array.isArray(variantes)) {
        console.log(`Eliminando variantes del producto ${id}...`);
        const deletedCount = await tx.variante.deleteMany({ where: { productoId: id } });
        console.log(`Variantes eliminadas: ${deletedCount.count}`);

        // Crear nuevas variantes solo si hay elementos en el array
        if (variantes.length > 0) {
          console.log(`Creando ${variantes.length} nuevas variantes...`);
          await tx.variante.createMany({
            data: variantes.map((v: any) => {
              const precioExtra = v.precio_extra ? parseFloat(v.precio_extra) : 0;
              return {
                productoId:    id,
                color:         v.color         ?? null,
                imagenMuestra: v.imagenMuestra ?? null,
                imagen:        v.imagen        ?? null,
                imagenesVariante: v.imagenesVariante ?? null,
                tamano:        v.tamano        ?? null,
                tirador:       v.tirador       ?? null,
                precio_extra:  parseFloat(precioExtra.toFixed(2)),
                stock:         v.stock         ? parseInt(v.stock)          : 0,
                referencia:    v.referencia    ?? null,
              };
            }),
          });
          console.log(`${variantes.length} variantes creadas`);
        } else {
          console.log("Array de variantes está vacío, no se crean nuevas");
        }
      } else {
        console.log("variantes no es un array, no se modifican variantes");
      }

      return tx.producto.findUnique({
        where: { id },
        // ✅ CORREGIDO: nombres de relaciones en minúsculas
        include: { productoimagen: true, variante: true },
      });
    });

    return NextResponse.json(producto);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

// ── DELETE — elimina producto ─────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!canEdit(req)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar productos" }, { status: 403 });
  }
  const { id: idStr } = await params;
  const id = Number(idStr); 
if (!Number.isInteger(id)) {
  return NextResponse.json({ error: "ID inválido" }, { status: 400 });
}
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  try {
    await prisma.producto.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}
