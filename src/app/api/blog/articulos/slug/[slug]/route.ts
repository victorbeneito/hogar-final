import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const articulo = await prisma.articulo.findUnique({ where: { slug, activo: true } });
  if (!articulo) {
    return NextResponse.json({ ok: false, error: "Artículo no encontrado" }, { status: 404 });
  }
  await prisma.articulo.update({
    where: { slug },
    data: { vistas: { increment: 1 }, updatedAt: new Date() },
  });
  return NextResponse.json({ ok: true, articulo });
}
