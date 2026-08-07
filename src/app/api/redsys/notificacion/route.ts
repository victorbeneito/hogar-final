import type { NextRequest } from "next/server";
import { buildPedidoUrl } from "@/lib/pedidoUrl";
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
      // Buscar dinámicamente el estado para pago aceptado
      const estadosActivos = await prisma.estadopedido.findMany({
        where: { activo: true },
        select: { nombre: true, color: true },
        orderBy: { orden: "asc" },
      });

      const patrones = ["pago", "aceptado"];
      let estadoPagoAceptado = null;
      for (const patron of patrones) {
        estadoPagoAceptado = estadosActivos.find((e: any) =>
          e.nombre.toLowerCase().includes(patron.toLowerCase())
        );
        if (estadoPagoAceptado) break;
      }

      const nombreEstado = estadoPagoAceptado?.nombre ?? "PAGO_ACEPTADO";
      const colorEstado = estadoPagoAceptado?.color ?? "#22c55e";

      const pedido = await prisma.pedido.update({
        where: { id: pedidoId },
        data: { estadoPago: "PAGADO", pagoMetodo: "tarjeta", estado: nombreEstado },
        include: { pedidoproducto: true },
      });

      // Registrar en historial
      try {
        await prisma.historialestadopedido.create({
          data: { pedidoId, estado: nombreEstado, color: colorEstado, fecha: new Date() },
        });
      } catch (err: any) {
        console.warn("⚠️ No se pudo insertar historial Redsys exitoso:", err?.message);
      }

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
            pedidoUrl: await buildPedidoUrl(appUrl, pedido),
          },
        }).catch((err: any) => console.error("❌ Email cliente Redsys:", err?.message));
      }

      loadEmailSettings().then(async (emailSettings: any) => {
        if (!emailSettings.adminEmail) return;
        const datosCliente = { nombre: pedido.nombre, email: pedido.email };

        try {
          // Cargar mensaje del cliente si existe
          const mensajeClienteRecord = await prisma.pedido_mensaje.findFirst({
            where: { pedidoId: pedidoId, autor: "cliente" },
            select: { mensaje: true },
          });

          console.log("📧 Buscando mensaje para pedido", pedidoId, "- Resultado:", mensajeClienteRecord);
          const mensajeCliente = mensajeClienteRecord?.mensaje || null;

          const pedidoConMensaje = { ...pedido, mensajeCliente } as any;
          const htmlAdmin = buildAdminOrderEmail(pedidoConMensaje, datosCliente, { brandName: emailSettings.brandName, appUrl });
          const nombreCliente = `${pedido.nombre || ""} ${(pedido as any).apellidos || ""}`.trim() || "Cliente";
          return sendRawEmail({
            to: emailSettings.adminEmail,
            subject: `[${emailSettings.brandName}] Nuevo pedido (tarjeta): ${pedido.numeroPedido} — ${nombreCliente}`,
            html: htmlAdmin,
          });
        } catch (err: any) {
          console.error("❌ Error buscando mensaje o enviando email Redsys:", err?.message);
        }
      }).catch((err: any) => console.error("❌ Error en loadEmailSettings Redsys:", err?.message));
    } else if (!isNaN(pedidoId) && responseCode >= 100) {
      // Pago rechazado - buscar el estado de error
      const estadosActivos = await prisma.estadopedido.findMany({
        where: { activo: true },
        select: { nombre: true, color: true },
        orderBy: { orden: "asc" },
      });

      const estadoErrorPago = estadosActivos.find((e: any) =>
        e.nombre.toLowerCase().includes("error")
      );
      const nombreEstado = estadoErrorPago?.nombre ?? "Error pago";
      const colorEstado = estadoErrorPago?.color ?? "#ef4444";

      const pedido = await prisma.pedido.update({
        where: { id: pedidoId },
        data: { estadoPago: "FALLIDO", estado: nombreEstado },
        include: { pedidoproducto: true },
      }).catch((err: any) => {
        console.error("❌ Error actualizando pedido rechazado:", err?.message);
        return null;
      });

      // Registrar en historial
      if (pedido) {
        try {
          await prisma.historialestadopedido.create({
            data: { pedidoId, estado: nombreEstado, color: colorEstado, fecha: new Date() },
          });
        } catch (err: any) {
          console.warn("⚠️ No se pudo insertar historial Redsys fallido:", err?.message);
        }
      }

      if (pedido?.email) {
        sendTemplateEmail({
          to: pedido.email,
          templateSlug: "order-placed",
          variables: {
            nombre: pedido.nombre || "Cliente",
            numeroPedido: pedido.numeroPedido,
            total: `${Number(pedido.totalFinal).toFixed(2)} €`,
            pedidoUrl: await buildPedidoUrl(process.env.APP_URL || "https://www.elhogardetusuenos.com", pedido),
          },
        }).catch((err: any) => console.error("❌ Email cliente Redsys fallido:", err?.message));
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("Error en notificación Redsys:", error);
    return new Response("ERROR", { status: 500 });
  }
}
