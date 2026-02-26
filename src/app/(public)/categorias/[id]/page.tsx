import { notFound } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import { PrismaClient } from "@prisma/client";

// Instancia de Prisma (para hablar con la BD directamente)
const prisma = new PrismaClient();

// Definimos props para Next.js 15
type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CategoryPage({ params }: PageProps) {
  // 1. Desempaquetamos el ID de la URL
  const { id } = await params;

  // 2. IMPORTANTE: Convertimos el ID de Texto a Número (SQL lo necesita así)
  const idNumero = parseInt(id);

  // Si el ID no es un número válido, mostramos error o 404
  if (isNaN(idNumero)) {
    return notFound();
  }

  // 3. Pedimos los datos directamente a la BD (en paralelo para ir rápido)
  const [categoria, productos] = await Promise.all([
    // Buscar la categoría por su ID
    prisma.categoria.findUnique({
      where: { id: idNumero },
    }),
    // Buscar los productos que tengan ese categoriaId
    prisma.producto.findMany({
      where: { categoriaId: idNumero },
    }),
  ]);

  // Si no existe la categoría, devolvemos 404
  if (!categoria) {
    return notFound();
  }

  return (
    <main className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold mb-6">
        Productos categoría{" "}
        <span className="text-accent">
          {categoria.nombre}
        </span>
      </h1>

      {productos.length > 0 ? (
        <ProductGrid
          productosFiltrados={productos}
          busquedaActiva={true}
          productosDestacados={[]} 
        />
      ) : (
        <div className="text-center py-10">
          <p className="text-lg text-gray-500">
            No hay productos en esta categoría actualmente.
          </p>
        </div>
      )}
    </main>
  );
}