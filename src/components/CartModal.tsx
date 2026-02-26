// /components/CartModal.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
}

export default function CartModal({ isOpen, onClose, productName }: CartModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleContinueShopping = () => {
    onClose();
  };

  const handleGoToCart = () => {
    router.push("/carrito"); // redirige al carrito
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-sm text-center"
        onClick={(e) => e.stopPropagation()} // evita cerrar al hacer clic dentro
      >
        <h2 className="text-xl font-semibold mb-3">
          {productName ? (
            <>✅ "{productName}" se ha añadido al carrito</>
          ) : (
            "✅ Producto añadido al carrito"
          )}
        </h2>

        <p className="dark:text-gray-200 mb-6">¿Qué deseas hacer a continuación?</p>

        <div className="flex justify-center gap-4">F
          <button
            onClick={handleContinueShopping}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Seguir comprando
          </button>
          <button
            onClick={handleGoToCart}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            Finalizar compra
          </button>
        </div>
      </div>
    </div>
  );
}
