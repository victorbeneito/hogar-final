import { NextRequest, NextResponse } from "next/server";
import { canEdit } from "@/lib/adminAuth";
import { regularizarPedidos, type PasosRegularizacion } from "@/lib/regularizarPedidos";

export const dynamic = "force-dynamic";
// Emitir ~50 facturas y hablar con la API de Revi no cabe en el tiempo por defecto.
export const maxDuration = 300;

/** El paso que escribe exige escribir esto a mano: no se dispara por un clic accidental. */
const CONFIRMACION = "REGULARIZAR";

function leerPasos(input: any): PasosRegularizacion {
  const p = input && typeof input === "object" ? input : {};
  // Sin selección explícita, los tres.
  if (p.historial === undefined && p.facturas === undefined && p.revi === undefined) {
    return { historial: true, facturas: true, revi: true };
  }
  return {
    historial: p.historial === true,
    facturas: p.facturas === true,
    revi: p.revi === true,
  };
}

function leerFecha(valor: any): Date | undefined {
  if (!valor) return undefined;
  const d = new Date(String(valor));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// GET — simulacro. No escribe nada.
export async function GET(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const reporte = await regularizarPedidos({
      aplicar: false,
      pasos: leerPasos({
        historial: searchParams.get("historial") === "true" || !searchParams.has("historial"),
        facturas: searchParams.get("facturas") === "true" || !searchParams.has("facturas"),
        revi: searchParams.get("revi") === "true" || !searchParams.has("revi"),
      }),
      desde: leerFecha(searchParams.get("desde")),
      hasta: leerFecha(searchParams.get("hasta")) ?? null,
    });
    return NextResponse.json({ ok: true, reporte });
  } catch (error: any) {
    console.error("[GET /api/admin/regularizar-pedidos]", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error de servidor" }, { status: 500 });
  }
}

// POST — aplica de verdad. Requiere confirmación explícita en el cuerpo.
export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (body?.confirmacion !== CONFIRMACION) {
      return NextResponse.json(
        { ok: false, error: `Falta la confirmación: envía { "confirmacion": "${CONFIRMACION}" }` },
        { status: 400 },
      );
    }

    const reporte = await regularizarPedidos({
      aplicar: true,
      pasos: leerPasos(body?.pasos),
      desde: leerFecha(body?.desde),
      hasta: leerFecha(body?.hasta) ?? null,
    });
    return NextResponse.json({ ok: true, reporte });
  } catch (error: any) {
    console.error("[POST /api/admin/regularizar-pedidos]", error);
    return NextResponse.json({ ok: false, error: error?.message || "Error de servidor" }, { status: 500 });
  }
}
