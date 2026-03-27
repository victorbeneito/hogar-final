import { notFound } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CategoryPage({ params }: PageProps) {
  const { id } = await params;
  const idNumero = Number(id);

  if (!Number.isInteger(idNumero) || idNumero <= 0) {
    return notFound();
  }

  const [categoria, productos] = await Promise.all([
    // Categoría principal + subcategorías
    prisma.categoria.findUnique({
      where: { id: idNumero },
      include: {
        other_categoria: true,  // subcategorías
      },
    }),
    
    // ✅ Relación correcta many-to-many
    prisma.producto.findMany({
      where: {
        productocategoria: {
          some: {
            categoriaId: idNumero,  // ← tabla intermedia
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        precio: true,
        precioOferta: true,
        stock: true,
        activo: true,
        slug: true,
        productoimagen: {
          select: { url: true },
          orderBy: { orden: "asc" },
          take: 1,
        },
      },
      orderBy: { id: "desc" },
      take: 20,
    }),
  ]);

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
