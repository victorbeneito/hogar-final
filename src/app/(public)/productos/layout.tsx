import type { Metadata } from "next";

// page.tsx es "use client" (usa useSearchParams para los filtros) y por eso no
// puede exportar `metadata`. Este layout de paso es el portador de los metadatos
// del listado — mismo truco que los layouts de noindex de carrito y checkout.
//
// No lleva la marca al final: la plantilla de src/app/layout.tsx ya añade
// "| El Hogar de tus Sueños". Escribirla aquí la duplicaría.
//
// Las fichas /productos/[id] cuelgan de este layout pero tienen su propio
// generateMetadata, que prevalece sobre estos valores.
export const metadata: Metadata = {
  title: "Todos los productos: estores, ropa de cama y textil hogar",
  description:
    "Catálogo completo de El Hogar de tus Sueños: estores digitales y lisos, fundas nórdicas, "
    + "textil de cocina y accesorios de decoración. Envío a toda España.",
};

export default function ProductosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
