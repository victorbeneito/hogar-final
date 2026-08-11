import { ordersController } from "@/lib/paypal-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  recalcularLineas,
  resolverEnvioExpressPorDefecto,
  ErrorCalculoPedido,
} from "@/lib/checkoutPricing";
import { getBaseUrl } from "@/lib/urls";

/**
 * Checkout express: crea la orden de PayPal directamente desde el carrito, sin
 * que el cliente pase por identificación, direcciones ni envío.
 *
 * El pedido todavía NO existe en la BD: se crea en `express/preparar`, cuando
 * PayPal ya nos ha dado la dirección del comprador. Aquí sólo necesitamos un
 * importe de partida, que se corrige si la dirección real cambia los portes.
 *
 * Como en el resto del checkout, los precios salen de la BD: del navegador sólo
 * aceptamos qué productos y en qué cantidad.
 */
export async function POST(req: NextRequest) {
  try {
    const { items, currency = "EUR" } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }

    const lineas = await recalcularLineas(items);
    const subtotal = redondear(lineas.reduce((acc, l) => acc + l.subtotal, 0));

    // Sin dirección todavía: partimos de la zona más habitual. Si el comprador
    // elige otra en el popup, `express/envio` recalcula y corrige la orden.
    const envio = await resolverEnvioExpressPorDefecto(subtotal);
    const total = redondear(subtotal + envio.coste);

    const BASE_URL = getBaseUrl();

    const { body } = await ordersController.createOrder({
      body: {
        intent: "CAPTURE",
        purchaseUnits: [
          {
            referenceId: "express",
            description: "Pedido en El Hogar de tus Sueños",
            amount: {
              currencyCode: currency,
              value: total.toFixed(2),
              breakdown: {
                itemTotal: { currencyCode: currency, value: subtotal.toFixed(2) },
                shipping: { currencyCode: currency, value: envio.coste.toFixed(2) },
              },
            },
            items: lineas.map((l) => ({
              name: l.nombre.slice(0, 127),
              quantity: String(l.cantidad),
              unitAmount: { currencyCode: currency, value: l.precioUnitario.toFixed(2) },
            })),
          },
        ],
        paymentSource: {
          paypal: {
            experienceContext: {
              // Que PayPal pida/muestre la dirección de envío del comprador
              shippingPreference: "GET_FROM_FILE",
              userAction: "PAY_NOW",
              returnUrl: `${BASE_URL}/carrito`,
              cancelUrl: `${BASE_URL}/carrito`,
            },
          },
        },
      } as any,
      prefer: "return=representation",
    });

    const order = typeof body === "string" ? JSON.parse(body) : body;
    if (!order?.id) {
      return NextResponse.json({ error: "PayPal no devolvió la orden" }, { status: 502 });
    }

    return NextResponse.json({ id: order.id, subtotal, envio: envio.coste, total });
  } catch (error) {
    if (error instanceof ErrorCalculoPedido) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PayPal express crear-orden:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}

const redondear = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
