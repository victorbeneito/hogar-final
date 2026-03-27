import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    // 1. Cargar producto original con relaciones
    const original = await prisma.producto.findUnique({
      where: { id },
      include: {
        productoimagen:   true,
        variante:         true,
        productocategoria: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const nuevoNombre = `${original.nombre} (copia)`;

    const duplicado = await prisma.$transaction(async (tx) => {
      // 2. Crear producto base (sin id ni fechas)
      const { 
  id: _id, 
  createdAt, 
  updatedAt, 
  productoimagen, 
  variante, 
  productocategoria, 
  ...rest  // solo campos escalares
} = original;

      const nuevo = await tx.producto.create({
        data: {
          ...rest,
          nombre: nuevoNombre,
          // opcional: limpia referencia y slug
          referencia: null,
          slug: null,
          // fechas nuevas
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 3. Copiar categoría principal (si quieres)
      if (original.productocategoria.length > 0) {
        await tx.productocategoria.createMany({
          data: original.productocategoria.map(pc => ({
            productoId: nuevo.id,
            categoriaId: pc.categoriaId,
            esPrincipal: pc.esPrincipal,
          })),
        });
      }

      // 4. Copiar imágenes
      if (original.productoimagen.length > 0) {
        await tx.productoimagen.createMany({
          data: original.productoimagen.map(img => ({
            productoId: nuevo.id,
            url: img.url,
            orden: img.orden,
            esPortada: img.esPortada,
          })),
        });
      }

      // 5. Copiar variantes
      if (original.variante.length > 0) {
        await tx.variante.createMany({
          data: original.variante.map(v => ({
            productoId: nuevo.id,
            referencia: null,
            stock: v.stock,
            imagen: v.imagen,
            color: v.color,
            imagenMuestra: v.imagenMuestra,
            precio_extra: v.precio_extra,
            tamano: v.tamano,
            tirador: v.tirador,
          })),
        });
      }

      return nuevo;
    });

    return NextResponse.json(duplicado, { status: 201 });
  } catch (error) {
    console.error("Error al duplicar producto:", error);
    return NextResponse.json({ error: "Error al duplicar producto" }, { status: 500 });
  }
}
