import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";
import {
  aplicarEfectosCambioEstado,
  registrarHistorialEstado,
  PEDIDO_PREVIO_SELECT,
} from "@/lib/orderStatusChange";

export const dynamic = "force-dynamic";

// PATCH /api/pedidos/bulk — cambiar estado de múltiples pedidos
export async function PATCH(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ error: "No tienes permiso para editar pedidos" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { ids, estado, notificarCliente } = body as {
      ids: number[];
      estado: string;
      notificarCliente?: boolean;
    };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids requeridos" }, { status: 400 });
    }
    if (!estado) {
      return NextResponse.json({ error: "estado requerido" }, { status: 400 });
    }

    const estadoExiste = await prisma.estadopedido.findUnique({ where: { clave: estado } });
    if (!estadoExiste) {
      return NextResponse.json({ error: "estado no válido" }, { status: 400 });
    }

    // Uno a uno, no `updateMany`: cada pedido necesita su línea de historial y sus
    // efectos (factura, Revi, email). Con `updateMany` el estado cambiaba en la
    // lista pero la ficha del pedido seguía mostrando el estado anterior.
    let updated = 0;
    let sinCambios = 0;
    const errores: { id: number; error: string }[] = [];

    for (const rawId of ids) {
      const id = Number(rawId);
      if (!Number.isInteger(id)) continue;

      try {
        const pedidoAnterior = await prisma.pedido.findUnique({
          where: { id },
          select: PEDIDO_PREVIO_SELECT,
        });
        if (!pedidoAnterior) {
          errores.push({ id, error: "pedido no encontrado" });
          continue;
        }
        if (pedidoAnterior.estado === estado) {
          sinCambios++;
          continue;
        }

        await prisma.pedido.update({
          where: { id },
          data: { estado, updatedAt: new Date() },
        });
        await registrarHistorialEstado(id, estado);
        await aplicarEfectosCambioEstado({
          pedidoId: id,
          estado,
          pedidoAnterior,
          enviarEmails: notificarCliente === true,
        });

        updated++;
      } catch (err: any) {
        console.error(`[PATCH /api/pedidos/bulk] pedido ${id}:`, err?.message || err);
        errores.push({ id, error: err?.message || "error desconocido" });
      }
    }

    return NextResponse.json({ updated, sinCambios, errores });
  } catch (error) {
    console.error("[PATCH /api/pedidos/bulk]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/pedidos/bulk — eliminar múltiples pedidos
export async function DELETE(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar pedidos" }, { status: 403 });
  }

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
