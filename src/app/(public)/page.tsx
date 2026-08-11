import React from "react";
import Banner from "@/components/Banner";
import ProductGrid from "@/components/ProductGrid";
import BannersSection from "@/components/BannersSection";
import BannerPrincipal from "@/components/BannerPrincipal";
import SeoText from "@/components/SeoText";
import SubscribeForm from "@/components/SubscribeForm";
import ReviWidget from "@/components/ReviWidget";
import { prisma } from "@/lib/prisma";
import { buscarProductos } from "@/lib/productosLista";

export const dynamic = "force-dynamic";

/**
 * Portada.
 *
 * Era un componente cliente que pedía categorías y destacados con useEffect + axios.
 * El resultado era que Google recibía la página vacía: literalmente "No hay productos
 * para mostrar" y CERO enlaces a fichas de producto desde la página con más autoridad
 * del sitio. Ahora los datos se consultan en el servidor y viajan ya en el HTML.
 *
 * No hace falta un componente cliente intermedio: los siete hijos ya son "use client"
 * por su cuenta, y el estado de búsqueda que había aquí estaba muerto (sus setters no
 * se llamaban desde ninguna parte, así que ProductGrid siempre mostraba los destacados).
 */

// Si una consulta falla, la portada se pinta sin esa sección en lugar de devolver un
// 500. Antes el fetch del navegador fallaba en silencio y el efecto era el mismo; lo
// que no queremos es que un fallo de BD tumbe la home entera. El motivo queda en el log.
async function seguro<T>(etiqueta: string, consulta: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await consulta();
  } catch (error) {
    console.error(`❌ Portada: falló la consulta de ${etiqueta}:`, error);
    return porDefecto;
  }
}

export default async function HomePage() {
  const [categories, destacados] = await Promise.all([
    seguro(
      "categorías",
      () =>
        prisma.categoria.findMany({
          orderBy: { orden: "asc" },
          include: { other_categoria: { orderBy: { orden: "asc" } } },
        }),
      [] as any[]
    ),
    seguro(
      "productos destacados",
      async () => {
        const { productos } = await buscarProductos(
          new URLSearchParams({ destacado: "true", limit: "12", sortBy: "id", sortDir: "desc" })
        );
        return productos;
      },
      [] as any[]
    ),
  ]);

  return (
    <div className="bg-fondo dark:bg-darkBg w-full min-h-screen flex flex-col gap-y-8 md:gap-y-12 lg:gap-y-20 pb-12">
      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Banner />
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BannerPrincipal categories={categories} />
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProductGrid productosDestacados={destacados} busquedaActiva={false} />
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ReviWidget />
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BannersSection categories={categories} />
        </div>
      </section>

      <section className="w-full bg-gray-50 dark:bg-gray-900/50 py-10 md:py-16 mt-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <SeoText />
          <div className="border-t border-gray-200 dark:border-gray-700 pt-10">
            <SubscribeForm />
          </div>
        </div>
      </section>
    </div>
  );
}
