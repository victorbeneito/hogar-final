import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTemplateEmail, sendRawEmail, buildAdminOrderEmail, loadEmailSettings } from "@/lib/emailService";

export const dynamic = "force-dynamic";

// Fallback llamado desde la página /checkout/redsys/ok cuando el webhook
// server-to-server no llega (ej: entorno local). En producción el webhook
// ya habrá actualizado el pedido antes de que el usuario llegue aquí.
export async function POST(req: NextRequest) {
  try {
    const { pedidoId } = await req.json();

    const id = parseInt(String(pedidoId), 10);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: { id: true, estadoPago: true },
    });

    if (!pedido) {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }

    // Si ya está PAGADO (el webhook llegó primero), no hacemos nada
    if (pedido.estadoPago === "PAGADO") {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }

    // Actualizar a PAGADO y cargar datos para emails
    const pedidoActualizado = await prisma.pedido.update({
      where: { id },
      data: { estadoPago: "PAGADO", pagoMetodo: "tarjeta", estado: "Pago Aceptado", updatedAt: new Date() },
      include: { pedidoproducto: true },
    });

    const appUrl = process.env.APP_URL || "https://www.elhogardetusuenos.com";

    if (pedidoActualizado.email) {
      sendTemplateEmail({
        to: pedidoActualizado.email,
        templateSlug: "order-placed",
        variables: {
          nombre: pedidoActualizado.nombre || "Cliente",
          numeroPedido: pedidoActualizado.numeroPedido,
          total: `${Number(pedidoActualizado.totalFinal).toFixed(2)} €`,
          pedidoUrl: `${appUrl}/account/orders`,
        },
      }).catch((err: any) => console.error("❌ Email cliente OK-fallback:", err?.message));
    }

    loadEmailSettings().then(async (emailSettings: any) => {
      if (!emailSettings.adminEmail) return;
      const datosCliente = { nombre: pedidoActualizado.nombre, email: pedidoActualizado.email };

      try {
        // Cargar mensaje del cliente si existe
        const mensajeClienteRecord = await prisma.pedido_mensaje.findFirst({
          where: { pedidoId: id, autor: "cliente" },
          select: { mensaje: true },
        });

        console.log("📧 Confirmar-OK: Buscando mensaje para pedido", id, "- Resultado:", mensajeClienteRecord);
        const mensajeCliente = mensajeClienteRecord?.mensaje || null;

        const pedidoConMensaje = { ...pedidoActualizado, mensajeCliente } as any;
        const htmlAdmin = buildAdminOrderEmail(pedidoConMensaje, datosCliente, { brandName: emailSettings.brandName, appUrl });
        const nombreCliente = `${pedidoActualizado.nombre || ""} ${(pedidoActualizado as any).apellidos || ""}`.trim() || "Cliente";
        return sendRawEmail({
          to: emailSettings.adminEmail,
          subject: `[${emailSettings.brandName}] Nuevo pedido (tarjeta): ${pedidoActualizado.numeroPedido} — ${nombreCliente}`,
          html: htmlAdmin,
        });
      } catch (err: any) {
        console.error("❌ Error buscando mensaje o enviando email OK-fallback:", err?.message);
      }
    }).catch((err: any) => console.error("❌ Error en loadEmailSettings OK-fallback:", err?.message));

    return NextResponse.json({ ok: true, alreadyPaid: false });
  } catch (error: any) {
    console.error("Error en confirmar-ok:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
