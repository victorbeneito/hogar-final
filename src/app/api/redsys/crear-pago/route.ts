import { NextRequest, NextResponse } from "next/server";
import { createRedsysAPI, SANDBOX_URLS, PRODUCTION_URLS } from "redsys-easy";
import { prisma } from "@/lib/prisma";
import { normalizePaymentConfig } from "@/lib/paymentSettings";
import { getBaseUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { pedidoId } = await req.json();

    if (!pedidoId) {
      return NextResponse.json({ ok: false, error: "Falta el ID del pedido" }, { status: 400 });
    }

    const id = parseInt(String(pedidoId), 10);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "ID de pedido inválido" }, { status: 400 });
    }

    // Leer el importe SIEMPRE desde la BD — nunca fiarse del valor del cliente
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: { id: true, totalFinal: true, estadoPago: true },
    });

    if (!pedido) {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }

    if (pedido.estadoPago === "PAGADO") {
      return NextResponse.json({ ok: false, error: "Este pedido ya ha sido pagado" }, { status: 400 });
    }

    const totalEuros = Number(pedido.totalFinal);
    if (totalEuros <= 0) {
      return NextResponse.json({ ok: false, error: "El importe del pedido debe ser mayor que 0" }, { status: 400 });
    }

    // Leer config de la BD
    const configuracion = await prisma.configuracion.findUnique({
      where: { clave: "formas_pago_configuracion" },
    });
    const config = normalizePaymentConfig(
      configuracion?.valor ? JSON.parse(configuracion.valor) : {}
    );
    const redsysCfg = config.gateways.redsys;

    // Las variables de entorno tienen prioridad sobre la BD
    const secretKey = process.env.REDSYS_SECRET_KEY || redsysCfg.secretKey;
    const merchantCode = process.env.REDSYS_MERCHANT_CODE || redsysCfg.merchantCode;
    const terminal = process.env.REDSYS_TERMINAL || redsysCfg.terminal;
    const isProduction =
      process.env.REDSYS_ENV === "REAL" || redsysCfg.entorno === "produccion";

    if (!secretKey || !merchantCode || !terminal) {
      return NextResponse.json(
        { ok: false, error: "Redsys no está configurado. Completa los datos en el panel de administración." },
        { status: 400 }
      );
    }

    // Alimenta DS_MERCHANT_MERCHANTURL, el webhook servidor-a-servidor de Redsys.
    // Debe ser el dominio canónico sin www: ese POST no sigue redirecciones, así que
    // un 301 por el medio significa cobro hecho y pedido sin confirmar.
    const baseUrl = getBaseUrl();

    const { createRedirectForm } = createRedsysAPI({
      secretKey,
      urls: isProduction ? PRODUCTION_URLS : SANDBOX_URLS,
    });

    // DS_MERCHANT_ORDER: 4-12 chars alfanuméricos, primeros 4 deben ser dígitos.
    // Añadimos 4 hex chars del timestamp para que cada intento sea único (evita SIS0051).
    // Formato: {idPadded}{4hexSuffix} — el webhook recupera el id quitando los últimos 4 chars.
    const idStr = String(id).padStart(4, "0");
    const suffix = (Date.now() & 0xffff).toString(16).toUpperCase().padStart(4, "0");
    const merchantOrder = (idStr + suffix).slice(0, 12);

    // El importe va en céntimos, sin decimales
    const amountCents = String(Math.round(totalEuros * 100));

    const form = createRedirectForm({
      DS_MERCHANT_MERCHANTCODE: merchantCode,
      DS_MERCHANT_TERMINAL: terminal,
      DS_MERCHANT_ORDER: merchantOrder,
      DS_MERCHANT_AMOUNT: amountCents,
      DS_MERCHANT_CURRENCY: "978", // EUR
      DS_MERCHANT_TRANSACTIONTYPE: "0", // Autorización estándar
      DS_MERCHANT_URLOK: `${baseUrl}/checkout/redsys/ok?pedido=${id}`,
      DS_MERCHANT_URLKO: `${baseUrl}/checkout/redsys/ko?pedido=${id}`,
      DS_MERCHANT_MERCHANTURL: `${baseUrl}/api/redsys/notificacion`,
    });

    return NextResponse.json({ ok: true, action: form.url, body: form.body });
  } catch (error: any) {
    console.error("Error creando pago Redsys:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al generar el pago" },
      { status: 500 }
    );
  }
}
