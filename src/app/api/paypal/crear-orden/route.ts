import { ordersController } from "@/lib/paypal-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { pedidoId, total, currency = "EUR" } = await req.json();

    if (!pedidoId || !total) {
      return NextResponse.json({ error: "Missing pedidoId or total" }, { status: 400 });
    }

    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const { body } = await ordersController.createOrder({
      body: {
        intent: "CAPTURE",
        purchaseUnits: [
          {
            referenceId: String(pedidoId),
            amount: {
              currencyCode: currency,
              value: parseFloat(total).toFixed(2),
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
