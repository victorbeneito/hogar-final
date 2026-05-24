import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULTS: Record<string, string> = {
  "productos.permitirFueraStock": "false",
  "productos.etiquetaFueraStock": "Fuera de stock",
  "productos.porPagina": "12",
  "productos.ordenarPor": "createdAt",
  "productos.ordenDireccion": "desc",
  "productos.diasNovedad": "20",
};

export async function GET() {
  try {
    const rows = await prisma.configuracion.findMany({ where: { grupo: "productos" } });
    const config: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      config[row.clave] = row.valor ?? "";
    }
    return NextResponse.json({ config });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
        create: { clave, valor: String(valor), grupo: "productos", updatedAt: now },
      });
    }
    const rows = await prisma.configuracion.findMany({ where: { grupo: "productos" } });
    const saved: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) saved[row.clave] = row.valor ?? "";
    return NextResponse.json({ ok: true, config: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
