import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";
import { DEFAULT_PAYMENT_CONFIG, normalizePaymentConfig } from "@/lib/paymentSettings";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "formas_pago_configuracion";

export async function GET() {
  const configuracion = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
  const config = normalizePaymentConfig(configuracion?.valor ? JSON.parse(configuracion.valor) : DEFAULT_PAYMENT_CONFIG);

  return NextResponse.json({
    ok: true,
    config,
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
