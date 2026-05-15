'use client';

import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { ReactNode } from "react";

export function PaypalProvider({ children }: { children: ReactNode }) {
  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
        currency: "EUR",
        intent: "capture",
        components: "buttons",
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
