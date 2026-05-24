import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/pedidos/bulk — cambiar estado de múltiples pedidos
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, estado } = body as { ids: number[]; estado: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids requeridos" }, { status: 400 });
    }
    if (!estado) {
      return NextResponse.json({ error: "estado requerido" }, { status: 400 });
    }

    const estadosValidos = ["PENDIENTE", "PROCESANDO", "ENVIADO", "ENTREGADO", "CANCELADO", "DEVUELTO"];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: "estado no válido" }, { status: 400 });
    }

    const result = await prisma.pedido.updateMany({
      where: { id: { in: ids } },
      data: { estado },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("[PATCH /api/pedidos/bulk]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/pedidos/bulk — eliminar múltiples pedidos
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids } = body as { ids: number[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids requeridos" }, { status: 400 });
    }

    // factura no tiene onDelete Cascade, hay que borrarla antes
    await prisma.factura.deleteMany({ where: { pedidoId: { in: ids } } });

    const result = await prisma.pedido.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("[DELETE /api/pedidos/bulk]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
