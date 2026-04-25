import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getDefaultModulesConfig } from "@/lib/moduleRegistry";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "modulos_integraciones";

const DEFAULT_MODULES = getDefaultModulesConfig();

export async function GET() {
  const configuracion = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
  const config = configuracion?.valor ? JSON.parse(configuracion.valor) : DEFAULT_MODULES;

  return NextResponse.json({
    ok: true,
    config,
    updatedAt: configuracion?.updatedAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const config = body.config ?? body ?? DEFAULT_MODULES;

    await prisma.configuracion.upsert({
      where: { clave: CONFIG_KEY },
      update: {
        valor: JSON.stringify(config),
        grupo: "modulos",
        updatedAt: new Date(),
      },
      create: {
        clave: CONFIG_KEY,
        valor: JSON.stringify(config),
        grupo: "modulos",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, config, adminEmail: admin.email });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}
