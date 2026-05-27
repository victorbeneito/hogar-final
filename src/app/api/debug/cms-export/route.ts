import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const configuracion = await prisma.configuracion.findUnique({
    where: { clave: "cms_paginas" },
  });

  return NextResponse.json({
    clave: "cms_paginas",
    valor: configuracion?.valor ?? null,
  });
}
