"use client";

export const dynamic = "force-dynamic";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearCart } from "@/lib/cartService";

export default function RedsysOkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RedsysOkContent />
    </Suspense>
  );
}

function RedsysOkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pedidoId = searchParams.get("pedido");

  useEffect(() => {
    clearCart();
    localStorage.removeItem("checkout_descuento");
    localStorage.removeItem("checkout_envio");
    window.dispatchEvent(new Event("storage"));

    const confirmarYRedirigir = async () => {
      // Intentar confirmar el pago (fallback por si el webhook no llegó a localhost)
      if (pedidoId) {
        try {
          await fetch("/api/redsys/confirmar-ok", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pedidoId: parseInt(pedidoId, 10) }),
          });
        } catch {
          // No bloqueamos la redirección si falla
        }
      }

      router.replace(
        pedidoId
          ? `/checkout/confirmacion?pedido=${pedidoId}`
          : "/checkout/confirmacion"
      );
    };

    const timeout = setTimeout(confirmarYRedirigir, 1500);
    return () => clearTimeout(timeout);
  }, [pedidoId, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans px-4">
      {/* Cabecera Redsys */}
      <div className="fixed top-0 left-0 right-0 bg-[#f6b919] h-14 flex items-center px-6 shadow-md z-10">
        <span className="font-extrabold text-white text-xl tracking-wider">Redsys</span>
        <span className="ml-3 text-white/80 text-sm hidden md:inline">TPV Virtual</span>
      </div>

      <div className="mt-14 w-full max-w-md text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-3">¡Pago Autorizado!</h1>
        <p className="text-gray-500 text-lg mb-8">
          Su entidad bancaria ha confirmado la operación correctamente.
        </p>

        {pedidoId && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Número de pedido:</span>
              <span className="font-bold text-gray-800">{pedidoId}</span>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-400 animate-pulse">
          Confirmando pago y redirigiendo...
        </p>

        <button
          onClick={() =>
            router.replace(
              pedidoId
                ? `/checkout/confirmacion?pedido=${pedidoId}`
                : "/checkout/confirmacion"
            )
          }
          className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
        >
          Ir a mi pedido &rarr;
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-200 py-3 text-center text-xs text-gray-400">
        Redsys Procesamiento de Pagos Seguros &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
