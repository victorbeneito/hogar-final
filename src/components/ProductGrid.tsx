"use client";

import React from "react";
import ProductCard from "./ProductCard";

type Producto = {
  id: number;
  destacado?: boolean;
  // más campos si quieres
};

type Props = {
  productosDestacados?: Producto[];
  productosFiltrados?: Producto[];
  busquedaActiva: boolean;
};

export default function ProductGrid({
  productosDestacados = [],
  productosFiltrados = [],
  busquedaActiva,
}: Props) {
  const productosAmostrar = busquedaActiva
    ? productosFiltrados
    : productosDestacados.filter((p) => p?.destacado);

  if (!productosAmostrar.length) {
    return (
      <section>
        <h2 className="text-3xl font-bold mb-6 text-center">
          Resultados de la búsqueda
        </h2>
        <p className="text-center text-2xl text-gray-500">
          No hay productos para mostrar.
        </p>
      </section>
    );
  }

  return (
    <section>
      <br />
      <h2 className="text-3xl font-bold mb-6 text-center">
        {busquedaActiva ? "Resultados de la búsqueda" : "Productos Destacados"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {productosAmostrar.map((producto) => (
          <ProductCard
            key={producto.id || producto.id}
            producto={producto as any}
          />
        ))}
      </div>
    </section>
  );
}

