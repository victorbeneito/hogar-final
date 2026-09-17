import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit, getAdminFromRequest } from "@/lib/adminAuth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Los mensajes de un pedido son la conversación interna con el cliente, notas privadas
// incluidas. Hasta el 2026-09-17 esta ruta no comprobaba nada en ninguno de sus dos métodos:
// cualquiera podía leer los de cualquier pedido y publicar uno firmado como "admin". Sólo la usa
// la ficha de pedido del panel, así que leer queda para cualquier administrador y escribir para
// los roles que pueden editar, igual que el PUT del pedido.

export async function GET(req: NextRequest, { params }: RouteParams) {
  if (!getAdminFromRequest(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

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
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso para escribir mensajes" }, { status: 403 });
  }

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
