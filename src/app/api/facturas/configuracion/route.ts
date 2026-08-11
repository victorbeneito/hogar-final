import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";
import { DEFAULT_INVOICE_SETTINGS, normalizeInvoiceSettings } from "@/lib/invoiceSettings";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "facturas_configuracion";

// El bloque `seller` lleva el NIF y la dirección postal del titular: datos personales.
// Este GET estaba abierto y cualquiera podía leerlos con una petición sin autenticar.
// Sólo lo consume el panel (/admin/facturas/configuracion), así que exigir rol no
// rompe nada. La generación de facturas no pasa por aquí: lee la configuración
// directamente de la BD en el servidor.
export async function GET(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso para consultar la configuración de facturas" }, { status: 403 });
  }

  const configuracion = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
  const config = normalizeInvoiceSettings(configuracion?.valor ? JSON.parse(configuracion.valor) : DEFAULT_INVOICE_SETTINGS);

  return NextResponse.json({
    ok: true,
    config,
    updatedAt: configuracion?.updatedAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso para modificar configuración de facturas" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const config = normalizeInvoiceSettings(body.config ?? body);

    await prisma.configuracion.upsert({
      where: { clave: CONFIG_KEY },
      update: {
        valor: JSON.stringify(config),
        grupo: "facturas",
        updatedAt: new Date(),
      },
      create: {
        clave: CONFIG_KEY,
        valor: JSON.stringify(config),
        grupo: "facturas",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}
