import { prisma } from "./prisma";
import {
  buildInvoiceNumber,
  normalizeInvoiceSettings,
  PREFIJO_FACTURA_PRESTASHOP,
} from "./invoiceSettings";

const CONFIG_KEY = "facturas_configuracion";

export async function getInvoiceSettings() {
  const row = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
  return normalizeInvoiceSettings(row?.valor ? JSON.parse(row.valor) : {});
}

async function saveNextSequence(next: number) {
  const row = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
  const current = normalizeInvoiceSettings(row?.valor ? JSON.parse(row.valor) : {});
  current.nextSequence = next;
  await prisma.configuracion.upsert({
    where: { clave: CONFIG_KEY },
    update: { valor: JSON.stringify(current), updatedAt: new Date() },
    create: { clave: CONFIG_KEY, valor: JSON.stringify(current), grupo: "facturas", updatedAt: new Date() },
  });
}

/**
 * Última factura de la serie propia. Las importadas de Prestashop (PS-) llevan
 * su propia numeración y no cuentan para la correlatividad de esta serie.
 */
export async function ultimaFacturaSerie() {
  return prisma.factura.findFirst({
    where: { NOT: { numeroFactura: { startsWith: PREFIJO_FACTURA_PRESTASHOP } } },
    orderBy: { fechaFactura: "desc" },
    select: { fechaFactura: true },
  });
}

/**
 * Fecha de expedición de la factura.
 *
 * Se toma la fecha del pedido, pero nunca anterior a la última factura ya
 * emitida de la serie: si no, al facturar un pedido antiguo después de uno
 * reciente saldría un número mayor con fecha menor, y la numeración dejaría de
 * ser correlativa. En ese caso la factura se expide con la fecha de la última
 * emitida y el PDF sigue mostrando la fecha real del pedido en "Fecha de pedido".
 */
export function resolverFechaFactura(fechaPedido: Date | null, fechaUltima: Date | null): Date {
  const ahora = new Date();
  let fecha = fechaPedido ?? ahora;
  if (fecha > ahora) fecha = ahora;
  if (fechaUltima && fechaUltima > fecha) fecha = fechaUltima;
  return fecha;
}

export async function createFactura(
  pedidoId: number,
  opts: { fecha?: Date } = {},
): Promise<{ facturaId: number; numeroFactura: string; fechaFactura: Date } | null> {
  // Check if factura already exists
  const existing = await prisma.factura.findUnique({ where: { pedidoId } });
  if (existing) {
    return {
      facturaId: existing.id,
      numeroFactura: existing.numeroFactura,
      fechaFactura: existing.fechaFactura,
    };
  }

  // Load pedido
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    select: {
      id: true,
      totalFinal: true,
      subtotal: true,
      descuento: true,
      envioCoste: true,
      fechaPedido: true,
    },
  });
  if (!pedido) return null;

  const settings = await getInvoiceSettings();
  const porcentajeIva = settings.porcentajeIva;

  // Calculate financials — prices stored WITH IVA
  const total = Number(pedido.totalFinal);
  const baseImponible = total / (1 + porcentajeIva / 100);
  const totalIva = total - baseImponible;

  const ultima = await ultimaFacturaSerie();
  const fechaFactura = resolverFechaFactura(
    opts.fecha ?? pedido.fechaPedido ?? null,
    ultima?.fechaFactura ?? null,
  );

  // Determine sequence (reset annually if configured)
  let sequence = settings.nextSequence;
  if (settings.resetAnnually && ultima) {
    // El corte se mide contra el año de la factura que se expide, no contra el de hoy:
    // al regularizar pedidos atrasados la fecha de expedición puede ser de otro año.
    if (new Date(ultima.fechaFactura).getFullYear() < fechaFactura.getFullYear()) {
      sequence = 1;
    }
  }

  // `numeroFactura` es único en BD: si el contador de la configuración se quedó
  // desfasado (emisión manual, script a medias, dos pestañas a la vez) se reintenta
  // con el siguiente número en lugar de reventar y dejar el pedido sin factura.
  const now = new Date();
  let factura = null;
  let numeroFactura = "";

  for (let intento = 0; intento < 50; intento++) {
    numeroFactura = buildInvoiceNumber(settings, sequence, fechaFactura);
    try {
      factura = await prisma.factura.create({
        data: {
          pedidoId,
          numeroFactura,
          fechaFactura,
          baseImponible: Math.round(baseImponible * 100) / 100,
          porcentajeIva,
          totalIva: Math.round(totalIva * 100) / 100,
          total: Math.round(total * 100) / 100,
          pdf_url: null, // se rellena abajo, cuando ya hay id
          updatedAt: now,
        },
      });
      break;
    } catch (err: any) {
      if (err?.code === "P2002") {
        sequence++;
        continue;
      }
      throw err;
    }
  }

  if (!factura) {
    throw new Error(`No se pudo asignar número de factura al pedido ${pedidoId} (último intento: ${numeroFactura})`);
  }

  // Update pdf_url with real ID and save next sequence
  await Promise.all([
    prisma.factura.update({
      where: { id: factura.id },
      data: { pdf_url: `/api/facturas/${factura.id}/pdf` },
    }),
    saveNextSequence(sequence + 1),
  ]);

  return { facturaId: factura.id, numeroFactura, fechaFactura };
}
