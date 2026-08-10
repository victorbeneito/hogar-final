import { ordersController } from "@/lib/paypal-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { pedidoId, currency = "EUR" } = await req.json();

    if (!pedidoId) {
      return NextResponse.json({ error: "Missing pedidoId" }, { status: 400 });
    }

    const id = parseInt(String(pedidoId), 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "pedidoId no válido" }, { status: 400 });
    }

    // El importe se lee del pedido ya guardado, nunca del body: el navegador no
    // decide cuánto se cobra. `POST /api/pedidos` lo calculó contra la BD.
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: { id: true, totalFinal: true, estadoPago: true },
    });

    if (!pedido) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (pedido.estadoPago === "PAGADO") {
      return NextResponse.json({ error: "Este pedido ya está pagado" }, { status: 409 });
    }

    const total = Number(pedido.totalFinal);
    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: "El importe del pedido no es válido" }, { status: 400 });
    }

    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const { body } = await ordersController.createOrder({
      body: {
        intent: "CAPTURE",
        purchaseUnits: [
          {
            referenceId: String(pedido.id),
            amount: {
              currencyCode: currency,
              value: total.toFixed(2),
            },
          },
        ],
        paymentSource: {
          paypal: {
            experienceContext: {
              returnUrl: `${BASE_URL}/checkout/paypal/retorno?pedidoId=${pedidoId}`,
              cancelUrl: `${BASE_URL}/checkout/pago`,
              userAction: "PAY_NOW",
            },
          },
        },
      } as any,
      prefer: "return=representation",
    });

    const order = typeof body === "string" ? JSON.parse(body) : body;

    if (!order?.id) {
      return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 500 });
    }

    const approvalUrl = (order.links as any[])?.find(
      (l: any) => l.rel === "payer-action" || l.rel === "approve"
    )?.href ?? null;

    return NextResponse.json({ id: order.id, approvalUrl });
  } catch (error) {
    console.error("PayPal create order error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
