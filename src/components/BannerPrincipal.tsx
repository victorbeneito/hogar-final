"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// PageSpeed identificó el primer banner como el elemento LCP de la portada, así que
// es EL ÚNICO de toda la página que debe precargarse con prioridad alta.
//
// El segundo banner ya NO lleva `priority`. En móvil la rejilla es de una columna, o
// sea que queda debajo del primero y fuera de la pantalla inicial: precargarlo sólo
// servía para robarle ancho de banda al que sí importa. En escritorio se ve al lado y
// entra una fracción de segundo después, que allí sobra (va a 93 puntos).
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
        {/* `fetchPriority="high"` va explícito porque `priority` a secas NO lo pone:
            comprobado en el HTML de producción el 2026-08-12, la etiqueta salía sólo
            con `decoding="async"`. Sin él, el navegador precarga esta imagen con la
            misma prioridad que las demás y PageSpeed lo marca como fallo. */}
        <Image
          src="/img/banner-estores-digitales.jpg"
          alt="Estores digitales a medida para salón, dormitorio y cocina"
          width={ANCHO_BANNER}
          height={ALTO_BANNER}
          sizes={SIZES_BANNER}
          priority
          fetchPriority="high"
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
          className="w-full h-auto object-contain"
        />
      </div>
    </section>
  );
}
