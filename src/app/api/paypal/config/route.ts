import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PAYMENT_CONFIG, normalizePaymentConfig } from "@/lib/paymentSettings";

export const dynamic = "force-dynamic";

/**
 * Client-id de PayPal para el navegador.
 *
 * Por qué existe este endpoint: `NEXT_PUBLIC_PAYPAL_CLIENT_ID` se congela al
 * compilar, y en Plesk las variables de entorno se aplican al proceso ya
 * arrancado, no al build. Resultado: en producción llegaba `undefined` y los
 * botones de PayPal desaparecían. Leyéndolo en caliente eso deja de importar.
 *
 * Se sirve primero el client-id del SERVIDOR (`PAYPAL_CLIENT_ID`), el mismo que
 * se usa para crear y capturar las órdenes: así navegador y servidor no pueden
 * acabar uno en sandbox y otro en producción. El panel de administración queda
 * como respaldo.
 *
 * El client-id es público por diseño (viaja dentro del SDK que carga el
 * navegador). PAYPAL_CLIENT_SECRET no sale de aquí jamás.
 */
export async function GET() {
  const esValido = (id: string | undefined | null) => Boolean(id) && !String(id).startsWith("PEGA_");

  let clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
  let origen: "servidor" | "panel" | null = esValido(clientId) ? "servidor" : null;

  if (!origen) {
    try {
      const row = await prisma.configuracion.findUnique({
        where: { clave: "formas_pago_configuracion" },
      });
      const config = normalizePaymentConfig(row?.valor ? JSON.parse(row.valor) : DEFAULT_PAYMENT_CONFIG);
      if (esValido(config.gateways.paypal.clientId)) {
        clientId = config.gateways.paypal.clientId;
        origen = "panel";
      }
    } catch (error) {
      console.error("PayPal config: no se pudo leer el panel:", error);
    }
  }

  return NextResponse.json({
    clientId: origen ? clientId : null,
    origen,
    modo: process.env.PAYPAL_MODE ?? "sandbox",
  });
}
