"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  importe: string;
  orderId: string;
}

export default function PasarelaPaypal({ isOpen, onClose, onSuccess, importe, orderId }: Props) {
  const [step, setStep] = useState<"idle" | "processing" | "error">("idle");

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setStep("idle"), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function iniciarPago() {
    setStep("processing");
    try {
      const res = await fetch("/api/paypal/crear-orden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Sin importe: lo pone el servidor desde el pedido guardado
        body: JSON.stringify({ pedidoId: orderId, currency: "EUR" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando orden PayPal");
      if (!data.approvalUrl) throw new Error("PayPal no devolvió URL de aprobación");

      // Redirección directa — sin popup, sin iframe
      window.location.href = data.approvalUrl;
    } catch (error: any) {
      console.error("PayPal error:", error);
      toast.error(error.message || "Error al conectar con PayPal");
      setStep("error");
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans text-gray-800">
      <div className="bg-white w-full h-full md:h-auto md:max-w-[450px] md:rounded-xl shadow-2xl relative flex flex-col overflow-hidden">

        {/* CABECERA */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-center relative shadow-sm h-16 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-[#003087] font-bold text-2xl italic font-serif tracking-tighter">Pay</span>
            <span className="text-[#009cde] font-bold text-2xl italic font-serif tracking-tighter">Pal</span>
          </div>
          {step === "idle" && (
            <button
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto bg-[#f7f9fa]">

          {step === "idle" && (
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-4">
                <div>
                  <p className="text-xs uppercase font-bold tracking-wide text-gray-400 mb-1">Pagar a</p>
                  <p className="font-bold text-gray-900 text-lg">El Hogar de tus Sueños</p>
                </div>
                <span className="text-2xl font-normal text-gray-900">{importe} €</span>
              </div>

              <p className="text-sm text-gray-500 mb-6 text-center">
                Serás redirigido a PayPal para completar el pago de forma segura.
              </p>

              <button
                onClick={iniciarPago}
                className="w-full mb-3 bg-[#ffc439] hover:bg-[#f0b429] text-[#003087] font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 text-lg shadow-md"
              >
                <span className="font-serif italic">Pagar con </span>
                <span className="font-serif italic font-bold text-[#009cde]">Pay</span>
                <span className="font-serif italic font-bold text-[#003087]">Pal</span>
              </button>

              <button
                onClick={iniciarPago}
                className="w-full mb-6 bg-[#1c1c1c] hover:bg-[#333] text-white font-bold py-3.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeWidth="2" />
                  <line x1="1" y1="10" x2="23" y2="10" strokeWidth="2" />
                </svg>
                Tarjeta de débito o crédito
              </button>

              <p className="text-xs text-gray-400 text-center mb-4">
                Desarrollado por <strong>PayPal</strong>
              </p>

              <button
                onClick={onClose}
                className="w-full text-[#0070ba] font-bold text-sm hover:underline text-center"
              >
                Cancelar y volver
              </button>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-center">
              <div className="w-16 h-16 border-4 border-gray-100 border-t-[#0070ba] rounded-full animate-spin mb-6" />
              <h3 className="text-xl font-bold text-[#2c2e2f]">Conectando con PayPal...</h3>
              <p className="text-gray-500 mt-2 text-sm">Serás redirigido automáticamente</p>
            </div>
          )}

          {step === "error" && (
            <div className="p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="w-20 h-20 mb-6 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Error en el pago</h2>
              <p className="text-gray-500 mb-8 text-sm">No se pudo conectar con PayPal. Inténtalo de nuevo.</p>
              <button
                onClick={() => setStep("idle")}
                className="w-full bg-[#0070ba] hover:bg-[#003087] text-white font-bold py-3.5 rounded-full transition-all mb-3"
              >
                Intentar de nuevo
              </button>
              <button
                onClick={onClose}
                className="w-full text-[#0070ba] font-bold text-sm hover:underline"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-[#f7f9fa] py-4 text-center text-[10px] text-gray-400 border-t border-gray-200 shrink-0">
          PayPal &copy; 1999-{new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
