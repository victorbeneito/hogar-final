import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { getDefaultCmsSettings, normalizeCmsSettings } from "@/lib/cmsConfig";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "cms_paginas";
const DEFAULT_CMS = getDefaultCmsSettings();

function parseStoredConfig(raw: string | null | undefined) {
  if (!raw) return DEFAULT_CMS;

  try {
    return normalizeCmsSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_CMS;
  }
}

export async function GET() {
  const configuracion = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
  const config = parseStoredConfig(configuracion?.valor);

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
    const config = normalizeCmsSettings(body.config ?? body ?? DEFAULT_CMS);

    await prisma.configuracion.upsert({
      where: { clave: CONFIG_KEY },
      update: {
        valor: JSON.stringify(config),
        grupo: "cms",
        updatedAt: new Date(),
      },
      create: {
        clave: CONFIG_KEY,
        valor: JSON.stringify(config),
        grupo: "cms",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, config, adminEmail: admin.email });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}
