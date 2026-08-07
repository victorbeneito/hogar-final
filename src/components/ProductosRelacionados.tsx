"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductoRelacionado {
  id: number;
  nombre: string;
  slug?: string | null;
  precio: number;
  precioOferta?: number | null;
  stock?: number | null;
  destacado?: boolean;
  imagenPortada?: string | null;
  marca?: { id: number; nombre: string } | null;
  categoria?: { id: number; nombre: string } | null;
}

/** Los thumbnails de PrestaShop llevan sufijos (-home_default...); la original se ve mejor en el carrusel. */
const fullResUrl = (url: string) =>
  url.replace(/-(?:home|large|medium|small|thickbox|cart)_default(?=\.[^.]+$)/, "");

// Ancho de cada tarjeta: 1,6 visibles en móvil → 5 en pantallas grandes (gap-4 = 1rem).
const ANCHO_TARJETA =
  "w-[62%] sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)] xl:w-[calc((100%-4rem)/5)]";

export default function ProductosRelacionados({
  productoId,
  titulo = "Productos relacionados",
  subtitulo = "Otras opciones que también te pueden encantar",
  limite = 12,
}: {
  productoId: number;
  titulo?: string;
  subtitulo?: string;
  limite?: number;
}) {
  const [productos, setProductos] = useState<ProductoRelacionado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [visible, setVisible] = useState(false);
  const [puedeIzquierda, setPuedeIzquierda] = useState(false);
  const [puedeDerecha, setPuedeDerecha] = useState(false);

  const seccionRef = useRef<HTMLElement | null>(null);
  const carruselRef = useRef<HTMLDivElement | null>(null);
  const pausadoRef = useRef(false);

  // Solo pedimos los relacionados cuando la sección se acerca al viewport (la ficha carga antes).
  useEffect(() => {
    const nodo = seccionRef.current;
    if (!nodo) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(nodo);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !productoId) return;

    const controlador = new AbortController();
    (async () => {
      try {
        setCargando(true);
        const res = await fetch(`/api/productos/${productoId}/relacionados?limit=${limite}`, {
          signal: controlador.signal,
        });
        if (!res.ok) throw new Error("Respuesta no válida");
        const data = await res.json();
        setProductos(Array.isArray(data.productos) ? data.productos : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("No se pudieron cargar los productos relacionados:", error);
          setProductos([]);
        }
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    })();

    return () => controlador.abort();
  }, [visible, productoId, limite]);

  const actualizarFlechas = useCallback(() => {
    const nodo = carruselRef.current;
    if (!nodo) return;
    const maxScroll = nodo.scrollWidth - nodo.clientWidth;
    setPuedeIzquierda(nodo.scrollLeft > 8);
    setPuedeDerecha(nodo.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    actualizarFlechas();
    window.addEventListener("resize", actualizarFlechas);
    return () => window.removeEventListener("resize", actualizarFlechas);
  }, [actualizarFlechas, productos]);

  const desplazar = useCallback((direccion: 1 | -1) => {
    const nodo = carruselRef.current;
    if (!nodo) return;
    const maxScroll = nodo.scrollWidth - nodo.clientWidth;
    const salto = nodo.clientWidth * 0.9;

    // Al llegar al final volvemos al principio (carrusel infinito visualmente)
    if (direccion === 1 && nodo.scrollLeft >= maxScroll - 8) {
      nodo.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    if (direccion === -1 && nodo.scrollLeft <= 8) {
      nodo.scrollTo({ left: maxScroll, behavior: "smooth" });
      return;
    }
    nodo.scrollBy({ left: salto * direccion, behavior: "smooth" });
  }, []);

  // Autoplay suave: avanza cada 5s y se detiene mientras el usuario interactúa.
  useEffect(() => {
    if (productos.length < 3) return;
    const prefiereMenosMovimiento =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefiereMenosMovimiento) return;

    const intervalo = window.setInterval(() => {
      if (!pausadoRef.current && document.visibilityState === "visible") desplazar(1);
    }, 5000);
    return () => window.clearInterval(intervalo);
  }, [productos.length, desplazar]);

  if (!cargando && productos.length === 0) return null;

  return (
    <section
      ref={seccionRef}
      aria-label={titulo}
      className="bg-white dark:bg-darkNavBg shadow rounded-lg p-4 sm:p-6 transition-colors duration-300"
    >
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">{titulo}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitulo}</p>
        </div>

        {!cargando && productos.length > 1 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => desplazar(-1)}
              aria-label="Ver productos anteriores"
              className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all ${
                puedeIzquierda
                  ? "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-primary hover:text-white hover:border-primary"
                  : "border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600"
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => desplazar(1)}
              aria-label="Ver más productos"
              className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all ${
                puedeDerecha
                  ? "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-primary hover:text-white hover:border-primary"
                  : "border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600"
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={carruselRef}
          onScroll={actualizarFlechas}
          onMouseEnter={() => (pausadoRef.current = true)}
          onMouseLeave={() => (pausadoRef.current = false)}
          onFocusCapture={() => (pausadoRef.current = true)}
          onBlurCapture={() => (pausadoRef.current = false)}
          onTouchStart={() => (pausadoRef.current = true)}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {cargando
            ? [...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`${ANCHO_TARJETA} shrink-0 snap-start rounded-xl border border-gray-100 dark:border-gray-700 p-3 animate-pulse`}
                >
                  <div className="aspect-square w-full rounded-lg bg-gray-200 dark:bg-gray-700 mb-3" />
                  <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                  <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))
            : productos.map((p) => <TarjetaRelacionado key={p.id} producto={p} />)}
        </div>

        {/* Degradados laterales que insinúan que hay más productos */}
        {puedeIzquierda && (
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white dark:from-darkNavBg to-transparent" />
        )}
        {puedeDerecha && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white dark:from-darkNavBg to-transparent" />
        )}
      </div>
    </section>
  );
}

function TarjetaRelacionado({ producto }: { producto: ProductoRelacionado }) {
  const precioBase = Number(producto.precio ?? 0);
  const precioOferta = producto.precioOferta != null ? Number(producto.precioOferta) : null;
  const tieneOferta = precioOferta !== null && Number.isFinite(precioOferta) && precioOferta < precioBase;
  const precioActual = tieneOferta ? (precioOferta as number) : precioBase;
  const descuentoPct = tieneOferta && precioBase > 0 ? Math.round((1 - precioActual / precioBase) * 100) : 0;
  const imagen = producto.imagenPortada ? fullResUrl(producto.imagenPortada) : "/img/no-image.jpg";

  return (
    <Link
      href={`/productos/${producto.slug ?? producto.id}`}
      className={`${ANCHO_TARJETA} group shrink-0 snap-start rounded-xl border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-darkNavBg p-3 flex flex-col
                  transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      <div className="relative mb-3 overflow-hidden rounded-lg bg-white">
        {tieneOferta && (
          <span className="absolute top-2 left-2 z-10 rounded-md bg-[#f39a66] px-2 py-1 text-xs font-black text-white shadow-sm">
            -{descuentoPct}%
          </span>
        )}
        <img
          src={imagen}
          alt={producto.nombre}
          loading="lazy"
          className="aspect-square w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <h3 className="text-sm font-semibold text-gray-900 dark:text-darkNavText line-clamp-2 min-h-[2.5rem] mb-2">
        {producto.nombre}
      </h3>

      <div className="mt-auto">
        {tieneOferta ? (
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-extrabold text-accent dark:text-darkNavText">
              {precioActual.toFixed(2)} €
            </span>
            <span className="text-sm text-gray-400 line-through">{precioBase.toFixed(2)} €</span>
          </div>
        ) : (
          <span className="text-lg font-extrabold text-accent dark:text-darkNavText">
            {precioBase ? `${precioBase.toFixed(2)} €` : "Consultar"}
          </span>
        )}

        <span className="mt-2 block text-center text-xs font-bold text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          Ver producto →
        </span>
      </div>
    </Link>
  );
}
