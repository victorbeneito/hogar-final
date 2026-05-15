import { ordersController } from "@/lib/paypal-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { orderID, pedidoId } = await req.json();

    if (!orderID) {
      return NextResponse.json({ error: "Missing orderID" }, { status: 400 });
    }

    const { body } = await ordersController.captureOrder({
      id: orderID,
      prefer: "return=representation",
    });

    const result = typeof body === "string" ? JSON.parse(body) : body;

    if (!result?.id) {
      return NextResponse.json({ error: "Failed to capture PayPal order" }, { status: 500 });
    }

    const capture = result.purchase_units?.[0]?.payments?.captures?.[0];

    // Resolves pedidoId: explicit param > referenceId from PayPal response
    const resolvedPedidoId =
      pedidoId ??
      result.purchase_units?.[0]?.reference_id ??
      null;

    if (resolvedPedidoId) {
      const id = parseInt(String(resolvedPedidoId), 10);
      if (!Number.isNaN(id)) {
        await prisma.pedido.update({
          where: { id },
          data: { estadoPago: "PAGADO", updatedAt: new Date() },
        }).catch((err: Error) =>
          console.error("PayPal: error actualizando estadoPago del pedido:", err.message)
        );
      }
    }

    return NextResponse.json({
      ok: true,
      orderId: result.id,
      status: result.status,
      captureId: capture?.id,
      amount: capture?.amount?.value,
      currency: capture?.amount?.currency_code,
    });
  } catch (error) {
    console.error("PayPal capture order error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
