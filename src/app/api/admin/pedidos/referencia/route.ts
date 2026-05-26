import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper: lee la config de referencia desde la BD
async function getRefSettings() {
  const keys = [
    "pedidos.refPrefijo",
    "pedidos.refSeparador",
    "pedidos.refPadding",
    "pedidos.refIncluirAno",
    "pedidos.refUltimoNumero",
  ];
  const rows = await prisma.configuracion.findMany({ where: { clave: { in: keys } } });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.clave] = r.valor ?? "";

  return {
    prefijo: map["pedidos.refPrefijo"] || "PED",
    separador: map["pedidos.refSeparador"] !== undefined ? map["pedidos.refSeparador"] : "-",
    padding: Math.max(1, parseInt(map["pedidos.refPadding"] || "4")),
    incluirAno: (map["pedidos.refIncluirAno"] ?? "true") !== "false",
    ultimoNumero: map["pedidos.refUltimoNumero"] ? parseInt(map["pedidos.refUltimoNumero"]) : null,
  };
}

// Calcula el prefijo completo para buscar en la BD
function buildFullPrefix(prefijo: string, sep: string, incluirAno: boolean, year: number) {
  return incluirAno ? `${prefijo}${sep}${year}${sep}` : `${prefijo}${sep}`;
}

// Busca la secuencia máxima actual en pedidos con el prefijo configurado
async function getMaxSecuencia(prefijo: string, sep: string, incluirAno: boolean, year: number): Promise<number> {
  const fullPrefix = buildFullPrefix(prefijo, sep, incluirAno, year);
  const rows = await prisma.pedido.findMany({
    where: { numeroPedido: { startsWith: fullPrefix } },
    select: { numeroPedido: true },
  });
  let max = 0;
  for (const r of rows) {
    if (!r.numeroPedido) continue;
    const sufijo = r.numeroPedido.slice(fullPrefix.length);
    const n = parseInt(sufijo, 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return max;
}

// GET — devuelve la secuencia máxima actual y la configuración de formato
export async function GET() {
  try {
    const settings = await getRefSettings();
    const year = new Date().getFullYear();
    const maxSecuencia = await getMaxSecuencia(settings.prefijo, settings.separador, settings.incluirAno, year);

    const fullPrefix = buildFullPrefix(settings.prefijo, settings.separador, settings.incluirAno, year);
    const preview = `${fullPrefix}${String(maxSecuencia + 1).padStart(settings.padding, "0")}`;

    return NextResponse.json({
      settings,
      maxSecuencia,
      proximoNumero: maxSecuencia + 1,
      preview,
      year,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — valida y guarda el override "último número" + ajustes de formato
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const year = new Date().getFullYear();

    // Guardar formato si viene en el body
    const formatKeys: Record<string, string> = {};
    if (body.prefijo !== undefined)    formatKeys["pedidos.refPrefijo"]    = String(body.prefijo);
    if (body.separador !== undefined)  formatKeys["pedidos.refSeparador"]  = String(body.separador);
    if (body.padding !== undefined)    formatKeys["pedidos.refPadding"]    = String(parseInt(body.padding) || 4);
    if (body.incluirAno !== undefined) formatKeys["pedidos.refIncluirAno"] = body.incluirAno ? "true" : "false";

    // Guardar override del último número con validación
    let advertencia: string | null = null;
    if (body.ultimoNumero !== undefined && body.ultimoNumero !== null && body.ultimoNumero !== "") {
      const nuevoUltimo = parseInt(body.ultimoNumero);
      if (isNaN(nuevoUltimo) || nuevoUltimo < 0) {
        return NextResponse.json({ error: "El número debe ser un entero positivo" }, { status: 400 });
      }

      // Obtener config de formato actualizada (puede venir en este mismo POST)
      const prefijo    = body.prefijo    !== undefined ? String(body.prefijo)    : (await getRefSettings()).prefijo;
      const separador  = body.separador  !== undefined ? String(body.separador)  : (await getRefSettings()).separador;
      const incluirAno = body.incluirAno !== undefined ? !!body.incluirAno       : (await getRefSettings()).incluirAno;

      const maxExistente = await getMaxSecuencia(prefijo, separador, incluirAno, year);
      if (nuevoUltimo < maxExistente) {
        advertencia = `Atención: ya existe el pedido ${maxExistente} para este año. Si estableces el contador en ${nuevoUltimo}, los próximos pedidos podrían generar referencias duplicadas con pedidos existentes.`;
      }

      formatKeys["pedidos.refUltimoNumero"] = String(nuevoUltimo);
    } else if (body.ultimoNumero === null || body.ultimoNumero === "") {
      // Borrar el override (vuelve a auto-detección)
      await prisma.configuracion.deleteMany({ where: { clave: "pedidos.refUltimoNumero" } });
    }

    // Persistir claves de formato
    const now = new Date();
    for (const [clave, valor] of Object.entries(formatKeys)) {
      await prisma.configuracion.upsert({
        where: { clave },
        update: { valor, updatedAt: now },
        create: { clave, valor, grupo: "pedidos", updatedAt: now },
      });
    }

    // Recalcular la preview con la nueva configuración
    const settings = await getRefSettings();
    const maxSecuencia = await getMaxSecuencia(settings.prefijo, settings.separador, settings.incluirAno, year);
    const fullPrefix = buildFullPrefix(settings.prefijo, settings.separador, settings.incluirAno, year);
    const nextSeq = Math.max(maxSecuencia + 1, (settings.ultimoNumero ?? 0) + 1);
    const preview = `${fullPrefix}${String(nextSeq).padStart(settings.padding, "0")}`;

    return NextResponse.json({ ok: true, settings, maxSecuencia, proximoNumero: nextSeq, preview, advertencia: advertencia ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
