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
type NamedPresets = Record<string, MappingPayload>;

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

function getPresetsKey(tipo: ImportType, adminId: number) {
  return `import-map-presets:${tipo}:admin:${adminId}`;
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

    if (!Number.isInteger(adminId) || !["admin", "superadmin"].includes(role)) return null;
    return { adminId, email: decoded.email ?? null };
  } catch {
    return null;
  }
}

async function getPresets(tipo: ImportType, adminId: number): Promise<NamedPresets> {
  const clave = getPresetsKey(tipo, adminId);
  const row = await prisma.configuracion.findUnique({ where: { clave } });
  if (!row?.valor) return {};
  try {
    return JSON.parse(row.valor) as NamedPresets;
  } catch {
    return {};
  }
}

async function savePresets(tipo: ImportType, adminId: number, presets: NamedPresets) {
  const clave = getPresetsKey(tipo, adminId);
  const valor = JSON.stringify(presets);
  await prisma.configuracion.upsert({
    where: { clave },
    update: { valor, grupo: "importaciones", updatedAt: new Date() },
    create: { clave, valor, grupo: "importaciones", updatedAt: new Date() },
  });
}

// GET /api/importaciones/mapeo?tipo=productos          â†’ default mapping + presets list
// GET /api/importaciones/mapeo?tipo=productos&preset=nombre â†’ load a named preset
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = normalizeTipo(searchParams.get("tipo"));
  const presetName = searchParams.get("preset");
  const admin = getAdminFromRequest(req);

  if (!tipo) {
    return NextResponse.json({ ok: false, error: "Falta el tipo de importaciÃ³n" }, { status: 400 });
  }

  if (!admin) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  // Load a specific named preset
  if (presetName) {
    const presets = await getPresets(tipo, admin.adminId);
    const mapping = presets[presetName] ?? null;
    return NextResponse.json({
      ok: true,
      tipo,
      adminId: admin.adminId,
      adminEmail: admin.email,
      presetName,
      mapping: mapping ?? {},
      found: mapping !== null,
    });
  }

  // Load default mapping + list of preset names
  const clave = getMappingKey(tipo, admin.adminId);
  const configuracion = await prisma.configuracion.findUnique({ where: { clave } });
  const presets = await getPresets(tipo, admin.adminId);

  return NextResponse.json({
    ok: true,
    tipo,
    adminId: admin.adminId,
    adminEmail: admin.email,
    mapping: configuracion?.valor ? (JSON.parse(configuracion.valor) as MappingPayload) : {},
    presets: Object.keys(presets),
    updatedAt: configuracion?.updatedAt ?? null,
  });
}

// POST /api/importaciones/mapeo  { tipo, mapping }              â†’ save default mapping
// POST /api/importaciones/mapeo  { tipo, mapping, nombre }      â†’ save named preset
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tipo = normalizeTipo(body.tipo);
    const mapping = body.mapping ?? {};
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const admin = getAdminFromRequest(req);

    if (!tipo) {
      return NextResponse.json({ ok: false, error: "Falta el tipo de importaciÃ³n" }, { status: 400 });
    }

    if (!admin) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
      return NextResponse.json({ ok: false, error: "El mapeo no es vÃ¡lido" }, { status: 400 });
    }

    if (nombre) {
      // Save as named preset
      const presets = await getPresets(tipo, admin.adminId);
      presets[nombre] = mapping;
      await savePresets(tipo, admin.adminId, presets);

      return NextResponse.json({
        ok: true,
        tipo,
        adminId: admin.adminId,
        adminEmail: admin.email,
        nombre,
        mapping,
        presets: Object.keys(presets),
      });
    }

    // Save as default mapping (no name)
    const clave = getMappingKey(tipo, admin.adminId);
    const valor = JSON.stringify(mapping);

    await prisma.configuracion.upsert({
      where: { clave },
      update: { valor, grupo: "importaciones", updatedAt: new Date() },
      create: { clave, valor, grupo: "importaciones", updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, tipo, adminId: admin.adminId, adminEmail: admin.email, mapping });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/importaciones/mapeo?tipo=productos&preset=nombre â†’ delete a named preset
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = normalizeTipo(searchParams.get("tipo"));
  const presetName = searchParams.get("preset");
  const admin = getAdminFromRequest(req);

  if (!tipo || !presetName) {
    return NextResponse.json({ ok: false, error: "Faltan parÃ¡metros" }, { status: 400 });
  }

  if (!admin) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const presets = await getPresets(tipo, admin.adminId);
  if (!(presetName in presets)) {
    return NextResponse.json({ ok: false, error: "Preset no encontrado" }, { status: 404 });
  }

  delete presets[presetName];
  await savePresets(tipo, admin.adminId, presets);

  return NextResponse.json({ ok: true, tipo, presets: Object.keys(presets) });
}
