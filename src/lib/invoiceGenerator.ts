import { prisma } from "./prisma";
import {
  buildInvoiceNumber,
  normalizeInvoiceSettings,
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

export async function createFactura(
  pedidoId: number,
): Promise<{ facturaId: number; numeroFactura: string } | null> {
  // Check if factura already exists
  const existing = await prisma.factura.findUnique({ where: { pedidoId } });
  if (existing) return { facturaId: existing.id, numeroFactura: existing.numeroFactura };

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

  // Determine sequence (reset annually if configured)
  const now = new Date();
  const currentYear = now.getFullYear();
  let sequence = settings.nextSequence;

  if (settings.resetAnnually) {
    const lastFactura = await prisma.factura.findFirst({
      orderBy: { fechaFactura: "desc" },
      select: { fechaFactura: true, numeroFactura: true },
    });
    if (lastFactura && new Date(lastFactura.fechaFactura).getFullYear() < currentYear) {
      sequence = 1;
    }
  }

  const numeroFactura = buildInvoiceNumber(settings, sequence, now);

  // Create factura record
  const factura = await prisma.factura.create({
    data: {
      pedidoId,
      numeroFactura,
      fechaFactura: now,
      baseImponible: Math.round(baseImponible * 100) / 100,
      porcentajeIva,
      totalIva: Math.round(totalIva * 100) / 100,
      total: Math.round(total * 100) / 100,
      pdf_url: `/api/facturas/${0}/pdf`, // placeholder, updated below
      updatedAt: now,
    },
  });

  // Update pdf_url with real ID and save next sequence
  await Promise.all([
    prisma.factura.update({
      where: { id: factura.id },
      data: { pdf_url: `/api/facturas/${factura.id}/pdf` },
    }),
    saveNextSequence(sequence + 1),
  ]);

  return { facturaId: factura.id, numeroFactura };
}
