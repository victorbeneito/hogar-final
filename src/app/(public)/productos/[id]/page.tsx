import { notFound } from "next/navigation";
import ProductDetail from "./ProductDetail";
import { prisma } from "@/lib/prisma"; // 👈 IMPORTANTE: Usamos la instancia global

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductoPage({ params }: PageProps) {
  // 1. Obtener ID y convertir a número
  const { id } = await params;
  const idNumero = parseInt(id);

  if (isNaN(idNumero)) {
    return notFound();
  }

  // 2. Pedir datos a la BD
  const productoRaw = await prisma.producto.findUnique({
    where: { id: idNumero },
    include: {
      Categoria: true, // Prisma devuelve "Categoria" (Mayúscula)
      Variante: true,  // Prisma devuelve "Variante" (Mayúscula)
      Marca: true      // Prisma devuelve "Marca" (Mayúscula)
    }
  });

  if (!productoRaw) {
    return notFound();
  }

  // 3. ADAPTACIÓN DE DATOS (Aquí estaba el fallo)
  // Convertimos las Mayúsculas de Prisma a las minúsculas que espera tu componente
  const productoAdaptado = {
    ...productoRaw,
    
    // Mapeo: Categoria -> categoria
    categoria: (productoRaw as any).Categoria, 
    
    // Mapeo CRÍTICO: Variante -> variantes
    // Además nos aseguramos de que 'tamano' se pase bien.
    variantes: (productoRaw as any).Variante?.map((v: any) => ({
      ...v,
      tamano: v.tamano // Nos aseguramos que usamos 'tamano' (sin ñ) como en la BD
    })) || [],

    // Convertimos precios a número estándar
    precio: Number(productoRaw.precio),
    precio_descuento: null, // Si no tienes estos campos en BD, los dejamos null
    descuento_porcentaje: null, 

    // Convertimos imágenes de Json a Array
    imagenes: Array.isArray(productoRaw.imagenes) ? (productoRaw.imagenes as string[]) : [],
    
    // Mapeamos la descripción HTML (snake_case)
    descripcion_html_cruda: (productoRaw as any).descripcion_html || ""
  };

  return <ProductDetail producto={productoAdaptado as any} />;
}