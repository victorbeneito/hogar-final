import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTemplateEmail, sendRawEmail, buildAdminOrderEmail, loadEmailSettings } from "@/lib/emailService";

export const dynamic = "force-dynamic";

// Llamado desde la página /checkout/pago/bizum cuando el usuario
// pulsa "Confirmar Pago Realizado". Envía los emails de confirmación.
export async function POST(req: NextRequest) {
  try {
    const { pedidoId } = await req.json();

    const id = parseInt(String(pedidoId), 10);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: { pedidoproducto: true },
    });

    if (!pedido) {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }

    // Buscar dinámicamente el estado para Bizum
    const estadosActivos = await prisma.estadopedido.findMany({
      where: { activo: true },
      select: { nombre: true, color: true },
      orderBy: { orden: "asc" },
    });

    const estadoBizum = estadosActivos.find((e: any) =>
      e.nombre.toLowerCase().includes("bizum")
    );

    const nombreEstadoBizum = estadoBizum?.nombre || pedido.estado;
    const colorEstadoBizum = estadoBizum?.color || "#6b7280";

    // Actualizar estado
    const pedidoActualizado = await prisma.pedido.update({
      where: { id },
      data: { estado: nombreEstadoBizum, updatedAt: new Date() },
      include: { pedidoproducto: true },
    });

    // Registrar en historial con el color correcto
    try {
      await prisma.historialestadopedido.create({
        data: { pedidoId: id, estado: nombreEstadoBizum, color: colorEstadoBizum, fecha: new Date() },
      });
    } catch (err: any) {
      console.warn("⚠️ No se pudo insertar historial:", err?.message);
    }

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
      }).catch((err: any) => console.error("❌ Email cliente bizum:", err?.message));
    }

    // Enviar email al admin (sin esperar)
    (async () => {
      try {
        console.log("📧 Bizum: Preparando email para pedido", id);
        const emailSettings = await loadEmailSettings();

        if (!emailSettings.adminEmail) {
          console.warn("⚠️ No se configuró email admin");
          return;
        }

        const datosCliente = { nombre: pedidoActualizado.nombre, email: pedidoActualizado.email };

        // Cargar mensaje del cliente si existe
        const mensajeClienteRecord = await prisma.pedido_mensaje.findFirst({
          where: { pedidoId: id, autor: "cliente" },
          select: { mensaje: true },
        });

        console.log("📧 Bizum: Buscando mensaje para pedido", id, "- Resultado:", mensajeClienteRecord?.mensaje?.substring(0, 50));
        const mensajeCliente = mensajeClienteRecord?.mensaje || null;

        const pedidoConMensaje = { ...pedidoActualizado, mensajeCliente } as any;
        const htmlAdmin = buildAdminOrderEmail(pedidoConMensaje, datosCliente, { brandName: emailSettings.brandName, appUrl });
        const nombreCliente = `${pedidoActualizado.nombre || ""} ${(pedidoActualizado as any).apellidos || ""}`.trim() || "Cliente";

        console.log("📧 Bizum: Enviando email a", emailSettings.adminEmail);
        await sendRawEmail({
          to: emailSettings.adminEmail,
          subject: `[${emailSettings.brandName}] Nuevo pedido (bizum): ${pedidoActualizado.numeroPedido} — ${nombreCliente}`,
          html: htmlAdmin,
        });
        console.log("✅ Email bizum enviado exitosamente");
      } catch (err: any) {
        console.error("❌ Error al enviar email bizum:", err?.message || err);
      }
    })();

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error en confirmar-bizum:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
