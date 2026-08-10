import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";
import { DEFAULT_PAYMENT_CONFIG, normalizePaymentConfig, type PaymentCheckoutConfig } from "@/lib/paymentSettings";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "formas_pago_configuracion";

/**
 * El checkout público llama a este endpoint para saber qué formas de pago hay
 * y cuánto recarga el contrareembolso. NO debe ver las credenciales de las
 * pasarelas: con la clave secreta de Redsys se pueden firmar notificaciones de
 * pago falsas. Sólo el admin recibe la configuración completa.
 */
function sinCredenciales(config: PaymentCheckoutConfig): PaymentCheckoutConfig {
  return {
    ...config,
    gateways: {
      redsys: {
        activa: config.gateways.redsys.activa,
        entorno: config.gateways.redsys.entorno,
        merchantCode: "",
        terminal: "",
        merchantName: "",
        secretKey: "",
      },
      paypal: {
        activa: config.gateways.paypal.activa,
        entorno: config.gateways.paypal.entorno,
        // El clientId de PayPal es público por diseño: viaja en el SDK del navegador
        clientId: config.gateways.paypal.clientId,
      },
    },
  };
}

export async function GET(req: NextRequest) {
  const configuracion = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
  const config = normalizePaymentConfig(configuracion?.valor ? JSON.parse(configuracion.valor) : DEFAULT_PAYMENT_CONFIG);

  return NextResponse.json({
    ok: true,
    config: canEdit(req) ? config : sinCredenciales(config),
    updatedAt: configuracion?.updatedAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso para modificar configuración de pagos" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const config = normalizePaymentConfig(body.config ?? body);

    // Red de seguridad: si llega una credencial vacía conservamos la guardada
    // en vez de borrarla. Evita perder la clave de Redsys si el formulario se
    // envía a partir de una lectura censurada.
    const anterior = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
    if (anterior?.valor) {
      const previa = normalizePaymentConfig(JSON.parse(anterior.valor));
      const conservar = <T extends Record<string, any>>(nuevo: T, viejo: T, claves: (keyof T)[]) => {
        for (const k of claves) if (!nuevo[k] && viejo[k]) nuevo[k] = viejo[k];
      };
      conservar(config.gateways.redsys, previa.gateways.redsys, [
        "secretKey",
        "merchantCode",
        "terminal",
        "merchantName",
      ]);
      conservar(config.gateways.paypal, previa.gateways.paypal, ["clientId"]);
    }

    await prisma.configuracion.upsert({
      where: { clave: CONFIG_KEY },
      update: {
        valor: JSON.stringify(config),
        grupo: "pagos",
        updatedAt: new Date(),
      },
      create: {
        clave: CONFIG_KEY,
        valor: JSON.stringify(config),
        grupo: "pagos",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}
