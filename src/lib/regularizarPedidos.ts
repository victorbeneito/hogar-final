import { prisma } from "./prisma";
import {
  createFactura,
  getInvoiceSettings,
  resolverFechaFactura,
  ultimaFacturaSerie,
} from "./invoiceGenerator";
import { buildInvoiceNumber } from "./invoiceSettings";
import { enviarPedidoARevi, registrarHistorialEstado } from "./orderStatusChange";
import { REVI_SYNC_CUTOFF_DATE } from "./reviService";

/**
 * Pone al día los pedidos que se cambiaron de estado con el endpoint masivo
 * antiguo (`updateMany` a secas), que dejaba el proceso a medias: sin línea en
 * el historial, sin factura y sin invitación de reseña.
 *
 * Lo usan tanto `scripts/regularizar-pedidos-facturas.ts` como la pantalla de
 * administración, porque en hosting gestionado no hay forma de lanzar el script.
 */

// Un pedido cancelado o devuelto no se factura por regularización.
const ESTADOS_NO_FACTURABLES = ["CANCELADO", "DEVUELTO"];

export type PasosRegularizacion = {
  historial: boolean;
  facturas: boolean;
  revi: boolean;
};

export type FilaHistorial = {
  pedidoId: number;
  numeroPedido: string;
  estado: string;
  ultimoHito: string | null;
  fechaUltimoHito: string | null;
  error?: string;
};

export type FilaFactura = {
  pedidoId: number;
  numeroPedido: string;
  fechaPedido: string;
  total: number;
  estadoPago: string;
  numeroFactura: string | null;
  fechaFactura: string | null;
  /** La fecha de expedición no coincide con la del pedido por el tope de correlatividad. */
  fechaDesplazada: boolean;
  error?: string;
};

export type FilaRevi = {
  pedidoId: number;
  numeroPedido: string;
  fechaPedido: string;
  error?: string;
};

export type ReporteRegularizacion = {
  simulacro: boolean;
  desde: string;
  hasta: string | null;
  totalPedidos: number;
  historial: FilaHistorial[];
  facturas: FilaFactura[];
  /** Pedidos sin factura cuyo estado actual no la emite: no se tocan. */
  sinEstadoFacturable: number;
  revi: FilaRevi[];
  /** Numeración vigente, para poder revisarla antes de aplicar. */
  serie: { siguienteNumero: number; ultimaFecha: string | null };
};

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export async function regularizarPedidos(opts: {
  aplicar: boolean;
  pasos: PasosRegularizacion;
  desde?: Date;
  hasta?: Date | null;
}): Promise<ReporteRegularizacion> {
  const { aplicar, pasos } = opts;
  // Por defecto se ignora todo lo anterior al corte del archivo de Prestashop:
  // esos pedidos ya tienen su propia serie PS-.
  const desde = opts.desde ?? REVI_SYNC_CUTOFF_DATE;
  const hasta = opts.hasta ?? null;

  const pedidos = await prisma.pedido.findMany({
    where: { fechaPedido: { gte: desde, ...(hasta ? { lte: hasta } : {}) } },
    orderBy: [{ fechaPedido: "asc" }, { id: "asc" }],
    select: {
      id: true,
      numeroPedido: true,
      estado: true,
      estadoPago: true,
      totalFinal: true,
      fechaPedido: true,
      reviInvitadoAt: true,
      factura: { select: { numeroFactura: true, fechaFactura: true } },
      estadoHistorial: { select: { estado: true, fecha: true }, orderBy: { fecha: "desc" }, take: 1 },
    },
  });

  const estados = await prisma.estadopedido.findMany({
    select: { clave: true, nombre: true, permitirFacturaPDF: true },
  });
  const porClave = new Map(estados.map((e) => [e.clave, e]));

  const settings = await getInvoiceSettings();
  const ultima = await ultimaFacturaSerie();

  const reporte: ReporteRegularizacion = {
    simulacro: !aplicar,
    desde: desde.toISOString(),
    hasta: hasta ? hasta.toISOString() : null,
    totalPedidos: pedidos.length,
    historial: [],
    facturas: [],
    sinEstadoFacturable: 0,
    revi: [],
    serie: {
      siguienteNumero: settings.nextSequence,
      ultimaFecha: iso(ultima?.fechaFactura),
    },
  };

  // ── 1. Historial de estados desfasado ──────────────────────────────────────
  if (pasos.historial) {
    for (const p of pedidos) {
      const ultimoHito = p.estadoHistorial[0];
      const nombreEstado = porClave.get(p.estado)?.nombre ?? p.estado;
      const desfasado =
        !ultimoHito || (ultimoHito.estado !== nombreEstado && ultimoHito.estado !== p.estado);
      if (!desfasado) continue;

      const fila: FilaHistorial = {
        pedidoId: p.id,
        numeroPedido: p.numeroPedido,
        estado: p.estado,
        ultimoHito: ultimoHito?.estado ?? null,
        fechaUltimoHito: iso(ultimoHito?.fecha),
      };

      if (aplicar) {
        try {
          // Se fecha hoy: el cambio en bloque no dejó rastro de cuándo se hizo.
          await registrarHistorialEstado(p.id, p.estado);
        } catch (err: any) {
          fila.error = err?.message || "error desconocido";
        }
      }
      reporte.historial.push(fila);
    }
  }

  // ── 2. Facturas que faltan ────────────────────────────────────────────────
  if (pasos.facturas) {
    const pendientes = pedidos.filter(
      (p) =>
        !p.factura &&
        !ESTADOS_NO_FACTURABLES.includes(p.estado) &&
        porClave.get(p.estado)?.permitirFacturaPDF === true,
    );
    reporte.sinEstadoFacturable = pedidos.filter(
      (p) => !p.factura && !pendientes.includes(p),
    ).length;

    // El simulacro reproduce la numeración real: misma fecha de expedición y
    // misma secuencia que aplicaría `createFactura`, para poder revisarla antes.
    let fechaSimulada = ultima?.fechaFactura ?? null;
    let secuenciaSimulada = settings.nextSequence;

    // En orden cronológico de pedido: así los números salen correlativos con las fechas.
    for (const p of pendientes) {
      const base: FilaFactura = {
        pedidoId: p.id,
        numeroPedido: p.numeroPedido,
        fechaPedido: p.fechaPedido.toISOString(),
        total: Number(p.totalFinal),
        estadoPago: String(p.estadoPago),
        numeroFactura: null,
        fechaFactura: null,
        fechaDesplazada: false,
      };

      if (!aplicar) {
        const fechaFactura = resolverFechaFactura(p.fechaPedido, fechaSimulada);
        if (
          settings.resetAnnually &&
          fechaSimulada &&
          fechaSimulada.getFullYear() < fechaFactura.getFullYear()
        ) {
          secuenciaSimulada = 1;
        }
        base.numeroFactura = buildInvoiceNumber(settings, secuenciaSimulada, fechaFactura);
        base.fechaFactura = fechaFactura.toISOString();
        base.fechaDesplazada = !mismoDia(fechaFactura, p.fechaPedido);
        fechaSimulada = fechaFactura;
        secuenciaSimulada++;
      } else {
        try {
          const r = await createFactura(p.id);
          if (r) {
            base.numeroFactura = r.numeroFactura;
            base.fechaFactura = r.fechaFactura.toISOString();
            base.fechaDesplazada = !mismoDia(r.fechaFactura, p.fechaPedido);
          } else {
            base.error = "no se encontró el pedido";
          }
        } catch (err: any) {
          base.error = err?.message || "error desconocido";
        }
      }

      reporte.facturas.push(base);
    }
  }

  // ── 3. Invitaciones de reseña pendientes ──────────────────────────────────
  if (pasos.revi) {
    const pendientesRevi = pedidos.filter(
      (p) =>
        p.estado === "CUESTIONARIO" &&
        !p.reviInvitadoAt &&
        p.fechaPedido >= REVI_SYNC_CUTOFF_DATE,
    );

    for (const p of pendientesRevi) {
      const fila: FilaRevi = {
        pedidoId: p.id,
        numeroPedido: p.numeroPedido,
        fechaPedido: p.fechaPedido.toISOString(),
      };
      if (aplicar) {
        try {
          await enviarPedidoARevi(p.id);
        } catch (err: any) {
          fila.error = err?.message || "error desconocido";
        }
      }
      reporte.revi.push(fila);
    }
  }

  return reporte;
}
