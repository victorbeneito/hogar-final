'use client';

import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Component, type ReactNode } from "react";

/**
 * ¿Hay PayPal en este build? Ojo: NEXT_PUBLIC_* se incrusta al compilar, así que
 * si la variable no estaba puesta al hacer el build, aquí es undefined aunque
 * exista en el servidor.
 *
 * Lo usan el provider y los botones: si divergieran, los botones llamarían a
 * usePayPalScriptReducer sin provider y ese hook LANZA, tumbando la página.
 */
export function paypalConfigurado(): boolean {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  return Boolean(clientId && !clientId.startsWith("PEGA_"));
}

/**
 * Barrera de seguridad alrededor de PayPal.
 *
 * Cuando el SDK de PayPal no carga (un adblocker o una VPN bloquean
 * paypal.com/sdk/js, credenciales mal puestas, etc.) la librería lanza el error
 * DURANTE EL RENDER. Sin esta barrera ese error sube hasta Next y deja la página
 * en blanco con "Application error: a client-side exception has occurred".
 *
 * Con ella el fallo se queda dentro: desaparece el botón de PayPal y el cliente
 * sigue comprando por las demás formas de pago.
 */
export class BarreraPaypal extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error: unknown) {
    console.error("PayPal no disponible:", error);
  }

  render() {
    return this.state.fallo ? null : this.props.children;
  }
}

export function PaypalProvider({ children }: { children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!paypalConfigurado()) {
    return <>{children}</>;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: clientId as string,
        currency: "EUR",
        intent: "capture",
        components: "buttons",
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
