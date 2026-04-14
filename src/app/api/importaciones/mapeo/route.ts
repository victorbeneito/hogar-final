import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

type ImportType =
  | "categorias"
  | "marcas"
  | "proveedores"
  | "atributos"
  | "atributovalores"
  | "clientes"
  | "direcciones"
  | "productos"
  | "combinaciones";

type MappingPayload = Record<string, string>;

type AdminTokenPayload = {
  id?: number | string;
  email?: string;
  rol?: string;
  role?: string;
  exp?: number;
};

function getMappingKey(tipo: ImportType, adminId: number) {
  return `import-map:${tipo}:admin:${adminId}`;
}

function normalizeTipo(value: string | null) {
  return String(value ?? "").trim() as ImportType;
}

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = normalizeTipo(searchParams.get("tipo"));
  const admin = getAdminFromRequest(req);

  if (!tipo) {
    return NextResponse.json({ ok: false, error: "Falta el tipo de importación" }, { status: 400 });
  }

  if (!admin) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const clave = getMappingKey(tipo, admin.adminId);
  const configuracion = await prisma.configuracion.findUnique({ where: { clave } });

  return NextResponse.json({
    ok: true,
    tipo,
    adminId: admin.adminId,
    adminEmail: admin.email,
    mapping: configuracion?.valor ? (JSON.parse(configuracion.valor) as MappingPayload) : {},
    updatedAt: configuracion?.updatedAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tipo = normalizeTipo(body.tipo);
    const mapping = body.mapping ?? {};
    const admin = getAdminFromRequest(req);

    if (!tipo) {
      return NextResponse.json({ ok: false, error: "Falta el tipo de importación" }, { status: 400 });
    }

    if (!admin) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
      return NextResponse.json({ ok: false, error: "El mapeo no es válido" }, { status: 400 });
    }

    const clave = getMappingKey(tipo, admin.adminId);
    const valor = JSON.stringify(mapping);

    await prisma.configuracion.upsert({
      where: { clave },
      update: {
        valor,
        grupo: "importaciones",
        updatedAt: new Date(),
      },
      create: {
        clave,
        valor,
        grupo: "importaciones",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, tipo, adminId: admin.adminId, adminEmail: admin.email, mapping });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}