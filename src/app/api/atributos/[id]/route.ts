import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAtributoTipo } from "@/lib/atributoTipo";
import { canEdit } from "@/lib/adminAuth";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso" }, { status: 403 });
  }

  try {
    const { id: idString } = await params;
    const id = Number(idString);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const nombre = body.nombre !== undefined ? String(body.nombre).trim() : undefined;
    const tipo = body.tipo !== undefined || body.group_type !== undefined || body.groupType !== undefined || body.is_color_group !== undefined || body.isColorGroup !== undefined
      ? resolveAtributoTipo({
          tipo: body.tipo,
          groupType: body.group_type ?? body.groupType,
          isColorGroup: body.is_color_group ?? body.isColorGroup,
        })
      : undefined;
    const orden = body.orden !== undefined ? Number(body.orden) : undefined;

    if (nombre !== undefined && !nombre) {
      return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
    }

    const atributo = await prisma.atributo.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { nombre } : {}),
        ...(tipo !== undefined ? { tipo } : {}),
        ...(orden !== undefined ? { orden: Number.isFinite(orden) ? orden : 0 } : {}),
      },
    });

    return NextResponse.json({ ok: true, atributo });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso" }, { status: 403 });
  }

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