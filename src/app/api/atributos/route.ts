import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAtributoTipo } from "@/lib/atributoTipo";

export async function GET() {
  try {
    const atributos = await prisma.atributo.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: {
        atributovalor: {
          orderBy: [{ orden: "asc" }, { id: "asc" }],
        },
      },
    });

    return NextResponse.json({ ok: true, atributos });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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