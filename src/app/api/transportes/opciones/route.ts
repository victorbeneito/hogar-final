import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createDefaultTransportConfig,
  calculateShippingResult,
  normalizeShippingConfig,
  shippingConfigToSerializable,
} from "@/lib/transportes";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "transportes_configuracion";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subtotal = Number(searchParams.get("subtotal") ?? 0);

    const configRow = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
    const rawConfig = configRow?.valor ? JSON.parse(configRow.valor) : createDefaultTransportConfig();
    const config = normalizeShippingConfig(rawConfig);

    const result = calculateShippingResult(config, subtotal, {
      pais: searchParams.get("pais"),
      provincia: searchParams.get("provincia"),
      codigoPostal: searchParams.get("codigoPostal"),
      ciudad: searchParams.get("ciudad"),
    });

    return NextResponse.json({
      ok: result.ok,
      subtotal,
      config: shippingConfigToSerializable(config),
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}