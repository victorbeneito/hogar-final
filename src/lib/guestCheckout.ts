// Compra como invitado: datos de envío + email guardados en localStorage
// mientras el visitante recorre el checkout sin cuenta.

export const GUEST_CHECKOUT_KEY = "checkout_invitado";

export interface GuestCheckoutData {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  nif: string;
  empresa?: string;
  direccion: string;
  direccionComplementaria?: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  aceptaMarketing?: boolean;
}

const CAMPOS_OBLIGATORIOS: (keyof GuestCheckoutData)[] = [
  "nombre",
  "apellidos",
  "email",
  "telefono",
  "nif",
  "direccion",
  "codigoPostal",
  "ciudad",
  "provincia",
  "pais",
];

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function isGuestCheckoutComplete(data: unknown): data is GuestCheckoutData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!CAMPOS_OBLIGATORIOS.every((campo) => typeof d[campo] === "string" && (d[campo] as string).trim() !== "")) {
    return false;
  }
  return EMAIL_REGEX.test(String(d.email));
}

export function getGuestCheckout(): GuestCheckoutData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GUEST_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isGuestCheckoutComplete(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setGuestCheckout(data: GuestCheckoutData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_CHECKOUT_KEY, JSON.stringify(data));
}

export function clearGuestCheckout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_CHECKOUT_KEY);
}

/** Datos de cliente que espera POST /api/pedidos */
export function guestToPedidoCliente(data: GuestCheckoutData) {
  return {
    nombre: data.nombre,
    apellidos: data.apellidos,
    email: data.email,
    telefono: data.telefono,
    nif: data.nif,
    empresa: data.empresa || "",
    direccion: data.direccion,
    direccionComplementaria: data.direccionComplementaria || "",
    codigoPostal: data.codigoPostal,
    cp: data.codigoPostal,
    ciudad: data.ciudad,
    provincia: data.provincia,
    pais: data.pais,
  };
}
