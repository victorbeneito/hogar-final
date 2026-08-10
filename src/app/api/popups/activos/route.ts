import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizarConfig, popupEnFecha } from "@/lib/popups";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "modulos_integraciones";

/**
 * Endpoint público que consume la tienda.
 * Devuelve SOLO los pop-ups activos y en fecha: nunca el resto de la
 * configuración de módulos (que contiene credenciales de pago).
 */
export async function GET() {
  try {
    const configuracion = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
    const todo = configuracion?.valor ? JSON.parse(configuracion.valor) : {};
    const config = normalizarConfig(todo?.popups);

    if (!config.activa) {
      return NextResponse.json({ ok: true, popups: [] });
    }

    const popups = config.popups.filter((popup) => popup.activo && popup.html.trim() && popupEnFecha(popup));

    return NextResponse.json({ ok: true, popups });
  } catch (error: any) {
    console.error("Error cargando pop-ups:", error?.message ?? error);
    return NextResponse.json({ ok: true, popups: [] });
  }
}
