import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductDetail from "./ProductDetail";
import { prisma } from "@/lib/prisma";
import {
  createDefaultTransportConfig,
  getFreeShippingThreshold,
  normalizeShippingConfig,
} from "@/lib/transportes";
import { CANONICAL_BASE_URL } from "@/lib/urls";
import { SITE_NAME } from "@/lib/seo";

const TRANSPORTES_CONFIG_KEY = "transportes_configuracion";

// Umbral de envío gratis configurado en /admin/transportes (cacheado por request).
const getEnvioGratisDesde = cache(async (): Promise<number | null> => {
  try {
    const fila = await prisma.configuracion.findUnique({ where: { clave: TRANSPORTES_CONFIG_KEY } });
    const raw = fila?.valor ? JSON.parse(fila.valor) : null;
    return getFreeShippingThreshold(normalizeShippingConfig(raw ?? createDefaultTransportConfig()));
  } catch {
    return null;
  }
});

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
  const url = `${CANONICAL_BASE_URL}/productos/${producto.slug || producto.id}`;
  const imageRaw = producto.productoimagen[0]?.url;
  // El og:image debe ser absoluto y del dominio público, nunca de localhost.
  const baseUrl = CANONICAL_BASE_URL;
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
  const [mapeo, avLookup, envioGratisDesde] = await Promise.all([
    productoRaw.referencia
      ? prisma.mapeo_producto_ps.findFirst({ where: { referencia: productoRaw.referencia } })
      : Promise.resolve(null),
    uniqueVariantValues.length > 0
      ? prisma.atributovalor.findMany({
          where: { valor: { in: uniqueVariantValues } },
          select: { id: true, valor: true, imagen: true, colorHex: true, orden: true },
        })
      : Promise.resolve([]),
    getEnvioGratisDesde(),
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

  const BASE_URL = CANONICAL_BASE_URL;
  const productoUrl = productoRaw.slug
    ? `${BASE_URL}/productos/${productoRaw.slug}`
    : `${BASE_URL}/productos/${productoRaw.id}`;

  // Disponibilidad real. Antes estaba fijo en "InStock" para todo, incluidos los
  // agotados: si Google detecta que el dato estructurado no coincide con lo que
  // muestra la página, puede retirar los resultados enriquecidos de TODA la tienda
  // (y con ellos el precio en los resultados, que es lo que más se nota).
  //
  // Las existencias pueden estar en el producto o en sus variantes, y NO se puede
  // usar el flag `tieneVariantes` para decidir cuál mirar: hoy hay 477 productos
  // con filas en `variante` y el flag a false en todos ellos. Está sin mantener.
  //
  // Por eso se miran las dos fuentes y basta con que una tenga existencias. Ante la
  // duda conviene equivocarse hacia "disponible": marcar agotado un producto que sí
  // se vende cuesta ventas, mientras que lo contrario sólo cuesta un aviso de Google.
  const stockVariantes = productoRaw.variante.reduce(
    (suma: number, v: any) => suma + (v.stock ?? 0),
    0
  );
  const hayExistencias = (productoRaw.stock ?? 0) > 0 || stockVariantes > 0;

  const disponibilidad =
    hayExistencias
      ? "https://schema.org/InStock"
      : productoRaw.disponiblePedidos
        ? "https://schema.org/BackOrder"   // agotado pero se admite pedido
        : "https://schema.org/OutOfStock";

  // Google avisa si falta priceValidUntil, y si la fecha ya pasó deja de mostrar el
  // precio. Un año por delante desde el render, que es dinámico y nunca caduca.
  const precioValidoHasta = new Date();
  precioValidoHasta.setFullYear(precioValidoHasta.getFullYear() + 1);

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
      "priceValidUntil": precioValidoHasta.toISOString().split("T")[0],
      "availability": disponibilidad,
      "itemCondition": "https://schema.org/NewCondition",
      "seller": { "@type": "Organization", "name": SITE_NAME },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail producto={productoAdaptado} envioGratisDesde={envioGratisDesde} />
    </>
  );
}
