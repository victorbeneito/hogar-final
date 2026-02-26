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

export default function BannerPrincipal({ categories = [] }: Props) {
  const router = useRouter();

  function irCategoriaPorNombre(nombreCategoria: string) {
    if (!categories || categories.length === 0) return;

    const categoria = categories.find(
      (c) => c.nombre.trim().toLowerCase() === nombreCategoria.trim().toLowerCase()
    );

    if (categoria?.id) {
      // Ruta dinámica por id de categoría: /categoria/[id]
      router.push(`/categorias/${categoria.id}`);
    } else {
      console.warn(`Categoría '${nombreCategoria}' no encontrada`);
    }
  }

  return (
    <section className="w-full mb-10 grid grid-cols-1 md:grid-cols-2 gap-6 px-4 md:px-0">
      {/* Banner Estores Digitales */}
      <div
        className="rounded-lg shadow-lg cursor-pointer"
        onClick={() => irCategoriaPorNombre("Estores Digitales")}
        title="Ver productos de Estores Digitales"
      >
        <img
          src="/img/banner-estores-digitales.jpg"
          alt="Estores Digitales"
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Banner Estores Lisos */}
      <div
        className="rounded-lg shadow-lg cursor-pointer"
        onClick={() => irCategoriaPorNombre("Estores Lisos")}
        title="Ver productos de Estores Lisos"
      >
        <img
          src="/img/banner-estores-lisos.jpg"
          alt="Estores Lisos"
          className="w-full h-auto object-contain"
        />
      </div>
    </section>
  );
}
