import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string; valorId: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString, valorId: valorIdString } = await params;
    const atributoId = Number(idString);
    const id = Number(valorIdString);

    if (!Number.isInteger(atributoId) || !Number.isInteger(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const existente = await prisma.atributovalor.findUnique({ where: { id } });
    if (!existente || existente.atributoId !== atributoId) {
      return NextResponse.json({ ok: false, error: "El valor no pertenece a este atributo" }, { status: 404 });
    }

    const body = await req.json();
    const valor = body.valor !== undefined ? String(body.valor).trim() : undefined;
    const orden = body.orden !== undefined ? Number(body.orden) : undefined;

    if (valor !== undefined && !valor) {
      return NextResponse.json({ ok: false, error: "El valor es obligatorio" }, { status: 400 });
    }

    const atributoValor = await prisma.atributovalor.update({
      where: { id },
      data: {
        ...(valor !== undefined ? { valor } : {}),
        ...(body.colorHex !== undefined ? { colorHex: body.colorHex ? String(body.colorHex).trim() : null } : {}),
        ...(body.imagen !== undefined ? { imagen: body.imagen ? String(body.imagen).trim() : null } : {}),
        ...(orden !== undefined ? { orden: Number.isFinite(orden) ? orden : 0 } : {}),
      },
    });

    return NextResponse.json({ ok: true, atributoValor });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString, valorId: valorIdString } = await params;
    const atributoId = Number(idString);
    const id = Number(valorIdString);

    if (!Number.isInteger(atributoId) || !Number.isInteger(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const atributoValor = await prisma.atributovalor.findUnique({ where: { id } });
    if (!atributoValor || atributoValor.atributoId !== atributoId) {
      return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
    }

    await prisma.atributovalor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}