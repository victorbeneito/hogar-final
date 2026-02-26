"use client";

import React, { useState } from "react";
import Link from "next/link";
// Asegúrate de que la ruta a tu servicio de carrito es correcta
import { addToCart } from "@/lib/cartService"; 

interface ProductCardProps {
  producto: any;
}

export default function ProductCard({ producto }: ProductCardProps) {
  // Estado para el feedback visual del botón
  const [isAdded, setIsAdded] = useState(false);

  if (!producto) return null;

  const urlImagen =
    producto.imagenes && producto.imagenes.length > 0
      ? producto.imagenes[0]
      : "/img/no-image.jpg";

  // Función para añadir al carrito sin entrar al producto
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();  // 1. Evita navegar a /productos/ID
    e.stopPropagation(); // 2. Evita que el clic suba al Link padre

    // 3. Añadimos al carrito
    addToCart({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: urlImagen,
      cantidad: 1,
      atributo: "Estándar" // Valor por defecto si no hay selectores
    });

    // 4. Feedback visual
    setIsAdded(true);
    
    // Forzamos actualización del contador del header (si usa evento storage)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
    }

    // Resetear botón a los 1.5 segundos
    setTimeout(() => {
      setIsAdded(false);
    }, 1500);
  };

  return (
    <Link href={`/productos/${producto.id}`} className="block h-full">
      <div
        className="font-poppins bg-white rounded-lg shadow-sm p-4 flex flex-col items-center border border-gray-200
                   hover:shadow-lg hover:-translate-y-1 transition-all duration-300 w-full max-w-[360px] mx-auto h-full justify-between
                   cursor-pointer dark:bg-darkNavBg dark:text-darkNavText"
      >
        <div className="w-full">
          <img
            src={urlImagen}
            alt={producto.nombre}
            className="w-full h-72 object-contain mb-3 rounded-md"
          />
          <div className="p-4 text-center">
            <h3 className="text-md font-semibold text-center mb-1 line-clamp-2 min-h-[3rem]">
              {producto.nombre}
            </h3>

            <p className="font-orienta text-gray-500 text-sm text-center mb-2 dark:text-darkNavText">
              {typeof producto.categoria === "object"
                ? producto.categoria?.nombre
                : "Sin categoría"}
            </p>

            <p className="text-accent font-bold mb-3 dark:text-darkNavText text-lg">
              {producto.precio
                ? `${producto.precio.toFixed(2)} €`
                : "Sin precio"}
            </p>
          </div>
        </div>

        <div className="p-3 w-full">
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isAdded} // Desactivamos mientras muestra el mensaje de éxito
            className={`w-full mt-auto px-6 py-3 rounded font-bold transition-all duration-300 shadow-md flex justify-center items-center gap-2 ${
                isAdded 
                ? "bg-gray-400 text-white hover:gray-900 scale-105" 
                : "bg-primary text-white hover:bg-primaryHover dark:bg-gray-700 dark:hover:bg-gray-600"
            }`}
          >
            {isAdded ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  ¡Añadido!
                </>
            ) : (
                "Comprar"
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}