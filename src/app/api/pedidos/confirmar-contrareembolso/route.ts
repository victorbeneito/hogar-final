import { NextRequest, NextResponse } from "next/server";
import { buildPedidoUrl } from "@/lib/pedidoUrl";
import { prisma } from "@/lib/prisma";
import { sendTemplateEmail, sendRawEmail, buildAdminOrderEmail, loadEmailSettings } from "@/lib/emailService";
import { getBaseUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

// Llamado desde la página /checkout/pago/contrareembolso cuando el usuario
// pulsa "Confirmar Pedido Definitivamente". Envía los emails de confirmación.
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

    // Buscar dinámicamente el estado para Contrareembolso (patrones: preparaci, procesando)
    const estadosActivos = await prisma.estadopedido.findMany({
      where: { activo: true },
      select: { nombre: true, color: true },
      orderBy: { orden: "asc" },
    });

    const patrones = ["preparaci", "procesando"];
    let estadoContrareembolso = null;
    for (const patron of patrones) {
      estadoContrareembolso = estadosActivos.find((e: any) =>
        e.nombre.toLowerCase().includes(patron.toLowerCase())
      );
      if (estadoContrareembolso) break;
    }

    const nombreEstadoContrareembolso = estadoContrareembolso?.nombre || pedido.estado;
    const colorEstadoContrareembolso = estadoContrareembolso?.color || "#6b7280";

    // Actualizar estado
    const pedidoActualizado = await prisma.pedido.update({
      where: { id },
      data: { estado: nombreEstadoContrareembolso, updatedAt: new Date() },
      include: { pedidoproducto: true },
    });

    // Registrar en historial con el color correcto
    try {
      await prisma.historialestadopedido.create({
        data: { pedidoId: id, estado: nombreEstadoContrareembolso, color: colorEstadoContrareembolso, fecha: new Date() },
      });
    } catch (err: any) {
      console.warn("⚠️ No se pudo insertar historial:", err?.message);
    }

    const appUrl = getBaseUrl();

    if (pedidoActualizado.email) {
      sendTemplateEmail({
        to: pedidoActualizado.email,
        templateSlug: "order-placed",
        variables: {
          nombre: pedidoActualizado.nombre || "Cliente",
          numeroPedido: pedidoActualizado.numeroPedido,
          total: `${Number(pedidoActualizado.totalFinal).toFixed(2)} €`,
          pedidoUrl: await buildPedidoUrl(appUrl, pedidoActualizado),
        },
      }).catch((err: any) => console.error("❌ Email cliente contrareembolso:", err?.message));
    }

    // Enviar email al admin (sin esperar)
    (async () => {
      try {
        console.log("📧 Contrareembolso: Preparando email para pedido", id);
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

        console.log("📧 Contrareembolso: Buscando mensaje para pedido", id, "- Resultado:", mensajeClienteRecord?.mensaje?.substring(0, 50));
        const mensajeCliente = mensajeClienteRecord?.mensaje || null;

        const pedidoConMensaje = { ...pedidoActualizado, mensajeCliente } as any;
        const htmlAdmin = buildAdminOrderEmail(pedidoConMensaje, datosCliente, { brandName: emailSettings.brandName, appUrl });
        const nombreCliente = `${pedidoActualizado.nombre || ""} ${(pedidoActualizado as any).apellidos || ""}`.trim() || "Cliente";

        console.log("📧 Contrareembolso: Enviando email a", emailSettings.adminEmail);
        await sendRawEmail({
          to: emailSettings.adminEmail,
          subject: `[${emailSettings.brandName}] Nuevo pedido (contrareembolso): ${pedidoActualizado.numeroPedido} — ${nombreCliente}`,
          html: htmlAdmin,
        });
        console.log("✅ Email contrareembolso enviado exitosamente");
      } catch (err: any) {
        console.error("❌ Error al enviar email contrareembolso:", err?.message || err);
      }
    })();

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error en confirmar-contrareembolso:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
