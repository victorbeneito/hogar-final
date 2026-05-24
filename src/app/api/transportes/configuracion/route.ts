import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { createDefaultTransportConfig, normalizeShippingConfig, shippingConfigToSerializable } from "@/lib/transportes";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "transportes_configuracion";

type AdminTokenPayload = {
  id?: number | string;
  email?: string;
  rol?: string;
  role?: string;
};

function getAdminSecret() {
  return process.env.SECRETO_JWT_ADMIN || "palabra_secreta_emergencia_2026";
}

function getAdminFromRequest(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value || req.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getAdminSecret()) as AdminTokenPayload;
    const adminId = Number(decoded.id);
    const role = String(decoded.rol ?? decoded.role ?? "").toLowerCase();

    if (!Number.isInteger(adminId) || role !== "admin") return null;
    return { adminId, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

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
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

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

    return NextResponse.json({ ok: true, config: shippingConfigToSerializable(config), adminEmail: admin.email });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}