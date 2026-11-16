/**
 * Cupón aplicado en el checkout, compartido entre el resumen y el pago.
 *
 * Se guarda el CÓDIGO, no sólo el importe: el servidor ignora los importes del
 * navegador y recalcula el descuento a partir del código (ver
 * `resolverCupon` en checkoutPricing.ts). Sin el código, el pedido se creaba
 * sin descuento y PayPal/Redsys cobraban el total completo.
 */

const KEY = "checkout_cupon";
/** Clave antigua que sólo guardaba el importe; se limpia por si quedó de antes. */
const KEY_LEGACY = "checkout_descuento";

export type CuponCheckout = { codigo: string; descuento: number };

export function guardarCuponCheckout(cupon: CuponCheckout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cupon));
    localStorage.removeItem(KEY_LEGACY);
  } catch {}
}

export function leerCuponCheckout(): CuponCheckout | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const codigo = String(parsed?.codigo ?? "").trim();
    const descuento = Number(parsed?.descuento);
    if (!codigo || !Number.isFinite(descuento)) return null;
    return { codigo, descuento };
  } catch {
    return null;
  }
}

export function limpiarCuponCheckout() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY_LEGACY);
  } catch {}
}
