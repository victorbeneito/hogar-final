/**
 * Eventos de ecommerce para GA4 / Google Ads, vía dataLayer de Google Tag Manager.
 *
 * Por qué existe este fichero
 * ---------------------------
 * La web cargaba GTM y GA4 pero nunca empujaba nada al `dataLayer`, así que GA4 sólo
 * veía visitas: ni un `view_item`, ni un `add_to_cart`, ni un `purchase`. Y sin
 * `purchase` en GA4, Google Ads no recibe conversiones, aunque la tienda esté
 * vendiendo con normalidad. El problema nunca fue de configuración en GTM: faltaba
 * el emisor en el frontend, que es lo que hay aquí.
 *
 * Cómo se usa
 * -----------
 * Cada función corresponde a un evento del ecommerce mejorado de GA4 y se llama en el
 * punto de la interfaz donde el usuario hace esa acción. Los nombres de evento y la
 * forma del objeto `ecommerce` son los que espera GA4 (no son inventados, ver
 * https://developers.google.com/analytics/devguides/collection/ga4/ecommerce), así
 * que en GTM basta con un activador de evento personalizado por cada nombre.
 *
 * Reglas que conviene no romper
 * -----------------------------
 *  - `item_id` debe ser SIEMPRE el id del producto en base de datos, en todos los
 *    eventos. Si en `view_item` se usa el id y en `purchase` la referencia, GA4 los
 *    trata como dos productos distintos y los informes de producto salen partidos.
 *  - Antes de cada push se empuja `{ ecommerce: null }`. El dataLayer no reemplaza
 *    objetos, los fusiona: sin esa limpieza, los `items` del evento anterior se
 *    quedarían pegados al siguiente.
 *  - Nada de esto puede romper la tienda. Todo va envuelto en try/catch y sale sin
 *    hacer nada si no hay `window`: una analítica caída no debe impedir una compra.
 */

import type { CartItem } from "@/lib/cartService";

export const MONEDA = "EUR";

/** Producto tal y como lo espera el array `items` de GA4. */
export interface ItemGA4 {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_variant?: string;
  item_category?: string;
  item_brand?: string;
  index?: number;
}

/** Redondeo a dos decimales: GA4 ignora la precisión extra y ensucia los informes. */
const dinero = (valor: number) => Math.round((Number(valor) || 0) * 100) / 100;

/** El `value` de un evento es la suma de precio × cantidad de sus items. */
export const valorDeItems = (items: ItemGA4[]) =>
  dinero(items.reduce((suma, item) => suma + (item.price ?? 0) * (item.quantity ?? 1), 0));

function empujar(evento: string, ecommerce: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  try {
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    // Limpieza obligatoria: ver la nota de arriba sobre la fusión del dataLayer.
    w.dataLayer.push({ ecommerce: null });
    w.dataLayer.push({ event: evento, ecommerce: { currency: MONEDA, ...ecommerce } });
  } catch {
    // Un fallo midiendo jamás debe cortar el flujo de compra.
  }
}

/**
 * Las variantes viajan en el carrito como tres campos sueltos (tamaño, color,
 * tirador). GA4 sólo tiene un hueco, `item_variant`, así que se juntan en una
 * cadena legible: "140 cm / Beige".
 */
const describeVariante = (partes: (string | null | undefined)[]) => {
  const limpias = partes.map((p) => (p ?? "").trim()).filter(Boolean);
  return limpias.length > 0 ? limpias.join(" / ") : undefined;
};

/** Convierte una línea del carrito en un item de GA4. */
export function itemDesdeCarrito(item: CartItem, index?: number): ItemGA4 {
  return {
    item_id: String(item.id),
    item_name: item.nombre,
    // precioFinal ya lleva IVA y el extra de la variante; precio es el de tarifa.
    price: dinero(item.precioFinal ?? item.precio),
    quantity: item.cantidad || 1,
    // `atributo` queda fuera a propósito: unas pantallas guardan ahí la referencia de
    // la variante y otras no lo rellenan, así que incluirlo haría que el mismo
    // producto con la misma variante apareciera en GA4 con dos nombres distintos
    // según desde dónde se hubiera añadido al carrito.
    item_variant: describeVariante([
      item.tamanoSeleccionado,
      item.colorSeleccionado,
      item.tiradorSeleccionado,
    ]),
    ...(index !== undefined && { index }),
  };
}

export const itemsDesdeCarrito = (carrito: CartItem[]) =>
  carrito.map((item, i) => itemDesdeCarrito(item, i));

/* ------------------------------------------------------------------ *
 * Eventos del embudo
 * ------------------------------------------------------------------ */

/** Ficha de producto abierta. */
export function verProducto(item: ItemGA4) {
  empujar("view_item", { value: valorDeItems([item]), items: [item] });
}

/** Producto añadido al carrito (se dispara desde cartService, sirve para toda la web). */
export function anadirAlCarrito(item: ItemGA4) {
  empujar("add_to_cart", { value: valorDeItems([item]), items: [item] });
}

/** Producto eliminado del carrito. */
export function quitarDelCarrito(item: ItemGA4) {
  empujar("remove_from_cart", { value: valorDeItems([item]), items: [item] });
}

/** Página del carrito vista con al menos un producto. */
export function verCarrito(items: ItemGA4[]) {
  empujar("view_cart", { value: valorDeItems(items), items });
}

/** El cliente pulsa "Tramitar pedido" y entra en el checkout. */
export function iniciarCheckout(items: ItemGA4[]) {
  empujar("begin_checkout", { value: valorDeItems(items), items });
}

/** Método de envío elegido. */
export function elegirEnvio(items: ItemGA4[], metodoEnvio: string) {
  empujar("add_shipping_info", {
    value: valorDeItems(items),
    shipping_tier: metodoEnvio,
    items,
  });
}

/** Forma de pago elegida (tarjeta, PayPal, Bizum…). */
export function elegirPago(items: ItemGA4[], metodoPago: string) {
  empujar("add_payment_info", {
    value: valorDeItems(items),
    payment_type: metodoPago,
    items,
  });
}

export interface CompraGA4 {
  transaction_id: string;
  value: number;
  shipping?: number;
  tax?: number;
  coupon?: string;
  items: ItemGA4[];
}

/**
 * Compra confirmada. Es EL evento: de aquí salen los ingresos de GA4 y las
 * conversiones de Google Ads.
 *
 * La página de confirmación se puede recargar, y el cliente puede volver a ella desde
 * el historial del navegador o desde el correo. Cada visita dispararía otro
 * `purchase` con el mismo pedido, inflando las ventas. Por eso se deja marca en
 * localStorage: un pedido sólo se mide una vez por navegador. GA4 también deduplica
 * por `transaction_id`, pero no de forma inmediata ni fiable, así que la primera
 * barrera se pone aquí.
 */
export function compraFinalizada(compra: CompraGA4) {
  if (typeof window === "undefined") return;

  const marca = `ga4_compra_${compra.transaction_id}`;
  try {
    if (localStorage.getItem(marca)) return;
    localStorage.setItem(marca, String(Date.now()));
  } catch {
    // Sin localStorage (modo privado, cuota llena) se mide igual: es preferible el
    // riesgo de un duplicado al de perder la conversión.
  }

  empujar("purchase", {
    transaction_id: compra.transaction_id,
    value: dinero(compra.value),
    ...(compra.shipping !== undefined && { shipping: dinero(compra.shipping) }),
    ...(compra.tax !== undefined && { tax: dinero(compra.tax) }),
    ...(compra.coupon && { coupon: compra.coupon }),
    items: compra.items,
  });
}
