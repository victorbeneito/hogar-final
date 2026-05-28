import { prisma } from "@/lib/prisma";
import Banner from "@/components/Banner";
import BannersSection from "@/components/BannersSection";
import BannerPrincipal from "@/components/BannerPrincipal";
import SeoText from "@/components/SeoText";
import SubscribeForm from "@/components/SubscribeForm";
import ReviWidget from "@/components/ReviWidget";
import HomepageSearch from "@/components/HomepageSearch";

export default async function HomePage() {
  // Fetch server-side — Google ve este contenido en el HTML
  const [categoriasRaw, productosRaw] = await Promise.all([
    prisma.categoria.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }).catch(() => []),
    prisma.producto.findMany({
      where: { activo: true, destacado: true },
      select: {
        id: true,
        nombre: true,
        precio: true,
        precioOferta: true,
        stock: true,
        slug: true,
        destacado: true,
        enOferta: true,
        reglaimpuesto: { select: { porcentaje: true } },
        productoimagen: {
          select: { url: true },
          orderBy: { orden: "asc" },
          take: 1,
        },
      },
      orderBy: [{ destacado: "desc" }, { id: "desc" }],
      take: 12,
    }).catch(() => []),
  ]);

  const categories = categoriasRaw.map((c) => ({ id: c.id, nombre: c.nombre }));

  const productosDestacados = productosRaw.map((p) => {
    const iva = 1 + Number(p.reglaimpuesto?.porcentaje ?? 0) / 100;
    return {
      id: p.id,
      nombre: p.nombre,
      precio: Number(p.precio) * iva,
      precioOferta: p.precioOferta != null ? Number(p.precioOferta) * iva : null,
      stock: p.stock ?? 0,
      slug: p.slug,
      destacado: p.destacado ?? false,
      enOferta: p.enOferta ?? false,
      imagenes: p.productoimagen.map((img) => img.url),
      imagenPortada: p.productoimagen[0]?.url ?? null,
    };
  });

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
          <HomepageSearch productosDestacados={productosDestacados as any} />
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
