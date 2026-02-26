"use client";

import React from "react";
import { useRouter } from "next/navigation";

type Categoria = {
  id: number;
  nombre: string;
};

type Props = {
  categories?: Categoria[];
};

export default function BannersSection({ categories = [] }: Props) {
  const router = useRouter();

  function irCategoriaPorNombre(nombreCategoria: string) {
    if (!categories || categories.length === 0) return;

    const categoria = categories.find(
      (c) =>
        c.nombre.trim().toLowerCase() ===
        nombreCategoria.trim().toLowerCase()
    );

    if (categoria) {
      router.push(`/categorias/${categoria.id}`);
    } else {
      console.warn(
        `Categoría '${nombreCategoria}' no encontrada. Categorías disponibles:`,
        categories.map((c) => c.nombre)
      );
    }
  } // ← ESTA LLAVE FALTABA

  return (
    <section className="w-full my-10">
      {/* Banner intermedio */}
      <div className="mb-10">
        <img
          src="/img/medidas-personalizadas.jpg"
          alt="Banner intermedio"
          className="w-full h-[250px] object-cover rounded-lg shadow-md"
        />
      </div>

      {/* Tres banners pequeños clicables */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div
  onClick={() => irCategoriaPorNombre("Fundas de Sofá")}
  className="cursor-pointer w-full rounded-lg shadow"
  title="Ver productos de Fundas de Sofá"
>
  <img
    src="/img/banner-fundas-sofa.jpg"
    alt="Banner Fundas de sofá"
    className="w-full h-auto object-contain rounded-lg shadow"
  />
</div>

<div
  onClick={() => irCategoriaPorNombre("Cojines")}
  className="cursor-pointer w-full rounded-lg shadow"
  title="Ver productos de Cojines"
>
  <img
    src="/img/banner-cojines.jpg"
    alt="Banner Cojines"
    className="w-full h-auto object-contain rounded-lg shadow"
  />
</div>

<div
  onClick={() => irCategoriaPorNombre("Ropa de Cama")}
  className="cursor-pointer w-full rounded-lg shadow"
  title="Ver productos de Ropa de Cama"
>
  <img
    src="/img/banner-ropa-cama.jpg"
    alt="Banner Ropa de cama"
    className="w-full h-auto object-contain rounded-lg shadow"
  />
</div>

      </div>

      {/* Banner final */}
      <div>
        <img
          src="/img/banner-envios.jpg"
          alt="Banner final"
          className="w-full h-[300px] object-cover rounded-lg shadow-lg"
        />
      </div>
    </section>
  );
}
