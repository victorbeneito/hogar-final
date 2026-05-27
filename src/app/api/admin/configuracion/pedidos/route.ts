import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const DEFAULTS: Record<string, string> = {
  "pedidos.montoMinimo": "0",
  "pedidos.pedidoExpresoInvitado": "true",
  "pedidos.terminosServicio": "false",
  "pedidos.terminosPaginaSlug": "",
  "pedidos.resumenFinal": "false",
  "pedidos.envioAplazado": "false",
  "pedidos.volverAPedir": "true",
  "pedidos.recalcularEnvio": "true",
  "pedidos.enviarRegalo": "false",
  "pedidos.precioEmbalaje": "0",
  "pedidos.embalajeReciclado": "false",
};

export async function GET() {
  try {
    const rows = await prisma.configuracion.findMany({ where: { grupo: "pedidos" } });
    const config: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      config[row.clave] = row.valor ?? "";
    }
    return NextResponse.json({ config });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ error: "Sin permiso para modificar configuración de pedidos" }, { status: 403 });
  }
  try {
    const { config } = await req.json();
    if (!config || typeof config !== "object") {
      return NextResponse.json({ error: "config requerido" }, { status: 400 });
    }
    const now = new Date();
    for (const [clave, valor] of Object.entries(config)) {
      await prisma.configuracion.upsert({
        where: { clave },
        update: { valor: String(valor), updatedAt: now },
        create: { clave, valor: String(valor), grupo: "pedidos", updatedAt: now },
      });
    }
    const rows = await prisma.configuracion.findMany({ where: { grupo: "pedidos" } });
    const saved: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) saved[row.clave] = row.valor ?? "";
    return NextResponse.json({ ok: true, config: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
