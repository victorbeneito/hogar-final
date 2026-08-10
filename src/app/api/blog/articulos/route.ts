import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";
import { generarSlugUnico } from "@/lib/slugArticulo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 12)));
  const soloActivos = searchParams.get("activos") === "1";
  const busqueda = searchParams.get("q") ?? "";

  const where: Record<string, unknown> = {};
  if (soloActivos) where.activo = true;
  if (busqueda) {
    where.OR = [
      { titulo: { contains: busqueda } },
      { extracto: { contains: busqueda } },
      { etiquetas: { contains: busqueda } },
    ];
  }

  const [total, articulos] = await Promise.all([
    prisma.articulo.count({ where }),
    prisma.articulo.findMany({
      where,
      orderBy: { fechaPublicacion: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        titulo: true,
        slug: true,
        extracto: true,
        imagenPortada: true,
        autor: true,
        activo: true,
        destacado: true,
        etiquetas: true,
        vistas: true,
        fechaPublicacion: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, articulos, total, page, limit });
}

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { titulo, slug: slugPedido, extracto, contenidoHtml, imagenPortada, autor, activo, destacado, metaTitulo, metaDescripcion, etiquetas, fechaPublicacion } = body;

    if (!titulo?.trim()) {
      return NextResponse.json({ ok: false, error: "El título es obligatorio" }, { status: 400 });
    }

    // Se respeta el slug escrito en el panel; si viene vacío se deriva del título
    const slug = await generarSlugUnico(slugPedido, titulo);

    const articulo = await prisma.articulo.create({
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
        fechaPublicacion: fechaPublicacion ? new Date(fechaPublicacion) : new Date(),
        updatedAt: new Date(),
      },
    });

    // El contenido se guarda en crudo (sin escapar ni sanear). Invalidamos el
    // caché del blog para que el artículo se vea de inmediato.
    revalidatePath("/blog");
    revalidatePath(`/blog/${articulo.slug}`);

    return NextResponse.json({ ok: true, articulo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
