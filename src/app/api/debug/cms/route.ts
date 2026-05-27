import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const configuracion = await prisma.configuracion.findUnique({
      where: { clave: "cms_paginas" },
    });

    return NextResponse.json({
      ok: true,
      found: !!configuracion,
      valor_length: configuracion?.valor?.length ?? 0,
      valor_preview: configuracion?.valor?.slice(0, 200) ?? null,
      json_valid: (() => {
        if (!configuracion?.valor) return true;
        try { JSON.parse(configuracion.valor); return true; }
        catch (e) { return String(e); }
      })(),
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      stack: err?.stack?.split("\n").slice(0, 5),
    }, { status: 500 });
  }
}
