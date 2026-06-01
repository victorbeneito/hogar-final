import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Calendar, User, Eye, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: "El blog de tu Hogar | Decoración, consejos y tendencias",
  description: "Descubre las últimas tendencias en decoración del hogar, consejos de estilo y guías de compra en el blog de tu Hogar.",
};

export const dynamic = "force-dynamic";

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string; page?: string }> }) {
  const { q, tag, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1));
  const limit = 9;

  const where: Record<string, unknown> = { activo: true };
  if (q) {
    where.OR = [
      { titulo: { contains: q } },
      { extracto: { contains: q } },
    ];
  }
  if (tag) {
    where.etiquetas = { contains: tag };
  }

  const [total, articulos, destacados] = await Promise.all([
    prisma.articulo.count({ where }),
    prisma.articulo.findMany({
      where,
      orderBy: { fechaPublicacion: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, titulo: true, slug: true, extracto: true,
        imagenPortada: true, autor: true, etiquetas: true,
        vistas: true, fechaPublicacion: true, destacado: true,
      },
    }),
    page === 1
      ? prisma.articulo.findMany({
          where: { activo: true, destacado: true },
          orderBy: { fechaPublicacion: "desc" },
          take: 3,
          select: {
            id: true, titulo: true, slug: true, extracto: true,
            imagenPortada: true, autor: true, fechaPublicacion: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            El blog de tu <span className="text-[#3498db]">Hogar</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-8">
            Decoración, tendencias, consejos y guías para hacer de tu hogar un lugar especial.
          </p>
          {/* Buscador */}
          <form action="/blog" method="GET" className="max-w-lg mx-auto flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Buscar artículos..."
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] text-sm"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#3498db] text-white rounded-full hover:bg-[#2980b9] text-sm font-medium transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Artículos destacados (solo en primera página sin filtros) */}
        {destacados.length > 0 && page === 1 && !q && !tag && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Artículos destacados</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {destacados.map((a) => (
                <Link
                  key={a.id}
                  href={`/blog/${a.slug}`}
                  className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700"
                >
                  {a.imagenPortada ? (
                    <img
                      src={a.imagenPortada}
                      alt={a.titulo}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-4xl">
                      🏠
                    </div>
                  )}
                  <div className="p-5">
                    <p className="text-xs text-[#3498db] font-semibold uppercase tracking-wider mb-2">★ Destacado</p>
                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-[#3498db] transition-colors line-clamp-2 mb-2">
                      {a.titulo}
                    </h3>
                    {a.extracto && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{a.extracto}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(a.fechaPublicacion).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {a.autor}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Filtro activo */}
        {(q || tag) && (
          <div className="flex items-center gap-3 mb-6">
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {total} resultado{total !== 1 ? "s" : ""} {q && `para "${q}"`} {tag && `con etiqueta "${tag}"`}
            </p>
            <Link href="/blog" className="text-xs text-[#3498db] hover:underline">Limpiar filtros</Link>
          </div>
        )}

        {/* Grid de artículos */}
        {articulos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-2">No se encontraron artículos</p>
            <Link href="/blog" className="text-[#3498db] hover:underline text-sm">Ver todos los artículos</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articulos.map((a) => {
                const etiquetas = a.etiquetas?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
                return (
                  <Link
                    key={a.id}
                    href={`/blog/${a.slug}`}
                    className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700 flex flex-col"
                  >
                    {a.imagenPortada ? (
                      <img
                        src={a.imagenPortada}
                        alt={a.titulo}
                        className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-44 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-3xl">
                        📝
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      {etiquetas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {etiquetas.slice(0, 2).map((t) => (
                            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-[#3498db] text-xs rounded-full">
                              <Tag className="w-2.5 h-2.5" />{t}
                            </span>
                          ))}
                        </div>
                      )}
                      <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-[#3498db] transition-colors line-clamp-2 mb-2 flex-1">
                        {a.titulo}
                      </h3>
                      {a.extracto && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{a.extracto}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-3 border-t border-gray-50 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {a.autor}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(a.fechaPublicacion).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {a.vistas}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                {page > 1 && (
                  <Link
                    href={`/blog?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    ← Anterior
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/blog?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      p === page
                        ? "bg-[#3498db] text-white"
                        : "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
                {page < totalPages && (
                  <Link
                    href={`/blog?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Siguiente →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
