"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProductQuickViewModal from "@/components/ProductQuickViewModal";

interface ProductCardProps {
  producto: any;
}

export default function ProductCard({ producto }: ProductCardProps) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  if (!producto) return null;

  const precioBase = Number(producto.precio ?? 0);
  const precioOferta = producto.precioOferta != null ? Number(producto.precioOferta) : null;
  const tieneOferta = precioOferta !== null && Number.isFinite(precioOferta) && precioOferta < precioBase;
  const precioActual = tieneOferta ? precioOferta : precioBase;
  const descuentoPct = tieneOferta && precioBase > 0 ? Math.round((1 - precioActual / precioBase) * 100) : 0;

  const urlImagen =
    producto.imagenPortada ||
    producto.imagenes?.[0] ||
    producto.productoimagen?.[0]?.url ||
    "/img/no-image.jpg";

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
        {tieneOferta && (
          <>
            <div className="absolute top-0 left-0 right-0 bg-[#f39a66] text-white text-xs sm:text-sm font-black uppercase tracking-wide text-center py-1.5 shadow-sm">
              ¡En oferta!
            </div>
            <div className="absolute top-10 left-0 bg-[#f39a66] text-white text-xs font-black px-3 py-1 rounded-r-md shadow-sm">
              -{descuentoPct}%
            </div>
          </>
        )}

        <Link href={`/productos/${producto.slug ?? producto.id}`} className="w-full">
          <div className="w-full">
            <img
              src={urlImagen}
              alt={producto.nombre}
              className={`w-full h-72 object-contain rounded-md transition-transform duration-300 group-hover:scale-[1.02] ${
                tieneOferta ? "mt-10 mb-3" : "mb-3"
              }`}
            />

            <div className="p-2 text-center">
              <h3 className="text-md font-semibold text-center mb-1 line-clamp-2 min-h-[3rem]">
                {producto.nombre}
              </h3>

              {tieneOferta ? (
                <div className="mb-0 space-y-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                    Precio base <span className="line-through text-gray-400">{precioBase.toFixed(2)} €</span>
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
