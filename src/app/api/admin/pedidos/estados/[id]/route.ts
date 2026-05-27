import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const CORE_CLAVES = ["PENDIENTE", "PROCESANDO", "ENVIADO", "ENTREGADO", "CANCELADO", "DEVUELTO"];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const estadoId = parseInt(id);
    if (isNaN(estadoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const estado = await prisma.estadopedido.findUnique({ where: { id: estadoId } });
    if (!estado) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ estado });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!canEdit(req)) {
    return NextResponse.json({ error: "Sin permiso para modificar estados de pedido" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const estadoId = parseInt(id);
    if (isNaN(estadoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const data = await req.json();
    const { id: _id, createdAt: _c, ...rest } = data;
    const now = new Date();
    const estado = await prisma.estadopedido.update({
      where: { id: estadoId },
      data: { ...rest, updatedAt: now },
    });
    return NextResponse.json({ ok: true, estado });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!canEdit(req)) {
    return NextResponse.json({ error: "Sin permiso para eliminar estados de pedido" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const estadoId = parseInt(id);
    if (isNaN(estadoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const estado = await prisma.estadopedido.findUnique({ where: { id: estadoId } });
    if (estado && CORE_CLAVES.includes(estado.clave)) {
      return NextResponse.json({ error: "No se puede eliminar un estado del sistema" }, { status: 400 });
    }
    await prisma.estadopedido.delete({ where: { id: estadoId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
