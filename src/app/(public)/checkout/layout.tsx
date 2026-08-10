import type { Metadata } from "next";

// Cubre todo /checkout/* (identificación, envío, pago, resumen, retornos de
// PayPal/Redsys...). Son pasos de compra privados: nunca deben indexarse.
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
