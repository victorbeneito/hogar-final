/**
 * Punto único de verdad para la URL base del sitio.
 *
 * Antes había ~12 copias de `process.env.APP_URL || "https://www.elhogardetusuenos.com"`
 * repartidas por Redsys, PayPal, pedidos, registro y emails. Ese fallback apuntaba a
 * `www`, que desde el 2026-08-10 devuelve un 301 hacia el dominio sin www. Como el POST
 * de notificación de Redsys NO sigue redirecciones, si `APP_URL` llegase a faltar en un
 * despliegue el cobro se haría y el pedido se quedaría sin confirmar, sin ningún error
 * visible. Centralizarlo deja un solo sitio que revisar y un fallback que ya es correcto.
 */

/**
 * Dominio canónico: SIN www y SIN barra final.
 * Es el que tiene el 301 de entrada, los canonicals, el sitemap y `DS_MERCHANT_MERCHANTURL`.
 * No cambiar sin repetir el orden completo: Google Console → variables → build →
 * probar un pago real de Redsys → y sólo entonces tocar la redirección.
 */
export const CANONICAL_BASE_URL = "https://elhogardetusuenos.com";

const FALLBACK_DESARROLLO = "http://localhost:3000";

/** Quita espacios y barras finales para que `${base}/ruta` nunca produzca `//ruta`. */
function normalizar(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * URL base efectiva en tiempo de ejecución.
 *
 * Orden a propósito: `APP_URL` primero porque se lee al arrancar, así un cambio en las
 * variables de Plesk surte efecto con reiniciar. `NEXT_PUBLIC_BASE_URL` se incrusta en
 * tiempo de *build*, de modo que si mandara ella un cambio exigiría redesplegar entero.
 * En el navegador `APP_URL` no existe y cae sola en la pública, que es lo deseable.
 */
export function getBaseUrl(): string {
  const desdeEntorno = process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (desdeEntorno) return normalizar(desdeEntorno);

  // Sin variables: en local seguimos apuntando al dev server; en producción, al canónico.
  return process.env.NODE_ENV === "development"
    ? FALLBACK_DESARROLLO
    : CANONICAL_BASE_URL;
}

/** Construye una URL absoluta del sitio a partir de una ruta (`/pedido/12` → `https://.../pedido/12`). */
export function buildUrl(path = "/"): string {
  return `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
