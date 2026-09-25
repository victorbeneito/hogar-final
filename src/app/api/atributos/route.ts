import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAtributoTipo } from "@/lib/atributoTipo";
import { canEdit } from "@/lib/adminAuth";

export async function GET() {
  try {
    const atributos = await prisma.atributo.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: {
        atributovalor: {
          orderBy: [{ orden: "asc" }, { id: "asc" }],
          include: { _count: { select: { varianteatributo: true } } },
        },
      },
    });

    return NextResponse.json({ ok: true, atributos });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso para crear atributos" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const nombre = String(body.nombre ?? "").trim();
    const tipo = resolveAtributoTipo({
      tipo: body.tipo,
      groupType: body.group_type ?? body.groupType,
      isColorGroup: body.is_color_group ?? body.isColorGroup,
    });
    const orden = Number(body.orden ?? 0);

    if (!nombre) {
      return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
    }

    const atributo = await prisma.atributo.create({
      data: {
        nombre,
        tipo,
        orden: Number.isFinite(orden) ? orden : 0,
      },
    });

    return NextResponse.json({ ok: true, atributo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// Borrado masivo: { ids: number[] }. Los valores caen con el atributo y,
// en cascada, se desenganchan de las variantes que los usaban.
export async function DELETE(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const ids: number[] = Array.isArray(body.ids)
      ? Array.from(new Set<number>(body.ids.map(Number).filter(Number.isInteger)))
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "No hay atributos seleccionados" }, { status: 400 });
    }

    const [, { count }] = await prisma.$transaction([
      prisma.atributovalor.deleteMany({ where: { atributoId: { in: ids } } }),
      prisma.atributo.deleteMany({ where: { id: { in: ids } } }),
    ]);

    return NextResponse.json({ ok: true, eliminados: count });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}