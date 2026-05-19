import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import SortDropdown from "@/components/SortDropdown";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero) || idNumero <= 0) return {};

  const categoria = await prisma.categoria.findUnique({
    where: { id: idNumero },
    select: { nombre: true, slug: true, metaTitulo: true, metaDescripcion: true, descripcion: true },
  });

  if (!categoria) return {};

  const title = categoria.metaTitulo || `${categoria.nombre} | Estores y Decoración`;
  const description = categoria.metaDescripcion || categoria.descripcion || `Descubre nuestra colección de ${categoria.nombre}. Estores digitales y decoración de hogar al mejor precio.`;
  const url = `https://www.elhogardetusuenos.com/categorias/${idNumero}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
  };
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQuery(
  basePath: string,
  current: Record<string, string | undefined>,
  updates: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  const merged = { ...current, ...updates };

  Object.entries(merged).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function pageNumbers(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, idx) => idx + 1);
  const start = Math.max(1, current - 2);
  const end = Math.min(total, start + 4);
  const adjustedStart = Math.max(1, end - 4);
  return Array.from({ length: end - adjustedStart + 1 }, (_, idx) => adjustedStart + idx);
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const idNumero = Number(id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = Math.max(1, Number(getFirstValue(resolvedSearchParams.page) ?? "1"));
  const limit = Math.min(24, Math.max(1, Number(getFirstValue(resolvedSearchParams.limit) ?? "12")));
  const sortBy = getFirstValue(resolvedSearchParams.sortBy) ?? "relevance";
  const sortDir = getFirstValue(resolvedSearchParams.sortDir) === "asc" ? "asc" : "desc";

  if (!Number.isInteger(idNumero) || idNumero <= 0) {
    return notFound();
  }

  const whereProducto = {
    productocategoria: {
      some: {
        categoriaId: idNumero,
      },
    },
  } satisfies Prisma.ProductoWhereInput;

  const orderBy: Prisma.ProductoOrderByWithRelationInput[] = (() => {
    switch (sortBy) {
      case "relevance":
        return [{ destacado: "desc" }, { enOferta: "desc" }, { createdAt: "desc" }, { id: "desc" }];
      case "nombre":
        return [{ nombre: sortDir }, { id: "desc" }];
      case "precio":
        return [{ precio: sortDir }, { id: "desc" }];
      case "stock":
        return [{ stock: sortDir }, { id: "desc" }];
      case "id":
        return [{ id: sortDir }];
      case "createdAt":
      default:
        return [{ createdAt: sortDir }, { id: "desc" }];
    }
  })();

  const skip = (page - 1) * limit;

  const [categoria, totalProductos, productos] = await Promise.all([
    prisma.categoria.findUnique({
      where: { id: idNumero },
      include: {
        other_categoria: true,
      },
    }),
    prisma.producto.count({ where: whereProducto }),
    prisma.producto.findMany({
      where: whereProducto,
      select: {
        id: true,
        nombre: true,
        precio: true,
        precioOferta: true,
        stock: true,
        activo: true,
        slug: true,
        productoimagen: {
          select: { url: true },
          orderBy: { orden: "asc" },
          take: 1,
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  if (!categoria) {
    return notFound();
  }

  const totalPages = Math.max(1, Math.ceil(totalProductos / limit));
  const visiblePages = pageNumbers(page, totalPages);
  const basePath = `/categorias/${idNumero}`;

  const BASE_URL = "https://www.elhogardetusuenos.com";
  const canonicalUrl = `${BASE_URL}/categorias/${idNumero}`;
  const descripcionTexto = categoria.descripcion
    ? categoria.descripcion.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : null;

  // JSON-LD structured data — CollectionPage + BreadcrumbList
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": canonicalUrl,
        "name": categoria.nombre,
        ...(descripcionTexto && { "description": descripcionTexto }),
        "url": canonicalUrl,
        "numberOfItems": totalProductos,
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": BASE_URL },
          { "@type": "ListItem", "position": 2, "name": "Productos", "item": `${BASE_URL}/productos` },
          { "@type": "ListItem", "position": 3, "name": categoria.nombre, "item": canonicalUrl },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-fondo dark:bg-darkBg px-4 py-8 md:py-12">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
              {categoria.nombre}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {totalProductos} {totalProductos === 1 ? "producto" : "productos"}
            </p>
          </div>

          <SortDropdown basePath={basePath} value={`${sortBy}:${sortDir}`} />
        </div>

        {/* Descripción de categoría — panel visible sobre los productos */}
        {categoria.descripcion && (
          <div className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-6 py-5 shadow-sm">
            <div
              className="prose prose-sm prose-gray dark:prose-invert max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: categoria.descripcion }}
            />
          </div>
        )}

        {productos.length > 0 ? (
          <>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {productos.map((producto) => (
                <ProductCard key={producto.id} producto={producto} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={buildQuery(basePath, resolvedSearchParams as Record<string, string | undefined>, { page: String(Math.max(1, page - 1)) })}
                  aria-disabled={page <= 1}
                  className={`px-4 py-2 rounded border text-sm transition ${page <= 1 ? "pointer-events-none opacity-40 border-gray-200 dark:border-gray-700" : "bg-white dark:bg-darkNavBg border-gray-200 dark:border-gray-700 hover:border-primary"}`}
                >
                  Anterior
                </Link>

                {visiblePages.map((num) => (
                  <Link
                    key={num}
                    href={buildQuery(basePath, resolvedSearchParams as Record<string, string | undefined>, { page: String(num) })}
                    className={`min-w-10 px-4 py-2 rounded border text-sm text-center transition ${num === page ? "bg-primary text-white border-primary" : "bg-white dark:bg-darkNavBg border-gray-200 dark:border-gray-700 hover:border-primary"}`}
                  >
                    {num}
                  </Link>
                ))}

                <Link
                  href={buildQuery(basePath, resolvedSearchParams as Record<string, string | undefined>, { page: String(Math.min(totalPages, page + 1)) })}
                  aria-disabled={page >= totalPages}
                  className={`px-4 py-2 rounded border text-sm transition ${page >= totalPages ? "pointer-events-none opacity-40 border-gray-200 dark:border-gray-700" : "bg-white dark:bg-darkNavBg border-gray-200 dark:border-gray-700 hover:border-primary"}`}
                >
                  Siguiente
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10">
            <p className="text-lg text-gray-500">
              No hay productos en esta categoría actualmente.
            </p>
          </div>
        )}

        {/* Texto SEO de la categoría — solo si está relleno */}
        {categoria.textoSeo && (
          <section className="mt-16 pt-10 border-t border-gray-200 dark:border-gray-700">
            <div
              className="prose prose-gray dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-600 dark:prose-p:text-gray-300"
              dangerouslySetInnerHTML={{ __html: categoria.textoSeo }}
            />
          </section>
        )}
      </div>
    </main>
  );
}
