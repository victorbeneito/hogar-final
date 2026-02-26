"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCart, clearCart, CartItem } from "@/lib/cartService";
import Link from "next/link";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { cliente, loading, token } = useClienteAuth();
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  const [codigo, setCodigo] = useState("");
  const [descuento, setDescuento] = useState(0);

  useEffect(() => {
    if (!loading && !cliente) {
      router.push("/auth?redirect=/checkout");
      return;
    }

    if (!loading && cliente) {
      // Validación básica de dirección
      if (!cliente.direccion || !cliente.ciudad || !cliente.codigoPostal) {
        toast("Por favor, completa tu dirección de envío", { icon: "🚚" });
        router.push("/direcciones?next=/checkout"); // Redirige y vuelve aquí
        return;
      }

      const cartItems = getCart();
      if (cartItems.length === 0) {
        router.push("/carrito");
        return;
      }

      setCarrito(cartItems);

      const totalCalc = cartItems.reduce(
        (acc, item) => acc + (item.precioFinal ?? item.precio) * item.cantidad,
        0
      );
      setTotal(totalCalc);
    }
  }, [cliente, loading, router]);

  const aplicarCupon = async () => {
    try {
      if (!token) {
        toast.error("Debes iniciar sesión para aplicar un cupón");
        return;
      }
      
      const res = await fetchWithAuth("/api/cupones/validate", token, {
        method: "POST",
        body: JSON.stringify({ codigo, subtotal: total }),
      });

      if (res.valid) {
        setDescuento(res.descuento);
        toast.success(`¡Cupón aplicado! Ahorras un ${res.descuento}%`);
      } else {
        setDescuento(0);
        toast.error(res.error || "Cupón no válido");
      }
    } catch (error) {
      toast.error("Error al validar el cupón");
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🖱️ CLICK EN CONFIRMAR PEDIDO DETECTADO");

    // 🛑 1. GUARDIA DE SEGURIDAD (Esto arregla el error 'possibly null')
    // Si no hay cliente, paramos aquí y TypeScript se queda tranquilo.
    if (!cliente) {
        toast.error("Error: No se ha identificado al usuario.");
        return;
    }

    // A partir de aquí, TypeScript ya sabe que 'cliente' EXISTE seguro.

    const totalConDescuento = total - (total * descuento) / 100;

    // 2. Preparamos los datos (Ahora sin líneas rojas)
    const datosPedido = {
        clienteId: cliente.id, 
        carrito: carrito,
        totalFinal: totalConDescuento,
        subtotal: total,
        descuento: (total * descuento) / 100,
        cliente: {
            nombre: cliente.nombre,
            email: cliente.email,
            telefono: cliente.telefono || "", // Fallback por si es null
            direccion: cliente.direccion,
            ciudad: cliente.ciudad,
            cp: cliente.codigoPostal
        },
        metodoPago: { metodo: "tarjeta" },
        metodoEnvio: { metodo: "estándar", coste: 0 }
    };

    console.log("📤 ENVIANDO DATOS AL SERVIDOR:", datosPedido);

    try {
        const toastId = toast.loading("Conectando con el servidor...");

        const response = await fetch("/api/pedidos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(datosPedido),
        });

        console.log("📩 RESPUESTA RECIBIDA. Status:", response.status);

        const data = await response.json();
        console.log("📦 DATOS RESPUESTA:", data);

        toast.dismiss(toastId);

        if (data.ok) {
            toast.success("¡Pedido guardado correctamente!");
            clearCart();
            setPedidoEnviado(true);
            window.dispatchEvent(new Event("storage"));
        } else {
            console.error("❌ ERROR API:", data.error);
            toast.error(data.error || "Error al guardar el pedido");
        }

    } catch (error) {
        console.error("🔥 ERROR DE RED:", error);
        toast.error("Error de conexión al guardar");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">
          Cargando tus datos...
        </p>
      </div>
    );
  }

  if (!cliente) return null;

  if (pedidoEnviado) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
            <svg className="w-10 h-10 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          ¡Pedido Recibido! 🎉
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md text-lg">
          Gracias por tu compra. Hemos enviado los detalles a tu correo electrónico <strong>{cliente.email}</strong>.
        </p>
        <Link
          href="/"
          className="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-primaryHover transition shadow-lg transform hover:-translate-y-1"
        >
          Volver a la tienda
        </Link>
      </div>
    );
  }

  const totalConDescuento = total - (total * descuento) / 100;

  return (
    // Contenedor principal responsive
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-gray-900 dark:text-white flex items-center gap-2">
        <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
        Finalizar Compra
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
        
        {/* --- COLUMNA IZQUIERDA: FORMULARIO --- */}
        {/* --- COLUMNA IZQUIERDA: FORMULARIO (MODIFICADO) --- */}
        <div className="lg:col-span-2 space-y-6">
          {/* ⚠️ CAMBIO 1: Ya no es un <form>, es un <div> para evitar comportamientos raros */}
          <div className="bg-white dark:bg-darkNavBg p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    📍 Dirección de Envío
                 </h2>
                 <button type="button" onClick={() => router.push("/direcciones?next=/checkout")} className="text-sm text-primary underline">Cambiar</button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
                <p className="font-bold">{cliente.nombre}</p>
                <p>{cliente.direccion}, {cliente.ciudad} ({cliente.codigoPostal})</p>
            </div>

            {/* ⚠️ CAMBIO 2: Botón con onClick directo y texto cambiado para verificar */}
            <button
              type="button" 
              onClick={handleSubmit}
              disabled={loading} // Evita doble click
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition shadow-md flex justify-center items-center gap-2"
            >
              {loading ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <span>PAGAR AHORA (REAL) 💳</span> 
                  {/* He cambiado el texto para que sepas si se ha actualizado */}
                </>
              )}
            </button>
            <p className="text-xs text-center text-gray-400 mt-4">Al confirmar, se guardará el pedido en la base de datos.</p>
          </div>
        </div>

            

        {/* --- COLUMNA DERECHA: RESUMEN (Sticky en PC) --- */}
        <div className="lg:col-span-1 lg:sticky lg:top-24">
          <div className="bg-white dark:bg-darkNavBg p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
              Resumen del Pedido
            </h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-1">
              {carrito.map((item) => (
                <div key={item.id} className="flex gap-3 text-sm">
                   {/* Imagen miniatura opcional si la tienes en item.imagen */}
                   {item.imagen && (
                       <div className="w-12 h-12 flex-shrink-0 relative rounded-md overflow-hidden border border-gray-200 dark:border-gray-600">
                           <img src={item.imagen} alt={item.nombre} className="object-cover w-full h-full" />
                       </div>
                   )}
                   <div className="flex-1">
                      <p className="font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                        {item.nombre}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Cant: {item.cantidad}
                      </p>
                   </div>
                   <div className="font-bold text-gray-900 dark:text-white">
                      {((item.precioFinal ?? item.precio) * item.cantidad).toFixed(2)}€
                   </div>
                </div>
              ))}
            </div>

            <hr className="my-6 border-gray-200 dark:border-gray-700" />

            {/* Cupón */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
                Código promocional
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="CUPON2026"
                  className="flex-1 uppercase border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-darkBg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
                <button
                  type="button"
                  onClick={aplicarCupon}
                  className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Aplicar
                </button>
              </div>
              {descuento > 0 && (
                <div className="mt-2 text-green-600 dark:text-green-400 text-xs font-bold bg-green-50 dark:bg-green-900/20 p-2 rounded flex items-center gap-1">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                   Cupón del {descuento}% aplicado
                </div>
              )}
            </div>

            {/* Totales */}
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{total.toFixed(2)} €</span>
                </div>
                {descuento > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Descuento</span>
                        <span>- {((total * descuento) / 100).toFixed(2)} €</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span>Envío</span>
                    <span className="text-green-600 font-medium">Gratis</span>
                </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-base font-bold text-gray-900 dark:text-white">Total a Pagar</span>
                <span className="text-2xl font-extrabold text-primary">
                    {totalConDescuento.toFixed(2)} €
                </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}