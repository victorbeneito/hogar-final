import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id: idString } = await params;
  const pedidoId = parseInt(idString, 10);
  if (Number.isNaN(pedidoId)) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  const mensajes = await prisma.pedido_mensaje.findMany({
    where: { pedidoId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ ok: true, mensajes });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const pedidoId = parseInt(idString, 10);
    if (Number.isNaN(pedidoId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const mensaje = String(body.mensaje || "").trim();
    if (!mensaje) {
      return NextResponse.json({ ok: false, error: "El mensaje no puede estar vacío" }, { status: 400 });
    }

    const created = await prisma.pedido_mensaje.create({
      data: {
        pedidoId,
        autor: String(body.autor || "admin"),
        autorNombre: body.autorNombre || null,
        mensaje,
        privado: Boolean(body.privado),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, mensaje: created }, { status: 201 });
  } catch (error: any) {
    console.error("Error POST mensaje pedido:", error);
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}
