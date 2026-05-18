import type { NextRequest } from "next/server";
import { createRedsysAPI, SANDBOX_URLS, PRODUCTION_URLS } from "redsys-easy";
import { prisma } from "@/lib/prisma";
import { normalizePaymentConfig } from "@/lib/paymentSettings";
import { sendTemplateEmail, sendRawEmail, buildAdminOrderEmail, loadEmailSettings } from "@/lib/emailService";

export const dynamic = "force-dynamic";

// Redsys envía la notificación como POST con Content-Type: application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const Ds_SignatureVersion = params.get("Ds_SignatureVersion") ?? "";
    const Ds_MerchantParameters = params.get("Ds_MerchantParameters") ?? "";
    const Ds_Signature = params.get("Ds_Signature") ?? "";

    if (!Ds_MerchantParameters || !Ds_Signature) {
      return new Response("MISSING_PARAMS", { status: 400 });
    }

    // Obtener configuración
    const configuracion = await prisma.configuracion.findUnique({
      where: { clave: "formas_pago_configuracion" },
    });
    const config = normalizePaymentConfig(
      configuracion?.valor ? JSON.parse(configuracion.valor) : {}
    );
    const redsysCfg = config.gateways.redsys;

    const secretKey = process.env.REDSYS_SECRET_KEY || redsysCfg.secretKey;
    const isProduction =
      process.env.REDSYS_ENV === "REAL" || redsysCfg.entorno === "produccion";

    if (!secretKey) {
      return new Response("NOT_CONFIGURED", { status: 400 });
    }

    const { processRedirectNotification } = createRedsysAPI({
      secretKey,
      urls: isProduction ? PRODUCTION_URLS : SANDBOX_URLS,
    });

    const result = processRedirectNotification({
      Ds_SignatureVersion,
      Ds_MerchantParameters,
      Ds_Signature,
    });

    const responseCode = Number(result.Ds_Response);
    // Ds_Order format: {idPadded}{4hexSuffix} — strip last 4 chars to recover pedidoId
    const dsOrder = result.Ds_Order || "";
    const pedidoId = dsOrder.length > 4
      ? parseInt(dsOrder.slice(0, -4), 10)
      : parseInt(dsOrder, 10);

    // Código de respuesta < 100 significa pago autorizado
    if (!isNaN(pedidoId) && responseCode < 100) {
      const pedido = await prisma.pedido.update({
        where: { id: pedidoId },
        data: { estadoPago: "PAGADO", pagoMetodo: "tarjeta" },
        include: { pedidoproducto: true },
      });

      // Enviar emails ahora que el pago está confirmado
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
        }).catch((err: any) => console.error("❌ Email cliente Redsys:", err?.message));
      }

      loadEmailSettings().then((emailSettings: any) => {
        if (!emailSettings.adminEmail) return;
        const datosCliente = { nombre: pedido.nombre, email: pedido.email };
        const htmlAdmin = buildAdminOrderEmail(pedido, datosCliente, { brandName: emailSettings.brandName, appUrl });
        const nombreCliente = `${pedido.nombre || ""} ${(pedido as any).apellidos || ""}`.trim() || "Cliente";
        return sendRawEmail({
          to: emailSettings.adminEmail,
          subject: `[${emailSettings.brandName}] Nuevo pedido (tarjeta): ${pedido.numeroPedido} — ${nombreCliente}`,
          html: htmlAdmin,
        });
      }).catch((err: any) => console.error("❌ Email admin Redsys:", err?.message));
    }

    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("Error en notificación Redsys:", error);
    return new Response("ERROR", { status: 500 });
  }
}
