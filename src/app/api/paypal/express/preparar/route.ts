import { ordersController } from "@/lib/paypal-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  recalcularLineas,
  resolverEnvioExpress,
  direccionDesdePaypal,
  ErrorCalculoPedido,
} from "@/lib/checkoutPricing";

/**
 * Se llama en `onApprove`, DESPUÉS de que el comprador apruebe el pago pero
 * ANTES de cobrarlo. Aquí ya tenemos su email y su dirección de envío, que es
 * justo lo que el express se ahorra pedirle.
 *
 * Pasos:
 *  1. Leer de PayPal la dirección y el pagador.
 *  2. Crear el pedido reutilizando `POST /api/pedidos` (compra como invitado),
 *     que recalcula todos los importes contra la BD.
 *  3. Si el total del pedido no coincide con el de la orden, corregir la orden
 *     antes de cobrar: nunca se cobra un importe distinto al del pedido.
 *
 * El cobro y el envío de correos los hace después `/api/paypal/capturar-orden`,
 * el mismo endpoint que usa el checkout normal.
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, items, currency = "EUR" } = await req.json();

    if (!orderId) return NextResponse.json({ error: "Falta orderId" }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }

    // 1. Datos del comprador según PayPal
    const { body } = await ordersController.getOrder({ id: String(orderId) });
    const order = typeof body === "string" ? JSON.parse(body) : body;

    const unidad = order?.purchase_units?.[0] ?? order?.purchaseUnits?.[0] ?? {};
    const shipping = unidad.shipping ?? {};
    const payer = order?.payer ?? {};

    const email = String(payer.email_address ?? payer.emailAddress ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "PayPal no devolvió el email del comprador" },
        { status: 422 }
      );
    }

    const direccion = direccionDesdePaypal(shipping);
    if (!direccion.provincia && !direccion.codigoPostal) {
      return NextResponse.json(
        { error: "PayPal no devolvió una dirección de envío completa. Usa el proceso de compra normal." },
        { status: 422 }
      );
    }

    // Nombre: el de la dirección de envío manda sobre el del perfil
    const nombreCompleto = String(
      shipping.name?.full_name ?? shipping.name?.fullName ?? ""
    ).trim();
    const nombrePerfil = [payer.name?.given_name ?? payer.name?.givenName, payer.name?.surname]
      .filter(Boolean)
      .join(" ")
      .trim();
    const partes = (nombreCompleto || nombrePerfil || "Cliente").split(/\s+/);
    const nombre = partes[0];
    const apellidos = partes.slice(1).join(" ");

    const dir = shipping.address ?? {};

    // 2. Método de envío que corresponde a esa dirección
    const lineas = await recalcularLineas(items);
    const subtotal = redondear(lineas.reduce((acc, l) => acc + l.subtotal, 0));
    const envio = await resolverEnvioExpress(subtotal, direccion);

    // 3. Crear el pedido con el flujo normal (invitado)
    const BASE_URL =
      process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || "http://localhost:3000";

    const resPedido = await fetch(`${BASE_URL}/api/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitado: true,
        origen: "paypal-express",
        carrito: items,
        notas: "Pedido realizado con PayPal Express desde el carrito.",
        cliente: {
          nombre,
          apellidos,
          email,
          telefono: "",
          direccion: [dir.address_line_1 ?? dir.addressLine1, dir.address_line_2 ?? dir.addressLine2]
            .filter(Boolean)
            .join(", "),
          ciudad: direccion.ciudad ?? "",
          provincia: direccion.provincia ?? "",
          codigoPostal: direccion.codigoPostal ?? "",
          pais: direccion.pais ?? "España",
        },
        metodoPago: { metodo: "paypal" },
        metodoEnvio: { metodo: envio.metodo, id: envio.id, label: envio.label, coste: envio.coste },
      }),
    });

    const dataPedido = await resPedido.json();
    if (!resPedido.ok || !dataPedido?.ok) {
      return NextResponse.json(
        { error: dataPedido?.error || "No se pudo registrar el pedido" },
        { status: resPedido.status === 200 ? 500 : resPedido.status }
      );
    }

    const pedido = dataPedido.pedido;
    const totalPedido = redondear(Number(pedido.totalFinal));

    // 4. Alinear el importe de PayPal con el del pedido antes de cobrar
    const totalOrden = Number(unidad.amount?.value ?? 0);
    if (Math.abs(totalOrden - totalPedido) > 0.01) {
      await ordersController.patchOrder({
        id: String(orderId),
        body: [
          {
            op: "replace",
            path: "/purchase_units/@reference_id=='express'/amount",
            value: {
              currency_code: currency,
              value: totalPedido.toFixed(2),
              breakdown: {
                item_total: { currency_code: currency, value: subtotal.toFixed(2) },
                shipping: {
                  currency_code: currency,
                  value: redondear(totalPedido - subtotal).toFixed(2),
                },
              },
            },
          },
        ] as any,
      });
      console.warn(
        `PayPal express: importe corregido de ${totalOrden.toFixed(2)} € a ${totalPedido.toFixed(2)} € (pedido ${pedido.numeroPedido}).`
      );
    }

    return NextResponse.json({
      ok: true,
      pedidoId: pedido.id,
      numeroPedido: pedido.numeroPedido,
      total: totalPedido,
    });
  } catch (error) {
    if (error instanceof ErrorCalculoPedido) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PayPal express preparar:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}

const redondear = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
