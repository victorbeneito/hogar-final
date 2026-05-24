import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { DEFAULT_EMAIL_SETTINGS, normalizeEmailSettings } from "@/lib/emailConfig";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "correos_configuracion";

export async function GET() {
  const configuracion = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
  const config = normalizeEmailSettings(configuracion?.valor ? JSON.parse(configuracion.valor) : DEFAULT_EMAIL_SETTINGS);

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
    const config = normalizeEmailSettings(body.config ?? body);

    await prisma.configuracion.upsert({
      where: { clave: CONFIG_KEY },
      update: {
        valor: JSON.stringify(config),
        grupo: "correos",
        updatedAt: new Date(),
      },
      create: {
        clave: CONFIG_KEY,
        valor: JSON.stringify(config),
        grupo: "correos",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, config, adminEmail: admin.email });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}
