import type { Metadata } from "next";

// Seguimiento de pedido: datos de un pedido concreto, no indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PedidoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
