'use client';

import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { ReactNode } from "react";

export function PaypalProvider({ children }: { children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const isConfigured = clientId && !clientId.startsWith("PEGA_");

  if (!isConfigured) {
    return <>{children}</>;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: clientId,
        currency: "EUR",
        intent: "capture",
        components: "buttons",
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
