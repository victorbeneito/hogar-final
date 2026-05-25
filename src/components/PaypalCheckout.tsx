"use client";

import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import toast from "react-hot-toast";
import type { OnApproveData, CreateOrderData } from "@paypal/checkout-server-sdk";

interface PaypalCheckoutProps {
  pedidoId: string;
  total: number;
  currency?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function PaypalCheckout({
  pedidoId,
  total,
  currency = "EUR",
  onSuccess,
  onError,
}: PaypalCheckoutProps) {
  const [{ isPending }] = usePayPalScriptReducer();

  if (isPending) {
    return <div className="text-center py-4 text-gray-500">Cargando PayPal...</div>;
  }

  return (
    <div className="w-full">
      <PayPalButtons
        createOrder={async () => {
          try {
            const res = await fetch("/api/paypal/crear-orden", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pedidoId, total, currency }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create order");

            return data.id;
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error creating order");
            throw error;
          }
        }}
        onApprove={async (data: OnApproveData) => {
          try {
            const res = await fetch("/api/paypal/capturar-orden", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderID: data.orderID }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed to capture order");

            toast.success("¡Pago completado exitosamente!");
            onSuccess?.(result);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al procesar el pago");
            onError?.(error);
          }
        }}
        onError={(err) => {
          console.error("PayPal error:", err);
          toast.error("Error en el pago con PayPal");
          onError?.(err);
        }}
        style={{
          layout: "vertical",
          color: "blue",
          shape: "rect",
          label: "pay",
        }}
      />
    </div>
  );
}
