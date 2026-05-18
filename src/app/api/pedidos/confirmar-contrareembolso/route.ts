import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTemplateEmail, sendRawEmail, buildAdminOrderEmail, loadEmailSettings } from "@/lib/emailService";

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
      }).catch((err: any) => console.error("❌ Email cliente contrareembolso:", err?.message));
    }

    loadEmailSettings().then((emailSettings: any) => {
      if (!emailSettings.adminEmail) return;
      const datosCliente = { nombre: pedido.nombre, email: pedido.email };
      const htmlAdmin = buildAdminOrderEmail(pedido, datosCliente, { brandName: emailSettings.brandName, appUrl });
      const nombreCliente = `${pedido.nombre || ""} ${(pedido as any).apellidos || ""}`.trim() || "Cliente";
      return sendRawEmail({
        to: emailSettings.adminEmail,
        subject: `[${emailSettings.brandName}] Nuevo pedido (contrareembolso): ${pedido.numeroPedido} — ${nombreCliente}`,
        html: htmlAdmin,
      });
    }).catch((err: any) => console.error("❌ Email admin contrareembolso:", err?.message));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error en confirmar-contrareembolso:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
