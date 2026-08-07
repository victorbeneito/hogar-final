"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { getCart } from "@/lib/cartService";
import { getGuestCheckout } from "@/lib/guestCheckout";

export default function IdentificacionPage() {
  const router = useRouter();
  const { cliente, loading } = useClienteAuth();
  const [comprobando, setComprobando] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (getCart().length === 0) {
      router.replace("/carrito");
      return;
    }

    // Ya identificado por cualquiera de las dos vías: seguimos el checkout
    if (cliente) {
      router.replace("/checkout/direcciones");
      return;
    }
    if (getGuestCheckout()) {
      router.replace("/checkout/envio");
      return;
    }

    setComprobando(false);
  }, [cliente, loading, router]);

  if (loading || comprobando) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-fondo dark:bg-darkBg transition-colors">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg flex flex-col transition-colors duration-300">
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
              ¿Cómo quieres continuar?
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Puedes comprar sin registrarte. Sólo necesitamos tus datos de envío y un email de contacto.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* --- INVITADO --- */}
            <div className="bg-white dark:bg-darkNavBg rounded-2xl border-2 border-primary shadow-xl p-6 md:p-8 flex flex-col relative">
              <span className="absolute -top-3 left-6 bg-primary text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">
                Más rápido
              </span>

              <div className="text-4xl mb-4">⚡</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Comprar como invitado</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Sin crear cuenta ni contraseña. Te enviaremos la confirmación, el seguimiento del envío y
                cualquier comunicación del pedido a tu correo.
              </p>

              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-8 flex-1">
                <li className="flex gap-2"><span className="text-green-500">✓</span> Un solo formulario</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Notificaciones por email</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Podrás crear la cuenta después</li>
              </ul>

              <Link
                href="/checkout/invitado"
                className="block text-center bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primaryHover transition-all shadow-lg shadow-yellow-500/20 transform active:scale-95"
              >
                Continuar sin cuenta →
              </Link>
            </div>

            {/* --- CUENTA --- */}
            <div className="bg-white dark:bg-darkNavBg rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 md:p-8 flex flex-col">
              <div className="text-4xl mb-4">🔒</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tengo cuenta / quiero crearla</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Guarda tus direcciones, consulta el historial de pedidos y repite compras en dos clics.
              </p>

              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-8 flex-1">
                <li className="flex gap-2"><span className="text-green-500">✓</span> Historial de pedidos</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Direcciones guardadas</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Facturas siempre disponibles</li>
              </ul>

              <Link
                href="/auth?redirect=/checkout/direcciones"
                className="block text-center border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 py-3.5 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                Iniciar sesión o registrarme
              </Link>
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => router.push("/carrito")}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
            >
              ← Volver al carrito
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
