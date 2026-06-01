import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const articulo = await prisma.articulo.findUnique({ where: { id: Number(id) } });
  if (!articulo) {
    return NextResponse.json({ ok: false, error: "Artículo no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, articulo });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    const { titulo, extracto, contenidoHtml, imagenPortada, autor, activo, destacado, metaTitulo, metaDescripcion, etiquetas, fechaPublicacion } = body;

    if (!titulo?.trim()) {
      return NextResponse.json({ ok: false, error: "El título es obligatorio" }, { status: 400 });
    }

    const articulo = await prisma.articulo.update({
      where: { id: Number(id) },
      data: {
        titulo: titulo.trim(),
        extracto: extracto?.trim() ?? null,
        contenidoHtml: contenidoHtml ?? "",
        imagenPortada: imagenPortada?.trim() ?? null,
        autor: autor?.trim() || "El equipo de tu Hogar",
        activo: Boolean(activo),
        destacado: Boolean(destacado),
        metaTitulo: metaTitulo?.trim() ?? null,
        metaDescripcion: metaDescripcion?.trim() ?? null,
        etiquetas: etiquetas?.trim() ?? null,
        fechaPublicacion: fechaPublicacion ? new Date(fechaPublicacion) : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, articulo });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await prisma.articulo.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
