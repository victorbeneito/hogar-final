import { prisma } from "./prisma";
import { sendTemplateEmail } from "./emailService";
import { sendReviOrder, REVI_SYNC_CUTOFF_DATE } from "./reviService";
import { createFactura, getInvoiceSettings } from "./invoiceGenerator";
import { renderFacturaPdfDePedido } from "./facturaPdf";
import { getBaseUrl } from "./urls";
import {
  cargarEstadoPedido,
  resolverPlantillaEmail,
  type EstadoPedidoFlags,
} from "./estadoPedido";
import type { EmailTemplateSlug } from "./emailConfig";

/**
 * Efectos de un cambio de estado de pedido: historial, banderas del estado
 * (pagado / enviado / entregado), correo al cliente, factura y Revi.
 *
 * Vive aquí y no dentro del PUT de /api/pedidos/[id] porque el cambio masivo
 * hacía un `updateMany` a secas: los pedidos se quedaban con el estado nuevo en
 * la lista pero sin línea en el historial, sin factura y sin invitación de Revi.
 * Cualquier sitio que cambie el estado de un pedido debe pasar por aquí,
 * incluidas las confirmaciones de pago (Redsys, PayPal, Bizum, transferencia y
 * contrareembolso).
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
  fechaEnvio: true,
  fechaEntrega: true,
  estadoPago: true,
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
  fechaEnvio: Date | null;
  fechaEntrega: Date | null;
  estadoPago: string;
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

/**
 * Aplica las banderas del estado sobre el propio pedido: "Establecer el pedido
 * como pagado / enviado" y "Marcar como entregado". Solo rellena lo que falta,
 * nunca pisa una fecha ya puesta a mano.
 */
async function aplicarBanderasDeEstado(
  pedidoId: number,
  estado: EstadoPedidoFlags,
  pedidoAnterior: PedidoPrevio,
  ahora: Date,
) {
  const data: Record<string, any> = {};

  if (estado.establecerPagado && pedidoAnterior.estadoPago !== "PAGADO") {
    data.estadoPago = "PAGADO";
  }
  if (estado.establecerEnviado && !pedidoAnterior.fechaEnvio) {
    data.fechaEnvio = ahora;
  }
  if (estado.esEntrega && !pedidoAnterior.fechaEntrega) {
    data.fechaEntrega = ahora;
  }

  if (Object.keys(data).length === 0) return;

  data.updatedAt = ahora;
  await prisma.pedido.update({ where: { id: pedidoId }, data });
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
  /** A false no se avisa al cliente aunque el estado lo tenga marcado. Se usa al reparar estados antiguos. */
  enviarEmails?: boolean;
  /** Pedido ya cargado con los campos de `PEDIDO_REVI_SELECT`, para no releerlo. */
  pedidoParaRevi?: any;
};

/**
 * Dispara los efectos de un cambio de estado ya persistido. No escribe el
 * historial: eso lo hace `registrarHistorialEstado`, que se llama antes.
 *
 * El correo y Revi van sin await a propósito: un fallo de SMTP o de la API de
 * Revi no debe tumbar el guardado del pedido. La factura sí se espera cuando
 * hay que adjuntarla al correo, porque si no llegaría sin adjunto.
 */
export async function aplicarEfectosCambioEstado({
  pedidoId,
  estado: clave,
  pedidoAnterior,
  overrides = {},
  enviarEmails = true,
  pedidoParaRevi,
}: EfectosCambioEstado) {
  const estado = await cargarEstadoPedido(clave);
  const ahora = new Date();

  if (estado) {
    await aplicarBanderasDeEstado(pedidoId, estado, pedidoAnterior, ahora);
  }

  // ── Factura ───────────────────────────────────────────────────────────────
  // Antes esto colgaba de un `if (email)`: un pedido sin correo no se facturaba.
  let facturaLista = false;
  if (estado?.permitirFacturaPDF) {
    const settings = await getInvoiceSettings();
    if (settings.active) {
      if (estado.adjuntarFacturaPDF) {
        // Se espera: el correo de abajo necesita el PDF ya emitido.
        try {
          facturaLista = Boolean(await createFactura(pedidoId));
        } catch (err: any) {
          console.error("[FACTURA] Error generando factura:", err?.message);
        }
      } else {
        createFactura(pedidoId).catch((err) =>
          console.error("[FACTURA] Error generando factura:", err?.message),
        );
      }
    }
  }

  // ── Correo al cliente ─────────────────────────────────────────────────────
  if (enviarEmails && estado?.enviarEmail && pedidoAnterior.email) {
    const plantilla = resolverPlantillaEmail(estado);
    if (!plantilla) {
      console.warn(
        `[EMAIL] El estado ${clave} tiene el aviso al cliente activado pero no hay plantilla asignada.`,
      );
    } else {
      enviarCorreoDeEstado({
        plantilla,
        estado,
        pedidoId,
        pedidoAnterior,
        overrides,
        adjuntarFactura: estado.adjuntarFacturaPDF && facturaLista,
      }).catch((err) => console.error("❌ Email cambio de estado:", err?.message));
    }
  }

  // ── Invitación de reseña ──────────────────────────────────────────────────
  // No depende de que el estado avise por correo: es un envío distinto.
  // Se compara contra la clave resuelta, porque a esta función puede llegar
  // tanto la clave como el nombre del estado.
  const claveReal = estado?.clave ?? clave;
  if (claveReal === "CUESTIONARIO" && pedidoAnterior.fechaPedido >= REVI_SYNC_CUTOFF_DATE) {
    enviarPedidoARevi(pedidoId, pedidoParaRevi).catch((err) =>
      console.error("[REVI] Error enviando pedido a REVI:", err?.message),
    );
  }
}

/**
 * Igual que `aplicarEfectosCambioEstado` pero releyendo el pedido, para los
 * flujos que ya han guardado el estado nuevo por su cuenta (las confirmaciones
 * de pago). Se les pasa `enviarEmails: false` porque ya mandan su propio aviso;
 * lo que necesitan de aquí son las banderas del estado y la factura.
 */
export async function aplicarEfectosCambioEstadoPorId(
  pedidoId: number,
  estado: string,
  opts: { enviarEmails?: boolean } = {},
) {
  const pedidoAnterior = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    select: PEDIDO_PREVIO_SELECT,
  });
  if (!pedidoAnterior) return;

  await aplicarEfectosCambioEstado({
    pedidoId,
    estado,
    pedidoAnterior,
    enviarEmails: opts.enviarEmails ?? false,
  });
}

async function enviarCorreoDeEstado(opts: {
  plantilla: EmailTemplateSlug;
  estado: EstadoPedidoFlags;
  pedidoId: number;
  pedidoAnterior: PedidoPrevio;
  overrides: { numeroSeguimiento?: string | null; trackingUrl?: string | null; notas?: string | null };
  adjuntarFactura: boolean;
}) {
  const { plantilla, estado, pedidoId, pedidoAnterior, overrides, adjuntarFactura } = opts;
  const appUrl = getBaseUrl();
  const trackingNumber = overrides.numeroSeguimiento || pedidoAnterior.numeroSeguimiento || "";
  const trackingUrl =
    overrides.trackingUrl ||
    pedidoAnterior.trackingUrl ||
    (trackingNumber
      ? `https://www.ontime.es/seguimiento/?expedicion=${trackingNumber}`
      : `${appUrl}/mis-pedidos`);

  // Se pasan todas las variables de todas las plantillas de pedido: cualquier
  // estado puede tener asignada cualquiera de ellas, y las que no se usen se
  // quedan sin sustituir sin romper nada.
  const variables = {
    nombre: pedidoAnterior.nombre || "Cliente",
    numeroPedido: pedidoAnterior.numeroPedido,
    total: Number(pedidoAnterior.totalFinal).toFixed(2),
    estado: estado.nombre,
    trackingNumber,
    trackingUrl,
    motivo: overrides.notas ? `Motivo: ${overrides.notas}` : "",
    pedidoUrl: `${appUrl}/mis-pedidos`,
  };

  const attachments = [];
  if (adjuntarFactura) {
    try {
      const pdf = await renderFacturaPdfDePedido(pedidoId);
      if (pdf) {
        attachments.push({
          filename: pdf.filename,
          content: pdf.buffer,
          contentType: "application/pdf",
        });
      }
    } catch (err: any) {
      // Sin adjunto, pero el aviso al cliente sale igual.
      console.error("[EMAIL] No se pudo adjuntar la factura:", err?.message);
    }
  }

  await sendTemplateEmail({
    to: pedidoAnterior.email!,
    templateSlug: plantilla,
    variables,
    attachments: attachments.length > 0 ? attachments : undefined,
  });
}
