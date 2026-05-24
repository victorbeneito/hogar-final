import { prisma } from "@/lib/prisma";
import ProductoForm from "../ProductoForm";

export default async function NuevoProductoPage() {
  const [categorias, marcas, reglasImpuesto] = await Promise.all([
    prisma.categoria.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
    prisma.marca.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
    prisma.reglaimpuesto.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ProductoForm
        producto={null}
        categorias={categorias}
        marcas={marcas}
        reglasImpuesto={reglasImpuesto}
      />
    </div>
  );
}
