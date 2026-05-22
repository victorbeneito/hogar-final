"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { clearCart } from "@/lib/cartService";
import { DEFAULT_PAYMENT_CONFIG, normalizePaymentConfig, type PaymentCheckoutConfig } from "@/lib/paymentSettings";

export default function BizumPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentCheckoutConfig>(DEFAULT_PAYMENT_CONFIG);
  const [pedidoId, setPedidoId] = useState("");
  const [importeFinal, setImporteFinal] = useState("0.00");
  const [datosPedido, setDatosPedido] = useState<any>(null);

  useEffect(() => {
    // Leer datos del pedido del sessionStorage
    if (typeof window !== "undefined") {
      const dataStr = sessionStorage.getItem("checkout_pedido_pending");
      if (!dataStr) {
        toast.error("Datos del pedido no encontrados");
        router.push("/checkout/pago");
        return;
      }

      const data = JSON.parse(dataStr);
      setDatosPedido(data);
      setImporteFinal(parseFloat(data.totalFinal || "0").toFixed(2));
    }

    fetch("/api/formas-pago/configuracion", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setPaymentConfig(normalizePaymentConfig(data.config)))
      .catch(() => setPaymentConfig(DEFAULT_PAYMENT_CONFIG));
  }, [router]);

  const copiarTelefono = () => {
    navigator.clipboard.writeText(paymentConfig.bizum.telefono);
    toast.success("Teléfono copiado al portapapeles");
  };

  const handleConfirmar = async () => {
    if (!datosPedido) return;
    setLoading(true);
    try {
      // 1. Crear el pedido
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosPedido),
      });

      const data = await response.json();

      if (!data.ok) {
        toast.error(data.error || "Error al crear el pedido");
        setLoading(false);
        return;
      }

      const newPedidoId = data.pedido.id;
      setPedidoId(String(newPedidoId));

      // 2. Enviar emails de confirmación
      await fetch("/api/pedidos/confirmar-bizum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: newPedidoId }),
      });

      // 3. Limpiar y redirigir
      sessionStorage.removeItem("checkout_pedido_pending");
      clearCart();
      localStorage.removeItem("checkout_descuento");
      localStorage.removeItem("checkout_envio");
      window.dispatchEvent(new Event("storage"));
      router.push(`/checkout/confirmacion?pedido=${newPedidoId}`);
    } catch (error) {
      console.error(error);
      toast.error("Error al confirmar el pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg py-12 px-4 flex justify-center items-start font-sans transition-colors duration-300">
      <div className="max-w-xl w-full bg-white dark:bg-darkNavBg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">

        {/* Cabecera */}
        <div className="bg-gradient-to-r from-[#00bfa5] to-[#009688] p-8 text-center relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-10%] w-32 h-32 bg-white opacity-10 rounded-full" />
          <div className="absolute bottom-[-20%] right-[-10%] w-24 h-24 bg-white opacity-10 rounded-full" />
          <h1 className="text-3xl font-extrabold text-white tracking-wider italic relative z-10">bizum</h1>
          <p className="text-teal-50 text-sm mt-2 font-medium relative z-10">{paymentConfig.bizum.instrucciones}</p>
        </div>

        <div className="p-8 md:p-10 space-y-8">

          {/* Aviso */}
          <div className="bg-teal-50 dark:bg-teal-900/20 border-l-4 border-[#00bfa5] p-5 rounded-r-lg shadow-sm">
            <div className="flex gap-4">
              <svg className="w-6 h-6 text-[#009688] dark:text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-teal-800 dark:text-teal-200 leading-relaxed">
                <strong>Nota:</strong> Tu pedido se preparará una vez confirmemos la recepción del pago por Bizum.
              </p>
            </div>
          </div>

          {/* Datos de pago */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 bg-gray-50 dark:bg-gray-800/30 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00bfa5] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Datos de envío
            </div>

            <div className="mt-2 mb-6">
              <p className="text-gray-400 text-xs uppercase font-bold mb-2 tracking-wider">Teléfono destino</p>
              <div
                onClick={copiarTelefono}
                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4 rounded-lg shadow-sm cursor-pointer hover:border-[#00bfa5] transition-colors group relative"
                title="Click para copiar"
              >
                <code className="text-2xl md:text-3xl font-mono font-bold text-gray-800 dark:text-white tracking-wider block">
                  {paymentConfig.bizum.telefono}
                </code>
                <p className="text-[10px] text-teal-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click para copiar</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-400 uppercase font-bold mb-2 tracking-wider">Concepto (Importante)</p>
              <p className="text-xl font-bold text-[#009688] dark:text-[#4db6ac] bg-teal-50 dark:bg-teal-900/30 inline-block px-4 py-2 rounded-lg border border-teal-100 dark:border-teal-800">
                {paymentConfig.bizum.conceptoPrefix} {pedidoId}
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center py-4 border-t border-gray-100 dark:border-gray-700">
            <span className="font-bold text-lg text-gray-700 dark:text-gray-300">Importe a pagar:</span>
            <span className="font-extrabold text-3xl text-gray-900 dark:text-white">{importeFinal} €</span>
          </div>

          {/* Botones */}
          <div className="space-y-4 pt-2">
            <button
              onClick={handleConfirmar}
              disabled={loading}
              className={`w-full bg-[#009688] hover:bg-[#00796b] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-teal-500/20 transition-all flex justify-center items-center gap-3 ${loading ? "opacity-70 cursor-wait" : ""}`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Confirmando...</span>
                </>
              ) : (
                <>
                  <span>Confirmar Pago Realizado</span>
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

          <p className="text-[10px] text-center text-gray-400">
            Tu pedido se procesará una vez confirmemos la recepción del pago.
          </p>
        </div>
      </div>
    </div>
  );
}
