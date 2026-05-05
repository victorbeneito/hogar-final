import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCmsPageDefinition, normalizeCmsSettings } from "@/lib/cmsConfig";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const CMS_CONFIG_KEY = "cms_paginas";

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const definition = getCmsPageDefinition(slug);
  if (!definition) return {};

  const configuracion = await prisma.configuracion.findUnique({ where: { clave: CMS_CONFIG_KEY } });
  const settings = normalizeCmsSettings(configuracion?.valor ? JSON.parse(configuracion.valor) : null);
  const page = settings.pages[definition.slug];

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.excerpt,
  };
}

export default async function CmsPublicPage({ params }: PageProps) {
  const { slug } = await params;
  const definition = getCmsPageDefinition(slug);

  if (!definition) {
    return notFound();
  }

  const configuracion = await prisma.configuracion.findUnique({ where: { clave: CMS_CONFIG_KEY } });
  const settings = normalizeCmsSettings(configuracion?.valor ? JSON.parse(configuracion.valor) : null);
  const page = settings.pages[definition.slug];

  if (!page?.active) {
    return notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12 space-y-6">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:underline">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 dark:text-gray-200 font-medium">{definition.label}</span>
      </nav>

      <article className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg shadow-sm p-6 md:p-8">
        <header className="space-y-3">
          <div className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            CMS / {definition.label}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{page.title}</h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">{page.excerpt}</p>
        </header>

        <div
          className="mt-8 prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary dark:prose-invert"
          dangerouslySetInnerHTML={{
            __html: page.contentHtml?.trim()
              ? page.contentHtml
              : "<p>Contenido en preparación. Vuelve más tarde.</p>",
          }}
        />
      </article>
    </div>
  );
}
