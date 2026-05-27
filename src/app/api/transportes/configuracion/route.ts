import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";
import { createDefaultTransportConfig, normalizeShippingConfig, shippingConfigToSerializable } from "@/lib/transportes";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "transportes_configuracion";

export async function GET() {
  const configuracion = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
  const raw = configuracion?.valor ? JSON.parse(configuracion.valor) : null;
  const config = normalizeShippingConfig(raw ?? createDefaultTransportConfig());

  return NextResponse.json({
    ok: true,
    config: shippingConfigToSerializable(config),
    updatedAt: configuracion?.updatedAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso para modificar configuración de transportes" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const config = normalizeShippingConfig(body.config ?? body);

    await prisma.configuracion.upsert({
      where: { clave: CONFIG_KEY },
      update: {
        valor: JSON.stringify(config),
        grupo: "transportes",
        updatedAt: new Date(),
      },
      create: {
        clave: CONFIG_KEY,
        valor: JSON.stringify(config),
        grupo: "transportes",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, config: shippingConfigToSerializable(config) });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
