import { ordersController } from "@/lib/paypal-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  recalcularLineas,
  resolverEnvioExpress,
  paisDesdeCodigo,
  ErrorCalculoPedido,
} from "@/lib/checkoutPricing";

/**
 * PayPal llama aquí (vía `onShippingAddressChange`) cuando el comprador elige
 * o cambia la dirección de envío dentro del popup. Recalculamos los portes de
 * esa zona y corregimos el importe de la orden, para que el cliente vea el
 * total definitivo antes de pagar.
 *
 * Si no servimos a esa dirección devolvemos 422 y el botón rechaza el cambio.
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, items, direccion, currency = "EUR" } = await req.json();

    if (!orderId) return NextResponse.json({ error: "Falta orderId" }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }

    const lineas = await recalcularLineas(items);
    const subtotal = redondear(lineas.reduce((acc, l) => acc + l.subtotal, 0));

    const envio = await resolverEnvioExpress(subtotal, {
      pais: paisDesdeCodigo(direccion?.countryCode ?? direccion?.country_code),
      provincia: direccion?.adminArea1 ?? direccion?.admin_area_1 ?? null,
      ciudad: direccion?.adminArea2 ?? direccion?.admin_area_2 ?? null,
      codigoPostal: direccion?.postalCode ?? direccion?.postal_code ?? null,
    });

    const total = redondear(subtotal + envio.coste);

    await ordersController.patchOrder({
      id: String(orderId),
      body: [
        {
          op: "replace",
          path: "/purchase_units/@reference_id=='express'/amount",
          value: {
            currency_code: currency,
            value: total.toFixed(2),
            breakdown: {
              item_total: { currency_code: currency, value: subtotal.toFixed(2) },
              shipping: { currency_code: currency, value: envio.coste.toFixed(2) },
            },
          },
        },
      ] as any,
    });

    return NextResponse.json({
      ok: true,
      subtotal,
      envio: envio.coste,
      total,
      metodoEnvio: { id: envio.id, label: envio.label, gratis: envio.gratisAplicado },
    });
  } catch (error) {
    if (error instanceof ErrorCalculoPedido) {
      // 422 = dirección no servible; el botón lo traduce en actions.reject()
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("PayPal express envio:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}

const redondear = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
