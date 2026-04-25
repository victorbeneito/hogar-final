import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { PrismaClient, Prisma } from "@prisma/client";
import SortDropdown from "@/components/SortDropdown";

const prisma = new PrismaClient();

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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
    // Categoría principal + subcategorías
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

  return (
    <main className="min-h-screen bg-fondo dark:bg-darkBg px-4 py-8 md:py-12">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
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
      </div>
    </main>
  );
}
