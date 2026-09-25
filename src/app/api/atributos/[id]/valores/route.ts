import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso para crear valores de atributo" }, { status: 403 });
  }
  try {
    const { id: idString } = await params;
    const atributoId = Number(idString);
    if (!Number.isInteger(atributoId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const valor = String(body.valor ?? "").trim();
    if (!valor) {
      return NextResponse.json({ ok: false, error: "El valor es obligatorio" }, { status: 400 });
    }

    const orden = Number(body.orden ?? 0);

    const atributoValor = await prisma.atributovalor.create({
      data: {
        atributoId,
        valor,
        colorHex: body.colorHex ? String(body.colorHex).trim() : null,
        imagen: body.imagen ? String(body.imagen).trim() : null,
        orden: Number.isFinite(orden) ? orden : 0,
      },
    });

    return NextResponse.json({ ok: true, atributoValor }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// Borrado masivo: { ids: number[] }. Solo borra los que pertenecen a este atributo.
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso" }, { status: 403 });
  }
  try {
    const { id: idString } = await params;
    const atributoId = Number(idString);
    if (!Number.isInteger(atributoId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const ids: number[] = Array.isArray(body.ids)
      ? Array.from(new Set<number>(body.ids.map(Number).filter(Number.isInteger)))
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "No hay valores seleccionados" }, { status: 400 });
    }

    const { count } = await prisma.atributovalor.deleteMany({
      where: { atributoId, id: { in: ids } },
    });

    return NextResponse.json({ ok: true, eliminados: count });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}