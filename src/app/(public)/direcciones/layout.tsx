import type { Metadata } from "next";

// Direcciones del cliente: contenido privado.
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function DireccionesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
