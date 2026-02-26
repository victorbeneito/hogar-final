import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const categoria = await prisma.categoria.findUnique({
      where: { id }
    });

    if (!categoria) {
      return NextResponse.json({ ok: false, error: "Categoría no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, categoria });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}