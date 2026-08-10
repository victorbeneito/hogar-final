'use client';

import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Component, createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * ¿Estamos dentro de un PayPalScriptProvider?
 *
 * Sólo vale `true` en el subárbol que el provider envuelve, así que un botón
 * que lo consulte antes de llamar a `usePayPalScriptReducer` nunca lo llamará
 * sin provider — ese hook LANZA durante el render y tumbaría la página entera.
 */
const PaypalDisponibleContext = createContext(false);

export function usePaypalDisponible(): boolean {
  return useContext(PaypalDisponibleContext);
}

/**
 * Barrera de seguridad alrededor de PayPal.
 *
 * Cuando el SDK no carga (un adblocker o una VPN bloquean paypal.com/sdk/js,
 * credenciales mal puestas, etc.) la librería lanza DURANTE EL RENDER. Sin esta
 * barrera ese error sube hasta Next y deja la página en blanco con
 * "Application error: a client-side exception has occurred".
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

const esValido = (id: string | undefined | null) => Boolean(id) && !String(id).startsWith("PEGA_");

export function PaypalProvider({ children }: { children: ReactNode }) {
  // Camino rápido: si la variable estaba puesta al compilar, sin petición.
  const deBuild = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const [clientId, setClientId] = useState<string | null>(esValido(deBuild) ? (deBuild as string) : null);

  useEffect(() => {
    if (clientId) return;
    // NEXT_PUBLIC_* se congela al compilar y en Plesk el build no ve las
    // variables de entorno, así que lo pedimos al servidor en caliente.
    let vivo = true;
    fetch("/api/paypal/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (vivo && esValido(d?.clientId)) setClientId(d.clientId);
      })
      .catch((error) => console.error("PayPal: no se pudo obtener el client-id:", error));
    return () => {
      vivo = false;
    };
  }, [clientId]);

  // Sin client-id no montamos el provider: el contexto queda en false y los
  // botones simplemente no se dibujan. El resto de la tienda no se entera.
  if (!clientId) return <>{children}</>;

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "EUR",
        intent: "capture",
        components: "buttons",
      }}
    >
      <PaypalDisponibleContext.Provider value={true}>{children}</PaypalDisponibleContext.Provider>
    </PayPalScriptProvider>
  );
}
