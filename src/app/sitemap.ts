import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { CANONICAL_BASE_URL as BASE_URL } from "@/lib/urls";
import { CMS_PAGE_DEFINITIONS, normalizeCmsSettings } from "@/lib/cmsConfig";

const CMS_CONFIG_KEY = "cms_paginas";

/**
 * Antes cada consulta llevaba un `.catch(() => [])` mudo. El `select` de categorías
 * pedía `updatedAt`, un campo que el modelo `categoria` NO tiene, así que Prisma
 * lanzaba un error de validación, el catch se lo tragaba sin dejar rastro y el
 * sitemap se publicaba sin una sola categoría. Aquí seguimos tolerando el fallo
 * (mejor un sitemap incompleto que un 500) pero dejándolo escrito en el log.
 */
async function seguro<T>(etiqueta: string, consulta: Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await consulta;
  } catch (error) {
    console.error(`[sitemap] no se pudieron cargar ${etiqueta}:`, error);
    return porDefecto;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date();

  const estaticas: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: ahora, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/productos`, lastModified: ahora, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: ahora, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/medidas-personalizadas`, lastModified: ahora, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Sólo categorías que tengan al menos un producto activo: una categoría vacía es
  // una página sin contenido y no conviene ofrecérsela a Google.
  const categorias = await seguro(
    "las categorías",
    prisma.categoria.findMany({
      where: {
        activa: true,
        productocategoria: { some: { producto: { activo: true } } },
      },
      select: { id: true },
      orderBy: { orden: "asc" },
    }),
    [] as { id: number }[]
  );

  const urlsCategorias: MetadataRoute.Sitemap = categorias.map((cat) => ({
    url: `${BASE_URL}/categorias/${cat.id}`,
    lastModified: ahora,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productos = await seguro(
    "los productos",
    prisma.producto.findMany({
      where: { activo: true },
      select: { id: true, slug: true, updatedAt: true },
    }),
    [] as { id: number; slug: string | null; updatedAt: Date }[]
  );

  const urlsProductos: MetadataRoute.Sitemap = productos.map((p) => ({
    url: p.slug ? `${BASE_URL}/productos/${p.slug}` : `${BASE_URL}/productos/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Artículos del blog: no estaban en el sitemap, sencillamente nunca se escribió.
  const articulos = await seguro(
    "los artículos del blog",
    prisma.articulo.findMany({
      where: { activo: true },
      select: { slug: true, updatedAt: true, fechaPublicacion: true },
      orderBy: { fechaPublicacion: "desc" },
    }),
    [] as { slug: string; updatedAt: Date; fechaPublicacion: Date }[]
  );

  const urlsArticulos: MetadataRoute.Sitemap = articulos.map((a) => ({
    url: `${BASE_URL}/blog/${a.slug}`,
    lastModified: a.updatedAt ?? a.fechaPublicacion,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Páginas CMS (aviso legal, condiciones, etc.): viven en una fila de `configuracion`
  // con un JSON, y cada una tiene su propio interruptor `active`.
  const urlsCms = await seguro(
    "las páginas CMS",
    (async (): Promise<MetadataRoute.Sitemap> => {
      const fila = await prisma.configuracion.findUnique({ where: { clave: CMS_CONFIG_KEY } });
      let parsed: unknown = null;
      try {
        parsed = fila?.valor ? JSON.parse(fila.valor) : null;
      } catch {
        // JSON corrupto: nos quedamos con los valores por defecto.
      }
      const settings = normalizeCmsSettings(parsed);
      return CMS_PAGE_DEFINITIONS.filter((def) => settings.pages[def.slug]?.active).map((def) => ({
        url: `${BASE_URL}${def.route}`,
        lastModified: ahora,
        changeFrequency: "yearly" as const,
        priority: 0.3,
      }));
    })(),
    [] as MetadataRoute.Sitemap
  );

  return [...estaticas, ...urlsCategorias, ...urlsProductos, ...urlsArticulos, ...urlsCms];
}
