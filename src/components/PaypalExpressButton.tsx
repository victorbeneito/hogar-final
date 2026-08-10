"use client";

import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { getCart, clearCart, type CartItem } from "@/lib/cartService";

/**
 * Checkout express: pagar desde el carrito (o desde la ficha de producto) sin
 * pasar por identificación, direcciones ni selección de envío. PayPal aporta el
 * email y la dirección del comprador, y el servidor calcula todos los importes.
 *
 * El botón "Finalizar compra" de siempre sigue estando: esto es una vía rápida
 * alternativa, no un reemplazo.
 */
export default function PaypalExpressButton({
  items,
  disabled,
  onBeforePay,
}: {
  /** Qué se compra. Si no se pasa, se usa el carrito completo. */
  items?: CartItem[];
  disabled?: boolean;
  /** Devuelve false para abortar (p. ej. faltan opciones del producto). */
  onBeforePay?: () => boolean;
}) {
  const router = useRouter();
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [procesando, setProcesando] = useState(false);
  // Congelamos el carrito al abrir el popup: así el importe aprobado y el
  // cobrado se calculan sobre exactamente los mismos artículos.
  const itemsRef = useRef<CartItem[]>([]);

  if (isRejected) return null; // PayPal no configurado: no mostramos nada
  if (isPending) {
    return <div className="h-11 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />;
  }

  const resolverItems = () => (items && items.length > 0 ? items : getCart());

  const payload = (extra: Record<string, unknown> = {}) => ({
    items: itemsRef.current.map((i) => ({
      id: i.id,
      cantidad: i.cantidad,
      tamanoSeleccionado: i.tamanoSeleccionado ?? null,
      colorSeleccionado: i.colorSeleccionado ?? null,
      tiradorSeleccionado: i.tiradorSeleccionado ?? null,
      nombre: i.nombre,
    })),
    ...extra,
  });

  return (
    <div className={disabled || procesando ? "pointer-events-none opacity-50" : ""}>
      <PayPalButtons
        style={{ layout: "vertical", color: "gold", shape: "rect", label: "checkout", height: 44 }}
        disabled={disabled || procesando}
        createOrder={async () => {
          if (onBeforePay && !onBeforePay()) throw new Error("Selección incompleta");

          const actuales = resolverItems();
          if (actuales.length === 0) {
            toast.error("Tu carrito está vacío");
            throw new Error("Carrito vacío");
          }
          itemsRef.current = actuales;

          const res = await fetch("/api/paypal/express/crear-orden", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload()),
          });
          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error || "No se pudo iniciar el pago");
            throw new Error(data.error || "Error creando la orden");
          }
          return data.id;
        }}
        onShippingAddressChange={async (data: any, actions: any) => {
          // PayPal avisa al elegir dirección: recalculamos portes de esa zona
          const res = await fetch("/api/paypal/express/envio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload({ orderId: data.orderID, direccion: data.shippingAddress })),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || "No enviamos a esa dirección");
            return actions.reject();
          }
          return actions.resolve?.();
        }}
        onApprove={async (data: any) => {
          setProcesando(true);
          const cargando = toast.loading("Confirmando tu pedido...");
          try {
            // 1. Crear el pedido con la dirección que nos da PayPal
            const resPrep = await fetch("/api/paypal/express/preparar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload({ orderId: data.orderID })),
            });
            const prep = await resPrep.json();
            if (!resPrep.ok || !prep.ok) throw new Error(prep.error || "No se pudo registrar el pedido");

            // 2. Cobrar con el mismo endpoint que el checkout normal
            const resCap = await fetch("/api/paypal/capturar-orden", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderID: data.orderID, pedidoId: prep.pedidoId }),
            });
            const cap = await resCap.json();
            if (!resCap.ok || cap.status !== "COMPLETED") {
              throw new Error(cap.error || "El pago no se completó");
            }

            toast.dismiss(cargando);
            toast.success("¡Pago completado!");
            clearCart();
            window.dispatchEvent(new Event("storage"));
            router.push(`/checkout/confirmacion?pedido=${prep.pedidoId}`);
          } catch (error: any) {
            toast.dismiss(cargando);
            toast.error(error?.message || "Error al procesar el pago");
            setProcesando(false);
          }
        }}
        onError={(err) => {
          console.error("PayPal express:", err);
          toast.error("Error con PayPal. Prueba el proceso de compra normal.");
          setProcesando(false);
        }}
        onCancel={() => setProcesando(false)}
      />
    </div>
  );
}
