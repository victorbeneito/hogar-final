import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { cargarEstadosPedido, indexarEstados } from "@/lib/estadoPedido";
import { construirFiltroPedidos, PRESTASHOP_IMPORT_MARKER } from "@/lib/filtroPedidos";

export const dynamic = "force-dynamic";

// ======================================================================
// GET: PEDIDOS CON DETALLE DE PRODUCTOS (CSV)
// ======================================================================
// Una fila por línea de pedido, al estilo de los informes de Amazon o Leroy
// Merlin. Pensado para la declaración de envases de Ecoembes: el envase
// depende de la medida del producto, así que cada fila lleva la medida
// resuelta y separada en ancho y alto.
//
// Acepta los mismos filtros que el listado (/api/pedidos) pero sin paginar:
// exporta todos los pedidos que cumplen el filtro, no sólo la página visible.
//
// Los importes del pedido (envío, total) van sólo en la primera línea de cada
// pedido, para que al sumar la columna en Excel no se cuenten varias veces.
// No se exportan nombre ni email del cliente: para esto no hacen falta.

const ATRIBUTO_MEDIDA = /tama|medida|dimensi/i;
const ETIQUETA_MEDIDA = /(?:tamaño|tamano|medidas?|dimensiones)\s*:\s*(.+?)\s*(?:-\s*[^-:]+\s*:|[|;]|$)/i;
const PATRON_DIMENSIONES = /(\d{2,3}(?:[.,]\d+)?)\s*(?:cm)?\s*[x×X*]\s*(\d{2,3}(?:[.,]\d+)?)/;

type LineaConVariante = {
  nombre: string;
  varianteInfo: string | null;
  variante: {
    tamano: string | null;
    varianteatributo: { atributovalor: { valor: string; atributo: { nombre: string } } }[];
  } | null;
};

/**
 * La medida puede estar en varios sitios según de dónde venga el pedido:
 * la variante del catálogo (pedidos de la tienda nueva), el texto de
 * variante guardado en la línea ("Tamaño : 150x180- Color : Gris") o el
 * propio nombre (pedidos de Prestashop y manuales). Se prueba en ese orden.
 */
function resolverMedida(linea: LineaConVariante): string {
  const tamano = linea.variante?.tamano?.trim();
  if (tamano) return tamano;

  const atributo = linea.variante?.varianteatributo.find((va) =>
    ATRIBUTO_MEDIDA.test(va.atributovalor.atributo.nombre)
  );
  if (atributo?.atributovalor.valor.trim()) return atributo.atributovalor.valor.trim();

  for (const texto of [linea.varianteInfo, linea.nombre]) {
    const etiquetada = texto?.match(ETIQUETA_MEDIDA)?.[1]?.trim();
    if (etiquetada) return etiquetada;
  }
  for (const texto of [linea.varianteInfo, linea.nombre]) {
    const dimensiones = texto?.match(PATRON_DIMENSIONES)?.[0];
    if (dimensiones) return dimensiones.trim();
  }
  return "";
}

/** "150 x 180 cm" → { ancho: 150, alto: 180 }. Los estores se miden ancho × alto. */
function separarMedida(medida: string): { ancho: number | null; alto: number | null } {
  const m = medida.match(PATRON_DIMENSIONES);
  if (!m) return { ancho: null, alto: null };
  return {
    ancho: parseFloat(m[1].replace(",", ".")),
    alto: parseFloat(m[2].replace(",", ".")),
  };
}

const formatoFecha = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// Excel en español espera ";" como separador y coma decimal.
function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? String(Math.round(valor * 100) / 100).replace(".", ",") : "";
  }
  const texto = String(valor);
  return /[";\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const whereClause = construirFiltroPedidos(searchParams);
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const pedidos = await prisma.pedido.findMany({
      where: whereClause,
      select: {
        id: true,
        numeroPedido: true,
        fechaPedido: true,
        estado: true,
        estadoPago: true,
        pais: true,
        provincia: true,
        cp: true,
        envioMetodo: true,
        envioCoste: true,
        totalFinal: true,
        notas: true,
        pedidoproducto: {
          orderBy: { id: "asc" },
          select: {
            nombre: true,
            varianteInfo: true,
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
            producto: { select: { referencia: true } },
            variante: {
              select: {
                referencia: true,
                tamano: true,
                varianteatributo: {
                  select: { atributovalor: { select: { valor: true, atributo: { select: { nombre: true } } } } },
                },
              },
            },
          },
        },
      },
      orderBy: { fechaPedido: sortDir },
    });

    const estadoByKey = indexarEstados(await cargarEstadosPedido());

    const cabecera = [
      "numero_pedido", "id_pedido", "fecha", "estado", "estado_pago", "origen",
      "pais", "provincia", "cp",
      "linea", "producto", "variante", "medida", "ancho_cm", "alto_cm", "sku",
      "cantidad", "precio_unitario", "subtotal_linea",
      "metodo_envio", "precio_envio", "total_pedido",
    ];

    const filas: string[] = [cabecera.join(";")];

    for (const p of pedidos) {
      const nombreEstado = estadoByKey.get((p.estado || "").toLowerCase())?.nombre || p.estado;
      const origen = p.notas?.includes(PRESTASHOP_IMPORT_MARKER) ? "Prestashop" : "Web";
      const comunes = [
        p.numeroPedido, p.id, formatoFecha.format(p.fechaPedido), nombreEstado, p.estadoPago, origen,
        p.pais, p.provincia, p.cp,
      ];

      // Un pedido sin líneas sale igualmente, para que no desaparezca del recuento.
      const lineas = p.pedidoproducto.length > 0 ? p.pedidoproducto : [null];

      lineas.forEach((l, i) => {
        const primera = i === 0;
        const medida = l ? resolverMedida(l) : "";
        const { ancho, alto } = separarMedida(medida);
        const fila = [
          ...comunes,
          l ? i + 1 : "",
          l?.nombre,
          l?.varianteInfo,
          medida,
          ancho,
          alto,
          l ? (l.variante?.referencia || l.producto?.referencia || "") : "",
          l?.cantidad,
          l ? Number(l.precioUnitario) : null,
          l ? Number(l.subtotal) : null,
          primera ? p.envioMetodo : "",
          primera ? Number(p.envioCoste) : null,
          primera ? Number(p.totalFinal) : null,
        ];
        filas.push(fila.map(celda).join(";"));
      });
    }

    // BOM para que Excel abra el UTF-8 con las tildes bien.
    const csv = "﻿" + filas.join("\r\n");
    const hoy = formatoFecha.format(new Date()).slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pedidos-productos-${hoy}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("❌ Error exportando líneas de pedido:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
