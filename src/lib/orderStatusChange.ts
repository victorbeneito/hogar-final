import { prisma } from "./prisma";
import { sendTemplateEmail } from "./emailService";
import { sendReviOrder, REVI_SYNC_CUTOFF_DATE } from "./reviService";
import { createFactura, getInvoiceSettings } from "./invoiceGenerator";
import { getBaseUrl } from "./urls";

/**
 * Efectos de un cambio de estado de pedido (historial, emails, factura, Revi).
 *
 * Vive aquí y no dentro del PUT de /api/pedidos/[id] porque el cambio masivo
 * hacía un `updateMany` a secas: los pedidos se quedaban con el estado nuevo en
 * la lista pero sin línea en el historial, sin factura y sin invitación de Revi.
 * Cualquier sitio que cambie el estado de un pedido debe pasar por aquí.
 */

// Campos del pedido previos al cambio que necesitan los efectos posteriores.
export const PEDIDO_PREVIO_SELECT = {
  estado: true,
  email: true,
  nombre: true,
  numeroPedido: true,
  numeroSeguimiento: true,
  trackingUrl: true,
  totalFinal: true,
  fechaPedido: true,
} as const;

export type PedidoPrevio = {
  estado: string;
  email: string | null;
  nombre: string | null;
  numeroPedido: string;
  numeroSeguimiento: string | null;
  trackingUrl: string | null;
  totalFinal: number;
  fechaPedido: Date;
};

// Datos que necesita Revi para crear el pedido y disparar la invitación.
const PEDIDO_REVI_SELECT = {
  numeroPedido: true,
  nombre: true,
  apellidos: true,
  email: true,
  totalFinal: true,
  fechaPedido: true,
  pedidoproducto: {
    select: {
      producto: { select: { id: true, nombre: true, referencia: true } },
    },
  },
} as const;

export async function registrarHistorialEstado(
  pedidoId: number,
  clave: string,
  fecha: Date = new Date(),
) {
  const estadoInfo = await prisma.estadopedido.findUnique({
    where: { clave },
    select: { nombre: true, color: true },
  });

  await prisma.historialestadopedido.create({
    data: {
      pedidoId,
      estado: estadoInfo?.nombre ?? clave,
      color: estadoInfo?.color ?? "#6b7280",
      fecha,
    },
  });
}

export async function enviarPedidoARevi(pedidoId: number, pedidoCompleto?: any) {
  const pedido =
    pedidoCompleto ??
    (await prisma.pedido.findUnique({ where: { id: pedidoId }, select: PEDIDO_REVI_SELECT }));
  if (!pedido) return;

  await sendReviOrder(pedido);
  await prisma.pedido.update({
    where: { id: pedidoId },
    data: { reviInvitadoAt: new Date() },
  });
}

type EfectosCambioEstado = {
  pedidoId: number;
  estado: string;
  pedidoAnterior: PedidoPrevio;
  /** Valores del mismo PUT que aún no están en `pedidoAnterior` (tracking recién guardado, motivo de cancelación…). */
  overrides?: {
    numeroSeguimiento?: string | null;
    trackingUrl?: string | null;
    notas?: string | null;
  };
  /** A false no se avisa al cliente. Se usa al reparar estados antiguos. */
  enviarEmails?: boolean;
  /** Pedido ya cargado con los campos de `PEDIDO_REVI_SELECT`, para no releerlo. */
  pedidoParaRevi?: any;
};

/**
 * Dispara los efectos de un cambio de estado ya persistido. No escribe el
 * historial: eso lo hace `registrarHistorialEstado`, que se llama antes.
 *
 * Los envíos (email, Revi, factura) van sin await a propósito: un fallo de SMTP
 * o de la API de Revi no debe tumbar el guardado del pedido.
 */
export async function aplicarEfectosCambioEstado({
  pedidoId,
  estado,
  pedidoAnterior,
  overrides = {},
  enviarEmails = true,
  pedidoParaRevi,
}: EfectosCambioEstado) {
  const nombre = pedidoAnterior.nombre || "Cliente";
  const numeroPedido = pedidoAnterior.numeroPedido;

  if (enviarEmails && pedidoAnterior.email) {
    const appUrl = getBaseUrl();

    if (estado === "ENVIADO") {
      const trackingNumber =
        overrides.numeroSeguimiento || pedidoAnterior.numeroSeguimiento || "";
      const trackingUrl =
        overrides.trackingUrl ||
        pedidoAnterior.trackingUrl ||
        (trackingNumber
          ? `https://www.ontime.es/seguimiento/?expedicion=${trackingNumber}`
          : `${appUrl}/mis-pedidos`);
      sendTemplateEmail({
        to: pedidoAnterior.email,
        templateSlug: "order-shipped",
        variables: { nombre, numeroPedido, trackingNumber, trackingUrl },
      }).catch((err) => console.error("❌ Email pedido enviado:", err?.message));
    } else if (estado === "CANCELADO") {
      const motivo = overrides.notas ? `Motivo: ${overrides.notas}` : "";
      sendTemplateEmail({
        to: pedidoAnterior.email,
        templateSlug: "order-cancelled",
        variables: { nombre, numeroPedido, motivo },
      }).catch((err) => console.error("❌ Email pedido cancelado:", err?.message));
    }
  }

  // La invitación de reseña no depende de que se avisen cambios por email.
  if (estado === "CUESTIONARIO" && pedidoAnterior.fechaPedido >= REVI_SYNC_CUTOFF_DATE) {
    enviarPedidoARevi(pedidoId, pedidoParaRevi).catch((err) =>
      console.error("[REVI] Error enviando pedido a REVI:", err?.message),
    );
  }

  // Antes esto colgaba del `if (email)` de arriba: un pedido sin email no se facturaba.
  const estadoConfig = await prisma.estadopedido.findUnique({
    where: { clave: estado },
    select: { permitirFacturaPDF: true },
  });
  if (estadoConfig?.permitirFacturaPDF) {
    const settings = await getInvoiceSettings();
    if (settings.active) {
      createFactura(pedidoId).catch((err) =>
        console.error("[FACTURA] Error generando factura:", err?.message),
      );
    }
  }
}
