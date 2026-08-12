"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Estos dos banners están en la mitad superior de la portada, así que llevan
// `priority`: son de los primeros elementos grandes que ve el visitante y suelen
// disputarle el LCP a las tarjetas de producto.
//
// width/height son las dimensiones reales del fichero (1024x617). No fijan el tamaño
// en pantalla —de eso se encarga `w-full h-auto`— pero le dan al navegador la
// proporción por adelantado, así que reserva el hueco y la página no da un salto
// cuando la imagen termina de cargar.
const ANCHO_BANNER = 1024;
const ALTO_BANNER = 617;

// La rejilla es de 1 columna en móvil y 2 desde `md` (768px), dentro de un contenedor
// de 1280px como máximo.
const SIZES_BANNER = "(max-width: 767px) 100vw, 640px";

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
        <Image
          src="/img/banner-estores-digitales.jpg"
          alt="Estores digitales a medida para salón, dormitorio y cocina"
          width={ANCHO_BANNER}
          height={ALTO_BANNER}
          sizes={SIZES_BANNER}
          priority
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Banner Estores Lisos */}
      <div
        className="rounded-lg shadow-lg cursor-pointer"
        onClick={() => irCategoriaPorNombre("Estores Lisos")}
        title="Ver productos de Estores Lisos"
      >
        <Image
          src="/img/banner-estores-lisos.jpg"
          alt="Estores lisos enrollables en varios colores y medidas"
          width={ANCHO_BANNER}
          height={ALTO_BANNER}
          sizes={SIZES_BANNER}
          priority
          className="w-full h-auto object-contain"
        />
      </div>
    </section>
  );
}
