import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Calendar, User, Eye, Tag, ArrowLeft, Home } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const articulo = await prisma.articulo.findUnique({
    where: { slug, activo: true },
    select: { titulo: true, metaTitulo: true, metaDescripcion: true, extracto: true, imagenPortada: true },
  });

  if (!articulo) return { title: "Artículo no encontrado" };

  const title = articulo.metaTitulo || articulo.titulo;
  const description = articulo.metaDescripcion || articulo.extracto || "";
  // Sin esto se hereda el canonical del layout raíz, que apunta a la home
  const url = `/blog/${slug}`;

  return {
    title: `${title} | El blog de tu Hogar`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: articulo.imagenPortada ? [{ url: articulo.imagenPortada }] : [],
      type: "article",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ArticuloPage({ params }: Props) {
  const { slug } = await params;

  const articulo = await prisma.articulo.findUnique({
    where: { slug, activo: true },
  });

  if (!articulo) notFound();

  await prisma.articulo.update({
    where: { slug },
    data: { vistas: { increment: 1 }, updatedAt: new Date() },
  });

  const relacionados = await prisma.articulo.findMany({
    where: {
      activo: true,
      id: { not: articulo.id },
    },
    orderBy: { fechaPublicacion: "desc" },
    take: 3,
    select: {
      id: true, titulo: true, slug: true, extracto: true,
      imagenPortada: true, fechaPublicacion: true, autor: true,
    },
  });

  const etiquetas = articulo.etiquetas?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="flex items-center gap-1 hover:text-[#3498db] transition-colors">
              <Home className="w-3.5 h-3.5" /> Inicio
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[#3498db] transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white truncate max-w-xs">{articulo.titulo}</span>
          </nav>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* Cabecera */}
        <header className="mb-8">
          {etiquetas.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {etiquetas.map((t) => (
                <Link
                  key={t}
                  href={`/blog?tag=${encodeURIComponent(t)}`}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-[#3498db] text-xs rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <Tag className="w-3 h-3" />{t}
                </Link>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
            {articulo.titulo}
          </h1>

          {articulo.extracto && (
            <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-6">{articulo.extracto}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pb-6 border-b border-gray-100 dark:border-gray-800">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <strong className="text-gray-700 dark:text-gray-300">{articulo.autor}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(articulo.fechaPublicacion).toLocaleDateString("es-ES", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> {(articulo.vistas + 1).toLocaleString()} lecturas
            </span>
          </div>
        </header>

        {/* Imagen de portada */}
        {articulo.imagenPortada && (
          <div className="mb-10 -mx-4 sm:mx-0">
            <img
              src={articulo.imagenPortada}
              alt={articulo.titulo}
              className="w-full max-h-[500px] object-cover sm:rounded-2xl shadow-md"
            />
          </div>
        )}

        {/* Contenido */}
        <div
          className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
            prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
            prose-a:text-[#3498db] prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-img:shadow-md
            prose-blockquote:border-l-[#3498db] prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/20 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
            prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
            prose-pre:bg-gray-900 prose-pre:text-gray-100
            prose-li:text-gray-700 dark:prose-li:text-gray-300"
          dangerouslySetInnerHTML={{ __html: articulo.contenidoHtml }}
        />

        {/* Pie del artículo */}
        <footer className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[#3498db] hover:text-[#2980b9] text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al blog
            </Link>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Publicado por <strong className="text-gray-700 dark:text-gray-300">{articulo.autor}</strong>
            </div>
          </div>
        </footer>
      </article>

      {/* Artículos relacionados */}
      {relacionados.length > 0 && (
        <section className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">También te puede interesar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relacionados.map((a) => (
                <Link
                  key={a.id}
                  href={`/blog/${a.slug}`}
                  className="group bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700"
                >
                  {a.imagenPortada ? (
                    <img
                      src={a.imagenPortada}
                      alt={a.titulo}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-3xl">
                      📝
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-[#3498db] transition-colors line-clamp-2 text-sm mb-2">
                      {a.titulo}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {new Date(a.fechaPublicacion).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
