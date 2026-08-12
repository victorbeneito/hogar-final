"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

// Estos banners van en la mitad inferior de la portada: NO llevan `priority`, se
// cargan cuando el visitante se acerca a ellos. Los de arriba (BannerPrincipal) sí
// lo llevan; marcar todos como prioritarios equivale a no priorizar ninguno.
//
// El `sizes` de los tres pequeños refleja su rejilla: 1 columna en móvil y 3 desde
// `sm` (640px), dentro de un contenedor de 1280px.
const SIZES_BANNER_PEQUENO = "(max-width: 639px) 100vw, 420px";

// Los dos anchos ocupan todo el ancho del contenedor.
const SIZES_BANNER_ANCHO = "(max-width: 1279px) 100vw, 1280px";

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
      {/* Banner intermedio - Medidas Personalizadas */}
      <div
        onClick={() => router.push('/medidas-personalizadas')}
        className="mb-10 cursor-pointer group"
        title="Ver medidas personalizadas"
      >
        {/* Alto fijo y recorte: `fill` dentro de un contenedor posicionado con esa
            altura. Con width/height el navegador respetaría la proporción del
            fichero (2362x472) y no la caja de 250 px que queremos. */}
        <div className="relative w-full h-[250px] overflow-hidden rounded-lg shadow-md">
          <Image
            src="/img/banner-medidas.jpg"
            alt="Estores y cortinas fabricados a medida para tu ventana"
            fill
            sizes={SIZES_BANNER_ANCHO}
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      </div>

      {/* Tres banners pequeños clicables */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div
  onClick={() => irCategoriaPorNombre("Fundas de Sofá")}
  className="cursor-pointer w-full rounded-lg shadow"
  title="Ver productos de Fundas de Sofá"
>
  <Image
    src="/img/banner-fundas-sofa.jpg"
    alt="Fundas de sofá elásticas y ajustables"
    width={1024}
    height={890}
    sizes={SIZES_BANNER_PEQUENO}
    className="w-full h-auto object-contain rounded-lg shadow"
  />
</div>

<div
  onClick={() => irCategoriaPorNombre("Cojines")}
  className="cursor-pointer w-full rounded-lg shadow"
  title="Ver productos de Cojines"
>
  {/* El fichero original son 2208x1920 y 508 KB, el más pesado de la portada,
      para mostrarse en una columna de ~420 px. next/image lo reescala. */}
  <Image
    src="/img/banner-cojines.jpg"
    alt="Cojines decorativos y fundas de cojín para salón"
    width={2208}
    height={1920}
    sizes={SIZES_BANNER_PEQUENO}
    className="w-full h-auto object-contain rounded-lg shadow"
  />
</div>

<div
  onClick={() => irCategoriaPorNombre("Ropa de Cama")}
  className="cursor-pointer w-full rounded-lg shadow"
  title="Ver productos de Ropa de Cama"
>
  <Image
    src="/img/banner-ropa-cama.jpg"
    alt="Ropa de cama: fundas nórdicas, sábanas y edredones"
    width={1024}
    height={905}
    sizes={SIZES_BANNER_PEQUENO}
    className="w-full h-auto object-contain rounded-lg shadow"
  />
</div>

      </div>

      {/* Banner final */}
      <div className="relative w-full h-[300px] overflow-hidden rounded-lg shadow-lg">
        <Image
          src="/img/banner-envios.jpg"
          alt="Envíos a toda España"
          fill
          sizes={SIZES_BANNER_ANCHO}
          className="object-cover"
        />
      </div>
    </section>
  );
}
