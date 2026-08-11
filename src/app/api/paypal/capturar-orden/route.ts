import { ordersController } from "@/lib/paypal-client";
import { buildPedidoUrl } from "@/lib/pedidoUrl";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTemplateEmail, sendRawEmail, buildAdminOrderEmail, loadEmailSettings } from "@/lib/emailService";
import { getBaseUrl } from "@/lib/urls";

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
          where: { id },
          data: { estadoPago: "PAGADO", pagoMetodo: "paypal", estado: nombreEstado, updatedAt: new Date() },
          include: { pedidoproducto: true },
        }).catch((err: Error) => {
          console.error("PayPal: error actualizando estadoPago del pedido:", err.message);
          return null;
        });

        // Registrar en historial
        if (pedido) {
          try {
            await prisma.historialestadopedido.create({
              data: { pedidoId: id, estado: nombreEstado, color: colorEstado, fecha: new Date() },
            });
          } catch (err: any) {
            console.warn("⚠️ No se pudo insertar historial PayPal exitoso:", err?.message);
          }
        }

        if (pedido) {
          const appUrl = getBaseUrl();

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
            }).catch((err: any) => console.error("❌ Email cliente PayPal:", err?.message));
          }

          loadEmailSettings().then(async (emailSettings: any) => {
            if (!emailSettings.adminEmail) return;
            const datosCliente = { nombre: pedido.nombre, email: pedido.email };

            try {
              // Cargar mensaje del cliente si existe
              const mensajeClienteRecord = await prisma.pedido_mensaje.findFirst({
                where: { pedidoId: id, autor: "cliente" },
                select: { mensaje: true },
              });

              console.log("📧 PayPal: Buscando mensaje para pedido", id, "- Resultado:", mensajeClienteRecord);
              const mensajeCliente = mensajeClienteRecord?.mensaje || null;

              const pedidoConMensaje = { ...pedido, mensajeCliente } as any;
              const htmlAdmin = buildAdminOrderEmail(pedidoConMensaje, datosCliente, { brandName: emailSettings.brandName, appUrl });
              const nombreCliente = `${pedido.nombre || ""} ${(pedido as any).apellidos || ""}`.trim() || "Cliente";
              return sendRawEmail({
                to: emailSettings.adminEmail,
                subject: `[${emailSettings.brandName}] Nuevo pedido (PayPal): ${pedido.numeroPedido} — ${nombreCliente}`,
                html: htmlAdmin,
              });
            } catch (err: any) {
              console.error("❌ Error buscando mensaje o enviando email PayPal:", err?.message);
            }
          }).catch((err: any) => console.error("❌ Error en loadEmailSettings PayPal:", err?.message));
        }
      }
    }

    if (result.status !== "COMPLETED") {
      if (resolvedPedidoId) {
        const id = parseInt(String(resolvedPedidoId), 10);
        if (!Number.isNaN(id)) {
          // Buscar dinámicamente el estado de error
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

          const pedidoFallido = await prisma.pedido.update({
            where: { id },
            data: { estadoPago: "FALLIDO", estado: nombreEstado, updatedAt: new Date() },
            include: { pedidoproducto: true },
          }).catch((err: Error) => {
            console.error("PayPal: error actualizando pedido fallido:", err.message);
            return null;
          });

          // Registrar en historial
          if (pedidoFallido) {
            try {
              await prisma.historialestadopedido.create({
                data: { pedidoId: id, estado: nombreEstado, color: colorEstado, fecha: new Date() },
              });
            } catch (err: any) {
              console.warn("⚠️ No se pudo insertar historial PayPal fallido:", err?.message);
            }
          }

          if (pedidoFallido?.email) {
            sendTemplateEmail({
              to: pedidoFallido.email,
              templateSlug: "order-placed",
              variables: {
                nombre: pedidoFallido.nombre || "Cliente",
                numeroPedido: pedidoFallido.numeroPedido,
                total: `${Number(pedidoFallido.totalFinal).toFixed(2)} €`,
                pedidoUrl: await buildPedidoUrl(getBaseUrl(), pedidoFallido),
              },
            }).catch((err: any) => console.error("❌ Email cliente PayPal fallido:", err?.message));
          }
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
