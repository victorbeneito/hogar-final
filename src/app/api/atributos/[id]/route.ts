import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = Number(idString);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const nombre = body.nombre !== undefined ? String(body.nombre).trim() : undefined;
    const orden = body.orden !== undefined ? Number(body.orden) : undefined;

    if (nombre !== undefined && !nombre) {
      return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
    }

    const atributo = await prisma.atributo.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { nombre } : {}),
        ...(orden !== undefined ? { orden: Number.isFinite(orden) ? orden : 0 } : {}),
      },
    });

    return NextResponse.json({ ok: true, atributo });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = Number(idString);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    await prisma.atributovalor.deleteMany({ where: { atributoId: id } });
    await prisma.atributo.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}