"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { clearCart } from "@/lib/cartService";
import { DEFAULT_PAYMENT_CONFIG, normalizePaymentConfig, type PaymentCheckoutConfig } from "@/lib/paymentSettings";

export default function TransferenciaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentCheckoutConfig>(DEFAULT_PAYMENT_CONFIG);

  const importeFinal = parseFloat(searchParams.get("total") || "0").toFixed(2);
  const pedidoId = searchParams.get("id");

  useEffect(() => {
    if (!pedidoId) {
      router.push("/carrito");
      return;
    }
    fetch("/api/formas-pago/configuracion", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setPaymentConfig(normalizePaymentConfig(data.config)))
      .catch(() => setPaymentConfig(DEFAULT_PAYMENT_CONFIG));
  }, [pedidoId, router]);

  const copiarIBAN = () => {
    navigator.clipboard.writeText(paymentConfig.transferencia.iban);
    toast.success("IBAN copiado al portapapeles");
  };

  const handleConfirmar = async () => {
    if (!pedidoId) return;
    setLoading(true);
    try {
      // Enviar emails de confirmación ahora que el usuario ha confirmado
      await fetch("/api/pedidos/confirmar-transferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: parseInt(pedidoId, 10) }),
      });
    } catch {
      // No bloqueamos la redirección si falla el email
    }
    // Limpiar carrito y redirigir a confirmación
    clearCart();
    localStorage.removeItem("checkout_descuento");
    localStorage.removeItem("checkout_envio");
    window.dispatchEvent(new Event("storage"));
    router.push(`/checkout/confirmacion?pedido=${pedidoId}`);
  };

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg py-12 px-4 flex justify-center items-start font-sans transition-colors duration-300">
      <div className="max-w-xl w-full bg-white dark:bg-darkNavBg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">

        {/* Cabecera */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-center relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-10%] w-32 h-32 bg-white opacity-10 rounded-full" />
          <h1 className="text-2xl font-bold uppercase tracking-widest text-white relative z-10">Transferencia Bancaria</h1>
          <p className="text-blue-100 text-sm mt-2 relative z-10">{paymentConfig.transferencia.instrucciones}</p>
        </div>

        <div className="p-8 md:p-10 space-y-8">

          {/* Aviso */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-5 rounded-r-lg shadow-sm">
            <div className="flex gap-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                <strong>Nota:</strong> Tu pedido se preparará una vez recibamos el ingreso en nuestra cuenta (1-2 días laborables).
              </p>
            </div>
          </div>

          {/* Datos Bancarios */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 bg-gray-50 dark:bg-gray-800/30 text-center relative">
            <p className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Entidad Bancaria</p>
            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-6 flex items-center justify-center gap-2">
              <span className="text-2xl">🏦</span> {paymentConfig.transferencia.banco}
            </h3>

            <div className="mb-6">
              <p className="text-gray-400 text-xs uppercase font-bold mb-2 tracking-wider">IBAN para el ingreso</p>
              <div
                onClick={copiarIBAN}
                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4 rounded-lg shadow-sm cursor-pointer hover:border-blue-400 transition-colors group relative"
                title="Click para copiar"
              >
                <code className="text-lg md:text-2xl font-mono font-bold text-gray-800 dark:text-white tracking-wider block">
                  {paymentConfig.transferencia.iban}
                </code>
                <p className="text-[10px] text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click para copiar</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto border-t border-gray-200 dark:border-gray-700 pt-4">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Beneficiario</p>
                <p className="font-medium text-gray-800 dark:text-white text-sm">{paymentConfig.transferencia.titular}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Concepto (Vital)</p>
                <p className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 inline-block px-2 py-0.5 rounded text-sm border border-blue-100 dark:border-blue-800">
                  Pedido #{pedidoId}
                </p>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center py-4 border-t border-gray-100 dark:border-gray-700">
            <span className="font-bold text-lg text-gray-700 dark:text-gray-300">Importe a transferir:</span>
            <span className="font-extrabold text-3xl text-gray-900 dark:text-white">{importeFinal} €</span>
          </div>

          {/* Botones */}
          <div className="space-y-4 pt-2">
            <button
              onClick={handleConfirmar}
              disabled={loading}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 transition-all flex justify-center items-center gap-3 ${loading ? "opacity-70 cursor-wait" : ""}`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Confirmando...</span>
                </>
              ) : (
                <>
                  <span>Confirmar Pedido</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>

            <button
              onClick={() => router.back()}
              disabled={loading}
              className="w-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-medium transition-colors"
            >
              Cancelar — elegir otro método de pago
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
