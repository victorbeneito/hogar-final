import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductDetail from "./ProductDetail";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

// React.cache() deduplicates the DB call so generateMetadata and ProductoPage
// share a single query per request instead of hitting the DB twice.
const getProducto = cache(async (id: string) => {
  const idNumero = Number(id);
  const byId = Number.isInteger(idNumero) && idNumero > 0;

  return prisma.producto.findFirst({
    where: byId ? { id: idNumero } : { slug: id },
    select: {
      id: true,
      nombre: true,
      slug: true,
      descripcion: true,
      descripcion_html: true,
      composicion: true,
      referencia: true,
      precio: true,
      precioOferta: true,
      stock: true,
      tieneVariantes: true,
      disponiblePedidos: true,
      metaTitulo: true,
      metaDescripcion: true,
      resumen: true,
      reglaimpuesto: { select: { porcentaje: true } },
      productoimagen: {
        orderBy: { orden: "asc" },
        select: { id: true, url: true },
      },
      variante: {
        select: {
          id: true,
          referencia: true,
          tamano: true,
          tirador: true,
          color: true,
          precio_extra: true,
          imagen: true,
          imagenMuestra: true,
          imagenesVariante: true,
          stock: true,
          // varianteatributo omitted intentionally: with 100s of variants the nested
          // join is very expensive. The avLookup below covers the same data.
        },
      },
      productocategoria: {
        select: {
          categoria: {
            select: { id: true, nombre: true },
          },
        },
      },
      marca: {
        select: { id: true, nombre: true, logo_url: true, imagen: true },
      },
    },
  });
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const producto = await getProducto(id);

  if (!producto) return {};

  const title = producto.metaTitulo || producto.nombre;
  const description = producto.metaDescripcion || producto.resumen || "";
  const url = producto.slug
    ? `https://elhogardetusuenos.com/productos/${producto.slug}`
    : `https://elhogardetusuenos.com/productos/${producto.id}`;
  const imageRaw = producto.productoimagen[0]?.url;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://elhogardetusuenos.com";
  const image = imageRaw
    ? imageRaw.startsWith("http") ? imageRaw : `${baseUrl}${imageRaw}`
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      ...(image && { images: [{ url: image, alt: title }] }),
    },
  };
}

export default async function ProductoPage({ params }: PageProps) {
  const { id } = await params;

  const productoRaw = await getProducto(id);
  if (!productoRaw) return notFound();

  // Unique color/tirador values — used to fetch display info (image, colorHex) for selectors
  const uniqueVariantValues = [
    ...new Set(
      productoRaw.variante.flatMap((v) => [v.color, v.tirador]).filter((x): x is string => Boolean(x))
    ),
  ];

  // Both secondary queries in parallel
  const [mapeo, avLookup] = await Promise.all([
    productoRaw.referencia
      ? prisma.mapeo_producto_ps.findFirst({ where: { referencia: productoRaw.referencia } })
      : Promise.resolve(null),
    uniqueVariantValues.length > 0
      ? prisma.atributovalor.findMany({
          where: { valor: { in: uniqueVariantValues } },
          select: { id: true, valor: true, imagen: true, colorHex: true, orden: true },
        })
      : Promise.resolve([]),
  ]);

  const prestashopProductId = mapeo?.idPrestashop || null;
  const avByValor = new Map(avLookup.map((av) => [av.valor, av]));

  // precio en BD es sin IVA → convertir a precio con IVA para mostrar al cliente
  const porcentajeIva = Number(productoRaw.reglaimpuesto?.porcentaje ?? 0);
  const factorIva = 1 + porcentajeIva / 100;
  const precioConIva = Number(productoRaw.precio) * factorIva;
  const ofertaConIva = productoRaw.precioOferta != null ? Number(productoRaw.precioOferta) * factorIva : null;

  const productoAdaptado: any = {
    id: productoRaw.id,
    nombre: productoRaw.nombre,
    descripcion: productoRaw.descripcion ?? "",
    descripcion_html_cruda: productoRaw.descripcion_html ?? "",
    composicion: productoRaw.composicion ?? "",
    precio: precioConIva,
    precio_descuento: ofertaConIva,
    descuento_porcentaje: ofertaConIva != null && precioConIva > 0
      ? ((precioConIva - ofertaConIva) / precioConIva * 100).toFixed(2)
      : null,
    imagenes: productoRaw.productoimagen.map((img: any) => img.url),
    variantes: (productoRaw.variante ?? []).map((v: any) => {
      const atributovalores = ([v.color, v.tirador] as (string | null | undefined)[])
        .filter((val): val is string => Boolean(val))
        .map((val) => avByValor.get(val))
        .filter(Boolean);
      return { ...v, atributovalores };
    }),
    categoria: productoRaw.productocategoria?.[0]?.categoria ?? null,
    prestashopProductId,
    referencia: productoRaw.referencia,
    marca: productoRaw.marca,
    stock: productoRaw.stock ?? 0,
    tieneVariantes: productoRaw.tieneVariantes ?? false,
    disponiblePedidos: productoRaw.disponiblePedidos ?? true,
  };

  const BASE_URL = "https://elhogardetusuenos.com";
  const productoUrl = productoRaw.slug
    ? `${BASE_URL}/productos/${productoRaw.slug}`
    : `${BASE_URL}/productos/${productoRaw.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": productoRaw.nombre,
    "url": productoUrl,
    ...(productoRaw.productoimagen[0]?.url && { "image": productoRaw.productoimagen[0].url }),
    ...(productoRaw.descripcion && { "description": productoRaw.descripcion }),
    ...(productoRaw.referencia && { "sku": productoRaw.referencia }),
    ...(productoRaw.marca && { "brand": { "@type": "Brand", "name": productoRaw.marca.nombre } }),
    "offers": {
      "@type": "Offer",
      "url": productoUrl,
      "priceCurrency": "EUR",
      "price": (ofertaConIva ?? precioConIva).toFixed(2),
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "Organization", "name": "El Hogar de tus Sueños" },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail producto={productoAdaptado} />
    </>
  );
}
