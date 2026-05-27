import { NextRequest, NextResponse } from "next/server";
import { createFactura } from "@/lib/invoiceGenerator";
import { canEdit } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ error: "Sin permiso para generar facturas" }, { status: 403 });
  }
  try {
    const { pedidoId } = await req.json();
    if (!pedidoId || isNaN(Number(pedidoId))) {
      return NextResponse.json({ error: "pedidoId inválido" }, { status: 400 });
    }
    const result = await createFactura(Number(pedidoId));
    if (!result) {
      return NextResponse.json({ error: "No se encontró el pedido" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("[FACTURA MANUAL]", e);
    return NextResponse.json({ error: e.message || "Error generando factura" }, { status: 500 });
  }
}
