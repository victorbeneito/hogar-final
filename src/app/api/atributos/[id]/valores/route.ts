import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
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