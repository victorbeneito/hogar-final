import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";
import { generarSlugUnico } from "@/lib/slugArticulo";

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
    const { titulo, slug: slugPedido, extracto, contenidoHtml, imagenPortada, autor, activo, destacado, metaTitulo, metaDescripcion, etiquetas, fechaPublicacion } = body;

    if (!titulo?.trim()) {
      return NextResponse.json({ ok: false, error: "El título es obligatorio" }, { status: 400 });
    }

    const anterior = await prisma.articulo.findUnique({
      where: { id: Number(id) },
      select: { slug: true },
    });
    if (!anterior) {
      return NextResponse.json({ ok: false, error: "Artículo no encontrado" }, { status: 404 });
    }

    // Se respeta el slug escrito en el panel; si viene vacío se deriva del título
    const slug = await generarSlugUnico(slugPedido, titulo, Number(id));

    const articulo = await prisma.articulo.update({
      where: { id: Number(id) },
      data: {
        titulo: titulo.trim(),
        slug,
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

    // El contenido se guarda en crudo (sin escapar ni sanear). Invalidamos el
    // caché del blog para que los cambios se vean de inmediato.
    revalidatePath("/blog");
    revalidatePath(`/blog/${articulo.slug}`);
    // Si el slug ha cambiado, la URL antigua también hay que invalidarla
    if (anterior.slug !== articulo.slug) revalidatePath(`/blog/${anterior.slug}`);

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
    const borrado = await prisma.articulo.delete({ where: { id: Number(id) } });

    revalidatePath("/blog");
    revalidatePath(`/blog/${borrado.slug}`);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
