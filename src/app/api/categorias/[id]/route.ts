import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

function toSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id: idString } = await params;
  const id = parseInt(idString);
  if (isNaN(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

  const categoria = await prisma.categoria.findUnique({
    where: { id },
    include: { other_categoria: true },
  });

  if (!categoria) return NextResponse.json({ ok: false, error: "No encontrada" }, { status: 404 });

  return NextResponse.json({ ok: true, categoria });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id: idString } = await params;
  const id = parseInt(idString);
  if (isNaN(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

  try {
    const body = await req.json();
    const { nombre, descripcion, imagen, activa, orden, parentId, metaTitulo, metaDescripcion, textoSeo } = body;
    const ordenNumero = orden !== undefined ? Number(orden) : undefined;
    const parentIdNumero = parentId !== undefined && parentId !== null && parentId !== "" ? Number(parentId) : null;

    // Si cambia el nombre, regenera el slug (evitando conflicto con la propia categoría)
    let slug: string | undefined;
    if (nombre) {
      const candidato = toSlug(nombre);
      const existe = await prisma.categoria.findFirst({
        where: { slug: candidato, NOT: { id } },
      });
      slug = existe ? `${candidato}-${Date.now()}` : candidato;
    }

    const categoria = await prisma.categoria.update({
      where: { id },
      data: {
        ...(nombre          !== undefined && { nombre, slug }),
        ...(descripcion     !== undefined && { descripcion }),
        ...(imagen          !== undefined && { imagen }),
        ...(activa          !== undefined && { activa }),
        ...(orden           !== undefined && { orden: Number.isFinite(ordenNumero) ? ordenNumero : 0 }),
        ...(parentId        !== undefined && { parentId: parentIdNumero }),
        ...(metaTitulo      !== undefined && { metaTitulo: metaTitulo || null }),
        ...(metaDescripcion !== undefined && { metaDescripcion: metaDescripcion || null }),
        ...(textoSeo        !== undefined && { textoSeo: textoSeo || null }),
      },
    });

    return NextResponse.json({ ok: true, categoria });
  } catch (error: any) {
    console.error("Error al actualizar categoría:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id: idString } = await params;
  const id = parseInt(idString);
  if (isNaN(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

  try {
    // Reasigna subcategorías al nivel raíz antes de borrar
    await prisma.categoria.updateMany({
      where: { parentId: id },
      data:  { parentId: null },
    });

    await prisma.categoria.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error al eliminar categoría:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
