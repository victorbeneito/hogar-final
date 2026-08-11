import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import SortDropdown from "@/components/SortDropdown";
import { buscarProductos } from "@/lib/productosLista";

export const dynamic = "force-dynamic";

/**
 * Listado de productos.
 *
 * Era un componente cliente que cargaba el catálogo con useEffect + fetch. Google
 * recibía la página sin un solo enlace a fichas de producto, y con el título y la
 * descripción de la portada.
 *
 * Ahora se renderiza en el servidor. La conversión salió barata porque la página ya
 * era casi toda presentacional: la paginación y el orden se navegaban con <Link> y
 * con router.push, no con estado propio. Lo único que había que sustituir era el
 * botón del estado vacío (ahora un <Link> con el mismo aspecto).
 *
 * Los metadatos están en layout.tsx, no aquí, por herencia histórica: se crearon
 * cuando esta página aún era "use client" y no podía exportarlos. Se pueden mover
 * a esta página si algún día conviene hacerlos dinámicos según la búsqueda.
 */

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageNumbers(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, idx) => idx + 1);
  const start = Math.max(1, current - 2);
  const end = Math.min(total, start + 4);
  const adjustedStart = Math.max(1, end - 4);
  return Array.from({ length: end - adjustedStart + 1 }, (_, idx) => adjustedStart + idx);
}

export default async function ProductosPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {};

  // Los parámetros tal y como vienen en la URL. Se usan para construir los enlaces de
  // paginación, así que NO se les añade nada: si aquí metiéramos el limit por defecto,
  // cada enlace lo arrastraría y acabaríamos con dos URLs distintas para el mismo
  // contenido (/productos?page=2 y /productos?page=2&limit=12).
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(resolved)) {
    const v = getFirstValue(valor);
    if (v) params.set(clave, v);
  }

  // Copia para la consulta, ésta sí con el limit por defecto: 12 por página, como
  // venía haciendo la versión cliente. buscarProductos es exactamente la misma
  // función que usa GET /api/productos, así que listado y API no pueden divergir.
  const paramsConsulta = new URLSearchParams(params);
  if (!paramsConsulta.get("limit")) paramsConsulta.set("limit", "12");

  const q = getFirstValue(resolved.q)?.trim() || "";
  const { productos, total, page, limit, sortBy, sortDir, busquedaAmpliada } =
    await buscarProductos(paramsConsulta);

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const pageButtons = pageNumbers(page, pageCount);

  // Enlace de paginación conservando el resto de filtros de la URL actual.
  const enlacePagina = (numero: number) => {
    const p = new URLSearchParams(params);
    p.set("page", String(numero));
    return `/productos?${p.toString()}`;
  };

  return (
    <main className="min-h-screen bg-fondo dark:bg-darkBg px-4 py-8 md:py-12 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto">

        {/* Cabecera de Sección */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-200 dark:border-gray-700 pb-4 gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                    {q ? `Resultados para "${q}"` : "Nuestra Colección"}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {total} {total === 1 ? 'producto encontrado' : 'productos encontrados'}
                </p>
            </div>

            {q && (
                <Link
                  href="/productos"
                  className="text-primary hover:text-primaryHover font-bold text-sm underline underline-offset-4"
                >
                  Ver todos los productos
              </Link>
            )}
        </div>

        {/* No había ningún producto con todas las palabras: mostramos los más parecidos */}
        {busquedaAmpliada && productos.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            No encontramos productos que cumplan todo lo que buscabas, así que te mostramos
            los más parecidos a <strong>&quot;{q}&quot;</strong>.
          </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <SortDropdown
            basePath="/productos"
            value={`${sortBy}:${sortDir}`}
          />

          {pageCount > 1 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Página {page} de {pageCount}
            </p>
          )}
        </div>

        {/* Grid de Productos */}
        {productos.length === 0 ? (
          // Estado Vacío (Empty State)
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-4xl">
                🔍
             </div>
             <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {q ? `No encontramos nada con "${q}"` : "No hay productos disponibles"}
             </h3>
             <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                Intenta buscar con otros términos o echa un vistazo a nuestras categorías principales.
             </p>
             <Link
                href="/productos"
                className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primaryHover transition"
             >
                Ver todo el catálogo
             </Link>
          </div>
        ) : (
          // Lista de productos
          <>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {productos.map((p) => (
                <ProductCard key={p.id} producto={p} />
              ))}
            </div>

            {pageCount > 1 && (
              <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={enlacePagina(Math.max(1, page - 1))}
                  aria-disabled={page <= 1}
                  className={`px-4 py-2 rounded border text-sm transition ${page <= 1 ? "pointer-events-none opacity-40 border-gray-200 dark:border-gray-700" : "bg-white dark:bg-darkNavBg border-gray-200 dark:border-gray-700 hover:border-primary"}`}
                >
                  Anterior
                </Link>

                {pageButtons.map((num) => (
                  <Link
                    key={num}
                    href={enlacePagina(num)}
                    className={`min-w-10 px-4 py-2 rounded border text-sm text-center transition ${num === page ? "bg-primary text-white border-primary" : "bg-white dark:bg-darkNavBg border-gray-200 dark:border-gray-700 hover:border-primary"}`}
                  >
                    {num}
                  </Link>
                ))}

                <Link
                  href={enlacePagina(Math.min(pageCount, page + 1))}
                  aria-disabled={page >= pageCount}
                  className={`px-4 py-2 rounded border text-sm transition ${page >= pageCount ? "pointer-events-none opacity-40 border-gray-200 dark:border-gray-700" : "bg-white dark:bg-darkNavBg border-gray-200 dark:border-gray-700 hover:border-primary"}`}
                >
                  Siguiente
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
