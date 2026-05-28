"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RedsysKoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RedsysKoContent />
    </Suspense>
  );
}

function RedsysKoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pedidoId = searchParams.get("pedido");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans px-4">
      {/* Cabecera Redsys */}
      <div className="fixed top-0 left-0 right-0 bg-[#f6b919] h-14 flex items-center px-6 shadow-md z-10">
        <span className="font-extrabold text-white text-xl tracking-wider">Redsys</span>
        <span className="ml-3 text-white/80 text-sm hidden md:inline">TPV Virtual</span>
      </div>

      <div className="mt-14 w-full max-w-md text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-3">Pago No Completado</h1>
        <p className="text-gray-500 text-lg mb-2">
          La operación ha sido cancelada o rechazada por su entidad bancaria.
        </p>
        <p className="text-sm text-gray-400 mb-8">
          No se ha realizado ningún cargo. Puedes intentarlo de nuevo con otra tarjeta o método de pago.
        </p>

        {pedidoId && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Referencia:</span>
              <span className="font-bold text-gray-800">{pedidoId}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/checkout/pago")}
            className="w-full bg-[#f6b919] text-white px-8 py-3 rounded-lg font-bold hover:bg-yellow-500 transition shadow-md"
          >
            Intentar de nuevo
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full border border-gray-300 text-gray-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-50 transition"
          >
            Volver a la tienda
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-200 py-3 text-center text-xs text-gray-400">
        Redsys Procesamiento de Pagos Seguros &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
