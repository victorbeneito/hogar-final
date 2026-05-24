import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductoForm from "../ProductoForm";

export default async function ProductoEditPage({ params }: { params: Promise<{ id: string }> }) {
  // ✅ Next.js 14: params es Promise, hay que await
  const { id } = await params;

  // Guard contra rutas no numéricas
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return notFound();
  }

  try {
    const [producto, categorias, marcas, reglasImpuesto] = await Promise.all([
      prisma.producto.findUnique({
        where: { id: numId },
        select: {
          id: true,
          nombre: true,
          resumen: true,
          descripcion: true,
          descripcion_html: true,
          precio: true,
          precioOferta: true,
          precioCoste: true,
          reglaImpuestoId: true,
          stock: true,
          stockMinimo: true,
          activo: true,
          destacado: true,
          enOferta: true,
          visibilidad: true,
          condicion: true,
          mostrarCondicion: true,
          disponiblePedidos: true,
          soloWeb: true,
          etiquetas: true,
          ean13: true,
          upc: true,
          isbn: true,
          tieneVariantes: true,
          anchura: true,
          altura: true,
          profundidad: true,
          peso: true,
          plazoEntregaStock: true,
          plazoEntregaSinStock: true,
          gastosEnvioExtra: true,
          metaTitulo: true,
          metaDescripcion: true,
          marcaId: true,
          referencia: true,
          slug: true,
          updatedAt: true,
          productoimagen: {
            orderBy: { orden: "asc" },
            select: { id: true, url: true, orden: true, esPortada: true },
          },
          variante: {
            select: {
              id: true,
              referencia: true,
              stock: true,
              imagen: true,
              color: true,
              imagenMuestra: true,
              precio_extra: true,
              tamano: true,
              tirador: true,
            },
          },
          productocategoria: {
            select: {
              categoriaId: true,
              esPrincipal: true,
              categoria: { select: { id: true, nombre: true } },
            },
          },
          marca: { select: { id: true, nombre: true } },
          reglaimpuesto: { select: { id: true, nombre: true, porcentaje: true } },
        },
      }),
      prisma.categoria.findMany({
        where: { activa: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true },
      }),
      prisma.marca.findMany({
        where: { activa: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true },
      }),
      prisma.reglaimpuesto.findMany({
        where: { activa: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, porcentaje: true },
      }),
    ]);

    if (!producto) {
      return notFound();
    }

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <ProductoForm
          producto={producto}
          categorias={categorias}
          marcas={marcas}
          reglasImpuesto={reglasImpuesto}
        />
      </div>
    );
  } catch (error) {
    console.error("Error cargando producto:", error);
    return notFound();
  }
}
