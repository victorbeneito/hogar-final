import type { Metadata } from "next";

// La página es un client component y no puede exportar `metadata`, por eso el
// noindex vive en este layout de paso. El carrito es contenido privado y
// cambiante: no debe aparecer en buscadores.
export const metadata: Metadata = {
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

export default function CarritoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
