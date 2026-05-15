import { notFound } from "next/navigation";
import ProductDetail from "./ProductDetail";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductoPage({ params }: PageProps) {
  const { id } = await params;
  const idNumero = Number(id);

  if (!Number.isInteger(idNumero) || idNumero <= 0) {
    return notFound();
  }

  const productoRaw = await prisma.producto.findUnique({
    where: { id: idNumero },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      descripcion_html: true,
      referencia: true,
      precio: true,
      precioOferta: true,
      reglaimpuesto: { select: { porcentaje: true } },
      productoimagen: {
        orderBy: { orden: "asc" },
        select: { id: true, url: true },
      },
      variante: {
        select: {
          id: true,
          tamano: true,
          tirador: true,
          color: true,
          precio_extra: true,
          imagen: true,
          imagenMuestra: true,
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
        select: { id: true, nombre: true },
      },
    },
  });

  if (!productoRaw) {
    return notFound();
  }

  // Obtener idPrestashop desde el mapeo (REVI)
  let prestashopProductId = null;
  if (productoRaw.referencia) {
    const mapeo = await prisma.mapeo_producto_ps.findFirst({
      where: { referencia: productoRaw.referencia }
    });
    prestashopProductId = mapeo?.idPrestashop || null;
  }

  // precio en BD es sin IVA → convertir a precio con IVA para mostrar al cliente
  const porcentajeIva = Number(productoRaw.reglaimpuesto?.porcentaje ?? 0);
  const factorIva = 1 + porcentajeIva / 100;
  const precioConIva = Number(productoRaw.precio) * factorIva;
  const ofertaConIva = productoRaw.precioOferta != null ? Number(productoRaw.precioOferta) * factorIva : null;

  // ✅ Adaptación completa y segura
  const productoAdaptado: any = {
    id: productoRaw.id,
    nombre: productoRaw.nombre,
    descripcion: productoRaw.descripcion ?? "",
    descripcion_html_cruda: productoRaw.descripcion_html ?? "",
    precio: precioConIva,
    precio_descuento: ofertaConIva,
    descuento_porcentaje: ofertaConIva != null && precioConIva > 0
      ? ((precioConIva - ofertaConIva) / precioConIva * 100).toFixed(2)
      : null,
    imagenes: productoRaw.productoimagen.map((img: any) => img.url),
    variantes: productoRaw.variante ?? [],
    categoria: productoRaw.productocategoria?.[0]?.categoria ?? null,
    prestashopProductId, // REVI
  };

  return <ProductDetail producto={productoAdaptado} />;
}
