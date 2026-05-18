import { ordersController } from "@/lib/paypal-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTemplateEmail, sendRawEmail, buildAdminOrderEmail, loadEmailSettings } from "@/lib/emailService";

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
        const pedido = await prisma.pedido.update({
          where: { id },
          data: { estadoPago: "PAGADO", pagoMetodo: "paypal", updatedAt: new Date() },
          include: { pedidoproducto: true },
        }).catch((err: Error) => {
          console.error("PayPal: error actualizando estadoPago del pedido:", err.message);
          return null;
        });

        if (pedido) {
          const appUrl = process.env.APP_URL || "https://www.elhogardetusuenos.com";

          if (pedido.email) {
            sendTemplateEmail({
              to: pedido.email,
              templateSlug: "order-placed",
              variables: {
                nombre: pedido.nombre || "Cliente",
                numeroPedido: pedido.numeroPedido,
                total: `${Number(pedido.totalFinal).toFixed(2)} €`,
                pedidoUrl: `${appUrl}/account/orders`,
              },
            }).catch((err: any) => console.error("❌ Email cliente PayPal:", err?.message));
          }

          loadEmailSettings().then((emailSettings: any) => {
            if (!emailSettings.adminEmail) return;
            const datosCliente = { nombre: pedido.nombre, email: pedido.email };
            const htmlAdmin = buildAdminOrderEmail(pedido, datosCliente, { brandName: emailSettings.brandName, appUrl });
            const nombreCliente = `${pedido.nombre || ""} ${(pedido as any).apellidos || ""}`.trim() || "Cliente";
            return sendRawEmail({
              to: emailSettings.adminEmail,
              subject: `[${emailSettings.brandName}] Nuevo pedido (PayPal): ${pedido.numeroPedido} — ${nombreCliente}`,
              html: htmlAdmin,
            });
          }).catch((err: any) => console.error("❌ Email admin PayPal:", err?.message));
        }
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
