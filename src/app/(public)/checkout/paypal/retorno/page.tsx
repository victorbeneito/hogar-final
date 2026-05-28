"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaypalRetornoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");     // PayPal order ID
    const payerId = searchParams.get("PayerID"); // Payer ID (present when approved)
    const pedidoId = searchParams.get("pedidoId");

    if (!token || !payerId) {
      // User cancelled payment on PayPal
      router.push("/checkout/pago");
      return;
    }

    fetch("/api/paypal/capturar-orden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderID: token, pedidoId: pedidoId ? parseInt(pedidoId, 10) : null }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setStatus("success");
          setTimeout(() => {
            router.push(`/checkout/confirmacion?pedido=${pedidoId ?? ""}`);
          }, 1500);
        } else {
          setStatus("error");
          setErrorMsg(data.error || "Error al capturar el pago");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Error de conexión al confirmar el pago");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-fondo dark:bg-darkBg">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-[#0070ba] rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Confirmando pago...</h2>
        <p className="text-gray-500 mt-2 text-sm">No cierres esta página</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-fondo dark:bg-darkBg px-4">
        <div className="w-20 h-20 mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Error en el pago</h2>
        <p className="text-gray-500 mb-8 text-sm text-center">{errorMsg}</p>
        <button
          onClick={() => router.push("/checkout/pago")}
          className="bg-[#0070ba] hover:bg-[#003087] text-white font-bold py-3 px-8 rounded-full transition"
        >
          Volver al pago
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-fondo dark:bg-darkBg">
      <div className="w-20 h-20 mb-6 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">¡Pago confirmado!</h2>
      <p className="text-gray-500 text-sm">Redirigiendo a la confirmación...</p>
    </div>
  );
}
