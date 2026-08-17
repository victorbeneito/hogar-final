"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ProductQuickViewModal from "@/components/ProductQuickViewModal";
import { SIZES_TARJETA_CATALOGO, urlImagenProducto } from "@/lib/imagenes";

interface ProductCardProps {
  producto: any;
  /**
   * Marca la imagen como prioritaria: se precarga y no espera al scroll. Sólo debe
   * activarse en las tarjetas visibles al abrir la página (la primera fila), que es
   * donde suele estar el LCP. Si se marcan todas, no prioriza ninguna y se descarga
   * el catálogo entero de golpe.
   */
  prioridad?: boolean;
  /**
   * `sizes` de next/image. Por defecto el de la rejilla del catálogo; la portada usa
   * una rejilla distinta (3 columnas) y pasa el suyo.
   */
  sizes?: string;
}

export default function ProductCard({
  producto,
  prioridad = false,
  sizes = SIZES_TARJETA_CATALOGO,
}: ProductCardProps) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  if (!producto) return null;

  const precioBase = Number(producto.precio ?? 0);
  const precioOferta = producto.precioOferta != null ? Number(producto.precioOferta) : null;
  const tieneOferta = precioOferta !== null && Number.isFinite(precioOferta) && precioOferta < precioBase;
  const precioActual = tieneOferta ? precioOferta : precioBase;
  const descuentoPct = tieneOferta && precioBase > 0 ? Math.round((1 - precioActual / precioBase) * 100) : 0;

  const urlImagen = urlImagenProducto(
    producto.imagenPortada ||
      producto.imagenes?.[0] ||
      producto.productoimagen?.[0]?.url
  );

  const clearTimer = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current !== null) {
      window.clearTimeout(ref.current);
      ref.current = null;
    }
  };

  const openQuickView = () => {
    clearTimer(closeTimerRef);
    window.dispatchEvent(new CustomEvent("product-quickview-close-all"));
    setQuickViewOpen(true);
  };

  const handleMouseEnter = () => {
    clearTimer(closeTimerRef);
    clearTimer(hoverTimerRef);
    hoverTimerRef.current = window.setTimeout(openQuickView, 4000);
  };

  const handleMouseLeave = () => {
    clearTimer(hoverTimerRef);
    if (!quickViewOpen) {
      closeTimerRef.current = window.setTimeout(() => setQuickViewOpen(false), 250);
    }
  };

  useEffect(() => {
    const handleCloseAll = () => setQuickViewOpen(false);
    window.addEventListener("product-quickview-close-all", handleCloseAll as EventListener);

    return () => {
      window.removeEventListener("product-quickview-close-all", handleCloseAll as EventListener);
      clearTimer(hoverTimerRef);
      clearTimer(closeTimerRef);
    };
  }, []);


  useEffect(() => {
    if (!producto?.prestashopProductId) return;
    const timer = setTimeout(() => {
      const w = window as any;
      if (w.ReviWidget?.init) { try { w.ReviWidget.init(); } catch (_) { /* */ } }
      else if (w.__revilabsEmbeds) { try { w.__revilabsEmbeds(); } catch (_) { /* */ } }
    }, 300);
    return () => clearTimeout(timer);
  }, [producto?.prestashopProductId]);

  return (
    <>
      <div
        className="group font-poppins bg-white rounded-lg shadow-sm p-4 flex flex-col items-center border border-gray-200 relative overflow-hidden
                   hover:shadow-lg hover:-translate-y-1 transition-all duration-300 w-full max-w-[360px] mx-auto h-full justify-between
                   cursor-pointer dark:bg-darkNavBg dark:text-darkNavText"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* La cinta sólo señala que hay oferta. El porcentaje va abajo, junto a los
            precios (ver el bloque de precio más adelante), y cada uno hace un trabajo
            distinto: la cinta se ve al recorrer la rejilla con la vista, el porcentaje
            convence cuando ya estás mirando la tarjeta y comparando 134,80 con 60,65.

            Historia, para no repetirla: antes había aquí una segunda etiqueta con el
            porcentaje en `absolute top-10 left-0`. Como la foto empieza en `mt-10`,
            las dos arrancaban a la misma altura y el porcentaje se comía la esquina de
            la imagen. Si alguna vez se vuelve a poner algo flotando aquí, tiene que
            quedar POR ENCIMA de donde empieza la foto, o bajar la foto a `mt-16`.

            El color va por el token `bg-accent`: antes era un naranja escrito a mano y
            por eso la corrección de contraste de la paleta no le llegaba (2,18:1; hoy
            3,25:1, que es lo que pide la norma para texto grande en negrita como éste).
            No se escribe aquí el hex viejo a propósito — Tailwind rastrea el texto del
            fichero buscando nombres de clase y no distingue los comentarios, así que
            mencionarlo con su prefijo volvía a generar la clase muerta. Comprobado. */}
        {tieneOferta && (
          <div className="absolute top-0 left-0 right-0 bg-accent text-white text-xs sm:text-sm font-black uppercase tracking-wide text-center py-1.5 shadow-sm">
            ¡En oferta!
          </div>
        )}

        <Link href={`/productos/${producto.slug ?? producto.id}`} className="w-full">
          <div className="w-full">
            {/* `fill` necesita un contenedor posicionado. Se conservan las mismas
                medidas y márgenes que tenía el <img> para que no cambie el diseño. */}
            <div
              className={`relative w-full h-72 ${tieneOferta ? "mt-10 mb-3" : "mb-3"}`}
            >
              <Image
                src={urlImagen}
                alt={producto.nombre}
                fill
                sizes={sizes}
                priority={prioridad}
                className="object-contain rounded-md transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>

            <div className="p-2 text-center">
              <h3 className="text-md font-semibold text-center mb-1 line-clamp-2 min-h-[3rem]">
                {producto.nombre}
              </h3>

              {tieneOferta ? (
                <div className="mb-0 space-y-0">
                  {/* Precio tachado + pastilla del descuento, en la misma línea.
                      `flex-wrap` porque en las tarjetas estrechas los dos no caben y
                      es preferible que la pastilla baje de línea a que se salga.

                      El gris es el 500 (#6B7280) y no el 400 (#9CA3AF): el 400 sobre
                      blanco da 2,54:1 y PageSpeed lo marcaba. El 500 da 4,83:1 y sigue
                      leyéndose como precio secundario, que es lo que se busca — que se
                      vea tachado, no borroso. */}
                  <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    <span>
                      Precio base <span className="line-through">{precioBase.toFixed(2)} €</span>
                    </span>
                    {/* Pastilla en coral oscuro sobre tinte claro (5,07:1). NO lleva
                        blanco sobre el coral normal: eso son 3,25:1 y este texto es
                        pequeño, así que necesita 4,5:1. Ver tailwind.config.js. */}
                    <span className="rounded bg-accentSuave px-1.5 py-0.5 tracking-normal text-accentOscuro">
                      -{descuentoPct}%
                    </span>
                  </p>
                  <p className="text-accent font-extrabold dark:text-darkNavText text-2xl">
                    {precioActual.toFixed(2)} €
                  </p>
                </div>
              ) : (
                <p className="text-accent font-bold mb-0 dark:text-darkNavText text-xl">
                  {precioBase ? `${precioBase.toFixed(2)} €` : "Sin precio"}
                </p>
              )}
            </div>
          </div>
        </Link>

        {/* REVI Widget */}
        {producto.prestashopProductId && (
          <div className="w-full px-0 py-0">
            <div
              className="revi-widget-KyG01X4Rv5"
              data-revi-widget-lazy=""
              data-id-product={String(producto.prestashopProductId)}
              data-lang="es"
              style={{ minHeight: '50px' }}
            />
          </div>
        )}

        <div className="p-2 w-full">
          <Link
            href={`/productos/${producto.slug ?? producto.id}`}
            className="w-full mt-auto px-6 py-3 rounded font-bold transition-all duration-300 shadow-md flex justify-center items-center gap-2 bg-primary text-white hover:bg-primaryHover dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Ver opciones
          </Link>
        </div>
      </div>

      <ProductQuickViewModal
        productId={producto.id}
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}
