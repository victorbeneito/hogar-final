import { prisma } from "./prisma";
import { EMAIL_TEMPLATES, type EmailTemplateSlug } from "./emailConfig";

/**
 * Banderas de configuración de cada estado de pedido (la tabla `estadopedido`,
 * heredada de los order_state de Prestashop) y su lectura.
 *
 * Durante mucho tiempo estas casillas se guardaban pero no las leía nadie: daba
 * igual marcarlas o no. Todo lo que las consulte debe hacerlo desde aquí.
 */

export type EstadoPedidoFlags = {
  clave: string;
  nombre: string;
  color: string;
  activo: boolean;
  enviarEmail: boolean;
  plantillaEmail: string | null;
  esEntrega: boolean;
  esFactura: boolean;
  considerarValidado: boolean;
  permitirFacturaPDF: boolean;
  ocultarEstado: boolean;
  adjuntarFacturaPDF: boolean;
  adjuntarAlbaranPDF: boolean;
  establecerEnviado: boolean;
  establecerPagado: boolean;
};

export const ESTADO_FLAGS_SELECT = {
  clave: true,
  nombre: true,
  color: true,
  activo: true,
  enviarEmail: true,
  plantillaEmail: true,
  esEntrega: true,
  esFactura: true,
  considerarValidado: true,
  permitirFacturaPDF: true,
  ocultarEstado: true,
  adjuntarFacturaPDF: true,
  adjuntarAlbaranPDF: true,
  establecerEnviado: true,
  establecerPagado: true,
} as const;

export async function cargarEstadosPedido(): Promise<EstadoPedidoFlags[]> {
  return prisma.estadopedido.findMany({ select: ESTADO_FLAGS_SELECT });
}

/**
 * Busca por clave o por nombre. Hacen falta los dos: las confirmaciones de pago
 * (Bizum, transferencia, contrareembolso) guardan en `pedido.estado` el nombre
 * visible del estado en lugar de la clave.
 */
export async function cargarEstadoPedido(claveONombre: string): Promise<EstadoPedidoFlags | null> {
  const estados = await cargarEstadosPedido();
  return indexarEstados(estados).get((claveONombre || "").toLowerCase()) ?? null;
}

/**
 * Índice por clave y por nombre, ambos en minúsculas. Hace falta por los dos:
 * `pedido.estado` guarda la clave, pero `historialestadopedido.estado` guarda
 * el nombre visible del estado en el momento del cambio.
 */
export function indexarEstados(estados: EstadoPedidoFlags[]) {
  const index = new Map<string, EstadoPedidoFlags>();
  for (const e of estados) {
    index.set(e.clave.toLowerCase(), e);
    index.set(e.nombre.toLowerCase(), e);
  }
  return index;
}

export type HitoHistorial = { estado: string; color?: string | null; fecha: Date | string };

/**
 * Estado que se le enseña al cliente.
 *
 * Si el estado actual tiene marcado "Ocultar este estado en el historial del
 * cliente" (el `hidden` de Prestashop), se retrocede por el historial hasta el
 * último hito no oculto. Es lo que evita que un cliente vea "CUESTIONARIO",
 * que es un estado de uso interno y no le dice nada.
 */
export function resolverEstadoVisible(
  estadoActual: string,
  historial: HitoHistorial[],
  index: Map<string, EstadoPedidoFlags>,
): { nombre: string; color: string } {
  const actual = index.get((estadoActual || "").toLowerCase());

  if (!actual?.ocultarEstado) {
    return {
      nombre: actual?.nombre || estadoActual || "",
      color: actual?.color || "#6b7280",
    };
  }

  // Del más reciente al más antiguo, saltando los ocultos.
  const ordenado = [...historial].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
  for (const hito of ordenado) {
    const flags = index.get((hito.estado || "").toLowerCase());
    if (flags && !flags.ocultarEstado) {
      return { nombre: flags.nombre, color: flags.color };
    }
  }

  // Sin ningún hito visible: mejor el estado actual que dejarlo en blanco.
  return { nombre: actual.nombre, color: actual.color };
}

/**
 * Claves de los estados que cuentan como venta válida (el `logable` de
 * Prestashop). Devuelve null si no hay ninguno marcado, para que quien filtre
 * no acabe descartando todos los pedidos por una casilla sin poner.
 */
export async function clavesEstadosValidados(): Promise<string[] | null> {
  const estados = await prisma.estadopedido.findMany({
    where: { considerarValidado: true },
    select: { clave: true },
  });
  return estados.length > 0 ? estados.map((e) => e.clave) : null;
}

const SLUGS_VALIDOS = new Set(EMAIL_TEMPLATES.map((t) => t.slug));

/**
 * Plantillas por defecto de los estados que ya enviaban correo antes de que las
 * casillas fueran funcionales, para no perder ese comportamiento si el estado
 * no tiene plantilla asignada.
 */
const PLANTILLA_POR_ESTADO: Record<string, EmailTemplateSlug> = {
  ENVIADO: "order-shipped",
  CANCELADO: "order-cancelled",
  DEVUELTO: "order-return",
};

export function resolverPlantillaEmail(estado: EstadoPedidoFlags): EmailTemplateSlug | null {
  const configurada = (estado.plantillaEmail || "").trim();
  if (configurada && SLUGS_VALIDOS.has(configurada as EmailTemplateSlug)) {
    return configurada as EmailTemplateSlug;
  }
  return PLANTILLA_POR_ESTADO[estado.clave] ?? null;
}
