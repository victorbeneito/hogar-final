import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = Number(idString);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const producto = await prisma.producto.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        descripcion_html: true,
        precio: true,
        precioOferta: true,
        stock: true,
        productoimagen: {
          orderBy: { orden: "asc" },
          select: {
            id: true,
            url: true,
            orden: true,
            esPortada: true,
          },
        },
        productocategoria: {
          select: {
            categoria: {
              select: { id: true, nombre: true },
            },
          },
        },
        marca: {
          select: { id: true, nombre: true },
        },
        caracteristica: {
          orderBy: { orden: "asc" },
          select: {
            id: true,
            clave: true,
            valor: true,
            orden: true,
          },
        },
        variante: {
          select: {
            id: true,
            referencia: true,
            stock: true,
            imagen: true,
            color: true,
            imagenMuestra: true,
            imagenesVariante: true,
            precio_extra: true,
            tamano: true,
            tirador: true,
            varianteatributo: {
              select: {
                atributovalor: {
                  select: { id: true, valor: true, imagen: true, colorHex: true },
                },
              },
            },
          },
        },
      },
    });

    if (!producto) {
      return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: true,
        producto: {
          ...producto,
          categoria: producto.productocategoria?.[0]?.categoria ?? null,
          categorias: producto.productocategoria?.map((pc) => pc.categoria) ?? [],
          imagenPortada: producto.productoimagen?.find((img) => img.esPortada)?.url ?? null,
          imagenes: (producto.productoimagen ?? []).map((img) => img.url).filter(Boolean),
          caracteristicas: producto.caracteristica ?? [],
          variantes: (producto.variante ?? []).map((v) => ({
            ...v,
            atributovalores: v.varianteatributo?.map((va) => va.atributovalor) ?? [],
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error GET /api/productos/[id]/quick-view:", error);
    return NextResponse.json({ ok: false, error: "Error servidor" }, { status: 500 });
  }
}
