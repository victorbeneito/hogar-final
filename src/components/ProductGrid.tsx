"use client";

import React from "react";
import ProductCard from "./ProductCard";
import { SIZES_TARJETA_PORTADA } from "@/lib/imagenes";

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
        {/* Aquí ponía `prioridad={i < 3}`, razonando que la primera fila son tres
            tarjetas. Eso vale en escritorio, pero en móvil la rejilla es de UNA
            columna y estas tarjetas quedan debajo de la cabecera, el menú, el titular
            y los dos banners: nunca se ven al cargar.

            El resultado era que la portada precargaba SIETE imágenes a la vez (2
            banners + 2 logos + 3 productos), todas con la misma prioridad. Con la red
            limitada que simula PageSpeed se estorban entre ellas y el banner que es el
            LCP llega tarde: 12,2 s en la medición del 2026-08-12.

            Sin `prioridad`, estas imágenes se cargan cuando el visitante se acerca a
            ellas, que es lo correcto para algo que está fuera de pantalla. */}
        {productosAmostrar.map((producto) => (
          <ProductCard
            key={producto.id}
            producto={producto as any}
            sizes={SIZES_TARJETA_PORTADA}
          />
        ))}
      </div>
    </section>
  );
}

