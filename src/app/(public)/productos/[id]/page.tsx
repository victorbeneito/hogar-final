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
      precio: true,
      precioOferta: true,
      productoimagen: {
      orderBy: { orden: "asc" },
      select: { id: true, url: true }
    },
    variante: {
      select: { id: true, tamano: true, tirador: true, color: true, precio_extra: true }
    },
    productocategoria: {
      select: {
        categoria: { select: { id: true, nombre: true } }
      }
    },
    marca: {
      select: { id: true, nombre: true }
    },
      
      
    },
  });

  if (!productoRaw) {
    return notFound();
  }

  // ✅ Adaptación completa y segura
  const productoAdaptado: any = {
    id: productoRaw.id,
    nombre: productoRaw.nombre,
    descripcion: productoRaw.descripcion ?? "",
    descripcion_html_cruda: productoRaw.descripcion_html ?? "",
    precio: Number(productoRaw.precio),
    precio_descuento: productoRaw.precioOferta ? Number(productoRaw.precioOferta) : null,
    descuento_porcentaje: productoRaw.precioOferta && productoRaw.precio > 0 
      ? ((productoRaw.precio - Number(productoRaw.precioOferta)) / productoRaw.precio * 100).toFixed(1)
      : null,
    imagenes: productoRaw.productoimagen.map((img: any) => img.url),
    variantes: productoRaw.variante ?? [],
    categoria: productoRaw.productocategoria?.[0]?.categoria ?? null,
  };

  return <ProductDetail producto={productoAdaptado} />;
}
