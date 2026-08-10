import { prisma } from "@/lib/prisma";
import { calcularPrecioVariante } from "@/lib/productVariantPricing";
import {
  DEFAULT_PAYMENT_CONFIG,
  normalizePaymentConfig,
  calculateContrareembolso,
  type PaymentCheckoutConfig,
} from "@/lib/paymentSettings";
import {
  calculateShippingResult,
  createDefaultTransportConfig,
  normalizeShippingConfig,
  type ShippingAddress,
  type ShippingOption,
} from "@/lib/transportes";

/**
 * Recálculo de importes en servidor.
 *
 * El carrito vive en localStorage, así que todo lo que llega del navegador
 * (precios, envío, descuento) es manipulable. Este módulo ignora esos importes
 * y los reconstruye desde la BD: es la única fuente de verdad del total que se
 * cobra. Ver `POST /api/pedidos` y `POST /api/paypal/crear-orden`.
 */

const CONFIG_KEY_TRANSPORTES = "transportes_configuracion";
const CONFIG_KEY_PAGOS = "formas_pago_configuracion";

export type ItemCarritoEntrada = {
  id: number | string;
  cantidad: number | string;
  tamanoSeleccionado?: string | null;
  colorSeleccionado?: string | null;
  tiradorSeleccionado?: string | null;
  varianteId?: number | string | null;
  /** Sólo se usa para el mensaje de error; el precio nunca se toma de aquí. */
  nombre?: string | null;
};

export type LineaCalculada = {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  productoIdRef: number;
  varianteIdRef: number | null;
  varianteInfo: string | null;
};

export type TotalesPedido = {
  lineas: LineaCalculada[];
  subtotal: number;
  envioCoste: number;
  descuento: number;
  recargoPago: number;
  totalFinal: number;
  envio: ShippingOption | null;
  cupon: { codigo: string; descuento: number } | null;
  avisos: string[];
};

export class ErrorCalculoPedido extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message);
    this.name = "ErrorCalculoPedido";
  }
}

const redondear = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Normaliza para comparar valores de variante ("Beige " ≈ "beige"). */
const norm = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Recalcula las líneas del carrito con los precios reales de la BD.
 * Replica la fórmula del escaparate: precio sin IVA → con IVA → + extra de
 * variante → ratio de oferta (ver `calcularPrecioVariante`).
 */
export async function recalcularLineas(items: ItemCarritoEntrada[]): Promise<LineaCalculada[]> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ErrorCalculoPedido("Carrito vacío");
  }

  const ids = [...new Set(items.map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0))];
  if (ids.length === 0) {
    throw new ErrorCalculoPedido("El carrito no contiene productos válidos");
  }

  const productos = await prisma.producto.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      nombre: true,
      precio: true,
      precioOferta: true,
      activo: true,
      reglaimpuesto: { select: { porcentaje: true } },
      variante: { select: { id: true, tamano: true, color: true, tirador: true, precio_extra: true } },
    },
  });

  const porId = new Map(productos.map((p) => [p.id, p]));

  return items.map((item) => {
    const productoId = Number(item.id);
    const producto = porId.get(productoId);

    if (!producto) {
      throw new ErrorCalculoPedido(`El producto "${item.nombre ?? productoId}" ya no está disponible`);
    }
    if (!producto.activo) {
      throw new ErrorCalculoPedido(`El producto "${producto.nombre}" ya no está a la venta`);
    }

    const cantidad = Math.floor(Number(item.cantidad));
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      throw new ErrorCalculoPedido(`Cantidad no válida para "${producto.nombre}"`);
    }

    // El precio en BD va sin IVA; el escaparate muestra y cobra con IVA.
    const factorIva = 1 + Number(producto.reglaimpuesto?.porcentaje ?? 0) / 100;
    const precioConIva = Number(producto.precio) * factorIva;
    const ofertaConIva = producto.precioOferta != null ? Number(producto.precioOferta) * factorIva : null;

    const variante = resolverVariante(producto.variante, item);

    const { precioFinal } = calcularPrecioVariante({
      precioOriginal: precioConIva,
      precioDescuento: ofertaConIva,
      precioExtra: variante?.precio_extra ?? 0,
    });

    const partes: string[] = [];
    if (item.tamanoSeleccionado) partes.push(`Tamaño : ${item.tamanoSeleccionado}`);
    if (item.colorSeleccionado) partes.push(`Color : ${item.colorSeleccionado}`);
    if (item.tiradorSeleccionado) partes.push(`Tirador : ${item.tiradorSeleccionado}`);

    return {
      nombre: partes.length > 0 ? `${producto.nombre} - ${partes.join("- ")}` : producto.nombre,
      cantidad,
      precioUnitario: precioFinal,
      subtotal: redondear(precioFinal * cantidad),
      productoIdRef: producto.id,
      varianteIdRef: variante?.id ?? null,
      varianteInfo: partes.length > 0 ? partes.join("- ") : null,
    };
  });
}

type VarianteBD = { id: number; tamano: string | null; color: string | null; tirador: string | null; precio_extra: number | null };

/**
 * El carrito guarda los valores elegidos (tamaño/color/tirador), no el id de la
 * variante, así que hay que reconstruirla comparando esos tres campos.
 */
function resolverVariante(variantes: VarianteBD[], item: ItemCarritoEntrada): VarianteBD | null {
  if (!variantes.length) return null;

  const varianteId = Number(item.varianteId);
  if (Number.isInteger(varianteId) && varianteId > 0) {
    const directa = variantes.find((v) => v.id === varianteId);
    if (directa) return directa;
  }

  const seleccion = {
    tamano: norm(item.tamanoSeleccionado),
    color: norm(item.colorSeleccionado),
    tirador: norm(item.tiradorSeleccionado),
  };

  if (!seleccion.tamano && !seleccion.color && !seleccion.tirador) return null;

  return (
    variantes.find(
      (v) =>
        (!seleccion.tamano || norm(v.tamano) === seleccion.tamano) &&
        (!seleccion.color || norm(v.color) === seleccion.color) &&
        (!seleccion.tirador || norm(v.tirador) === seleccion.tirador)
    ) ?? null
  );
}

/**
 * Reconstruye las opciones de envío para esa dirección y subtotal, y devuelve
 * la que el cliente dice haber elegido — con el coste que manda el servidor.
 */
export async function resolverEnvio(
  subtotal: number,
  direccion: ShippingAddress,
  metodoEnvioId: string | null | undefined
): Promise<{ opcion: ShippingOption | null; aviso: string | null }> {
  const configRow = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY_TRANSPORTES } });
  const config = normalizeShippingConfig(
    configRow?.valor ? JSON.parse(configRow.valor) : createDefaultTransportConfig()
  );

  const resultado = calculateShippingResult(config, subtotal, direccion);
  if (!resultado.options.length) {
    throw new ErrorCalculoPedido(resultado.warning ?? "No hay envíos disponibles para esa dirección");
  }

  const buscado = String(metodoEnvioId ?? "").trim();
  const opcion = buscado ? resultado.options.find((o) => o.id === buscado) : null;

  if (!opcion) {
    // Nunca degradar a otra opción: la más barata suele ser la recogida en
    // tienda (0 €), así que omitir el id sería una forma de no pagar portes.
    throw new ErrorCalculoPedido(
      "El método de envío seleccionado ya no está disponible. Vuelve al paso de envío y elige uno de nuevo."
    );
  }

  return { opcion, aviso: null };
}

/**
 * Envío para el checkout express: el comprador no ha pasado por el paso de
 * envío, así que elegimos por él. Es una tienda online, no una recogida en
 * tienda, de modo que preferimos siempre el transportista más barato de la
 * zona y sólo caemos en "recogida" si no hay ningún reparto disponible.
 */
export async function resolverEnvioExpress(
  subtotal: number,
  direccion: ShippingAddress
): Promise<ShippingOption> {
  const config = await cargarConfigTransportes();
  return elegirReparto(calculateShippingResult(config, subtotal, direccion), direccion);
}

/**
 * Importe de envío de partida, antes de que PayPal nos diga la dirección.
 * Usa la primera zona activa configurada (la Península, en la práctica), que es
 * de largo el destino más habitual. Si el comprador resulta estar en otra zona,
 * `express/envio` y `express/preparar` corrigen la orden antes de cobrarla.
 */
export async function resolverEnvioExpressPorDefecto(subtotal: number): Promise<ShippingOption> {
  const config = await cargarConfigTransportes();

  const zonaHabitual = [...(config.carriers[0]?.zones ?? [])]
    .filter((z) => z.active)
    .sort((a, b) => a.order - b.order)[0];

  // La zona se detecta por país/provincia, así que tomamos un representante de
  // la propia configuración en lugar de fijar un valor a mano.
  const direccion: ShippingAddress = {
    pais: zonaHabitual?.countries[0] ?? "España",
    provincia: zonaHabitual?.provinces[0] ?? null,
  };

  return elegirReparto(calculateShippingResult(config, subtotal, direccion), direccion);
}

async function cargarConfigTransportes() {
  const row = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY_TRANSPORTES } });
  return normalizeShippingConfig(row?.valor ? JSON.parse(row.valor) : createDefaultTransportConfig());
}

/**
 * En el express sólo vale el reparto a domicilio. Nunca caemos en "recogida en
 * tienda": quien compra online desde otra provincia no va a venir a recogerlo,
 * y además saldría con portes 0 €.
 */
function elegirReparto(resultado: ReturnType<typeof calculateShippingResult>, direccion: ShippingAddress) {
  const reparto = resultado.options
    .filter((o) => o.metodo === "delivery")
    .sort((a, b) => a.coste - b.coste);

  if (!reparto[0]) {
    throw new ErrorCalculoPedido(
      resultado.warning ??
        `No realizamos envíos a ${direccion.provincia || direccion.pais || "esa dirección"}.`
    );
  }
  return reparto[0];
}

/** Traduce la dirección que devuelve PayPal al formato de `transportes`. */
export function direccionDesdePaypal(shipping: any): ShippingAddress {
  const a = shipping?.address ?? shipping ?? {};
  return {
    pais: paisDesdeCodigo(a.country_code ?? a.countryCode),
    provincia: a.admin_area_1 ?? a.adminArea1 ?? null,
    ciudad: a.admin_area_2 ?? a.adminArea2 ?? null,
    codigoPostal: a.postal_code ?? a.postalCode ?? null,
  };
}

/** Las zonas se configuran con nombres de país, no con códigos ISO. */
const PAISES_ISO: Record<string, string> = {
  ES: "España",
  PT: "Portugal",
  IT: "Italia",
  FR: "Francia",
  DE: "Alemania",
  GB: "Reino Unido",
  AD: "Andorra",
};

export function paisDesdeCodigo(codigo: string | null | undefined): string {
  const c = String(codigo ?? "").trim().toUpperCase();
  return PAISES_ISO[c] ?? (c || "España");
}

/**
 * Revalida el cupón contra la BD (fechas, stock, mínimo, límite por cliente) y
 * devuelve el descuento que corresponde, ignorando el importe del navegador.
 */
export async function resolverCupon(
  codigo: string | null | undefined,
  subtotal: number,
  clienteId: number | null
): Promise<{ cupon: { codigo: string; descuento: number } | null; aviso: string | null }> {
  const code = String(codigo ?? "").trim().toUpperCase();
  if (!code) return { cupon: null, aviso: null };

  const rechazar = (motivo: string) => ({ cupon: null, aviso: `Cupón ${code} no aplicado: ${motivo}.` });

  const cupon = await prisma.cupon.findUnique({ where: { codigo: code } });
  if (!cupon) return rechazar("no existe");
  if (!cupon.activo) return rechazar("está desactivado");

  const ahora = new Date();
  if (ahora < cupon.fechaInicio) return rechazar("aún no está activo");
  if (ahora > cupon.fechaFin) return rechazar("ha caducado");
  if (cupon.cantidadUsada >= cupon.cantidadTotal) return rechazar("se ha agotado");
  if (subtotal < Number(cupon.pedidoMinimo ?? 0)) {
    return rechazar(`el pedido no alcanza el mínimo de ${Number(cupon.pedidoMinimo).toFixed(2)} €`);
  }

  if (clienteId) {
    const uso = await prisma.cupon_uso.findUnique({
      where: { cuponId_clienteId: { cuponId: cupon.id, clienteId } },
    });
    if (uso && uso.veces >= cupon.limitePorUsuario) return rechazar("ya lo has usado el máximo de veces");
  }

  const bruto =
    cupon.tipoDescuento === "PORCENTAJE" ? (subtotal * cupon.valorDescuento) / 100 : cupon.valorDescuento;

  return { cupon: { codigo: cupon.codigo, descuento: redondear(Math.min(bruto, subtotal)) }, aviso: null };
}

async function cargarConfigPagos(): Promise<PaymentCheckoutConfig> {
  const row = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY_PAGOS } });
  return normalizePaymentConfig(row?.valor ? JSON.parse(row.valor) : DEFAULT_PAYMENT_CONFIG);
}

/**
 * Punto de entrada: devuelve todos los importes del pedido calculados en
 * servidor. Nada de lo que llega del navegador se usa como importe.
 */
export async function calcularTotalesPedido(params: {
  items: ItemCarritoEntrada[];
  direccion: ShippingAddress;
  metodoEnvioId?: string | null;
  metodoPago?: string | null;
  cuponCodigo?: string | null;
  clienteId?: number | null;
}): Promise<TotalesPedido> {
  const avisos: string[] = [];

  const lineas = await recalcularLineas(params.items);
  const subtotal = redondear(lineas.reduce((acc, l) => acc + l.subtotal, 0));

  const { opcion: envio, aviso: avisoEnvio } = await resolverEnvio(
    subtotal,
    params.direccion,
    params.metodoEnvioId
  );
  if (avisoEnvio) avisos.push(avisoEnvio);

  const { cupon, aviso: avisoCupon } = await resolverCupon(
    params.cuponCodigo,
    subtotal,
    params.clienteId ?? null
  );
  if (avisoCupon) avisos.push(avisoCupon);

  const envioCoste = redondear(Math.max(0, envio?.coste ?? 0));
  const descuento = cupon?.descuento ?? 0;
  const baseAntesRecargo = Math.max(0, redondear(subtotal + envioCoste - descuento));

  // El contrareembolso lleva recargo; el checkout lo suma al total mostrado.
  let recargoPago = 0;
  if (String(params.metodoPago ?? "").toLowerCase() === "contrareembolso") {
    const config = await cargarConfigPagos();
    const { comisionFija, variable } = calculateContrareembolso(baseAntesRecargo, config.contrareembolso);
    recargoPago = redondear(comisionFija + variable);
  }

  return {
    lineas,
    subtotal,
    envioCoste,
    descuento,
    recargoPago,
    totalFinal: redondear(baseAntesRecargo + recargoPago),
    envio,
    cupon,
    avisos,
  };
}
