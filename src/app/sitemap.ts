import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://www.elhogardetusuenos.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date();

  // Páginas estáticas
  const estaticas: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: ahora, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/productos`, lastModified: ahora, changeFrequency: "daily", priority: 0.9 },
  ];

  // Categorías activas
  const categorias = await prisma.categoria.findMany({
    where: { activa: true },
    select: { id: true, updatedAt: true },
  }).catch(() => []);

  const urlsCategorias: MetadataRoute.Sitemap = categorias.map((cat) => ({
    url: `${BASE_URL}/categorias/${cat.id}`,
    lastModified: (cat as any).updatedAt ?? ahora,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Productos activos
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, slug: true, updatedAt: true },
  }).catch(() => []);

  const urlsProductos: MetadataRoute.Sitemap = productos.map((p) => ({
    url: p.slug ? `${BASE_URL}/productos/${p.slug}` : `${BASE_URL}/productos/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...estaticas, ...urlsCategorias, ...urlsProductos];
}
