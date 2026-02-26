"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCart, CartItem } from "@/lib/cartService";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function ResumenPage() {
  const router = useRouter();
  const { cliente, loading, token } = useClienteAuth();
  
  // Estados
  const [cart, setCart] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [shippingData, setShippingData] = useState<{ metodo: string, coste: number } | null>(null);
  
  // Cupón
  const [codigo, setCodigo] = useState("");
  const [descuento, setDescuento] = useState(0);

  // 1. Cargar Datos
  useEffect(() => {
    if (!loading) {
      if (!cliente) {
        router.push("/auth?redirect=/checkout/resumen");
        return;
      }

      // Cargar Carrito
      const items = getCart();
      if (items.length === 0) {
        router.push("/carrito");
        return;
      }
      setCart(items);

      // Calcular Subtotal
      const sub = items.reduce(
        (acc, item) => acc + (item.precioFinal ?? item.precio) * item.cantidad,
        0
      );
      setSubtotal(sub);

      // Cargar Envío
      const envioGuardado = localStorage.getItem("checkout_envio");
      if (envioGuardado) {
        setShippingData(JSON.parse(envioGuardado));
      } else {
        // Si no hay envío seleccionado, volver atrás
        router.push("/checkout/envio");
      }
    }
  }, [cliente, loading, router]);

  // 2. Lógica de Cupón
  const aplicarCupon = async () => {
    if (!codigo.trim()) return;
    try {
      // Usamos tu endpoint de validación
      const res = await fetch("/api/cupones/validate", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }) 
        },
        body: JSON.stringify({ codigo, subtotal }),
      });
      const data = await res.json();

      if (data.valid) {
        const montoDescuento = Number(data.descuentoCalculado);
        setDescuento(montoDescuento);
        
        // PERSISTENCIA: Guardamos el descuento para que la página de pago lo vea
        localStorage.setItem("checkout_descuento", montoDescuento.toString());
        
        toast.success(`Cupón aplicado: -${montoDescuento.toFixed(2)}€`);
      } else {
        setDescuento(0);
        // Limpiamos si el cupón deja de ser válido
        localStorage.removeItem("checkout_descuento");
        toast.error(data.error || "Cupón no válido");
      }

      
    } catch (error) {
      console.error(error);
      toast.error("Error al verificar el cupón");
    }
  };

  // Cálculos Finales
  const costeEnvio = shippingData?.coste || 0;
  const totalFinal = Math.max(0, subtotal + costeEnvio - descuento);

  // --- BLOQUEOS DE SEGURIDAD ---

  if (loading) return (
    <div className="min-h-screen flex justify-center items-center bg-fondo dark:bg-darkBg transition-colors">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // 🛑 CORRECCIÓN AQUÍ: Si no hay cliente (mientras redirige), no renderizamos nada más
  if (!cliente) return null; 

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg flex flex-col transition-colors duration-300">
      <main className="flex-1 flex justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-6xl">
            
            {/* Cabecera */}
            <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                    Resumen del Pedido 📋
                </h1>
                <p className="text-gray-500 dark:text-gray-400">Revisa tus artículos antes de pagar.</p>
                
                {/* Breadcrumbs */}
                <div className="hidden md:flex justify-center mt-6 gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span className="text-green-500 cursor-pointer hover:underline" onClick={() => router.push('/checkout/direcciones')}>1. Dirección</span> 
                    <span className="text-gray-300 dark:text-gray-600">&rarr;</span> 
                    <span className="text-green-500 cursor-pointer hover:underline" onClick={() => router.push('/checkout/envio')}>2. Envío</span> 
                    <span className="text-gray-300 dark:text-gray-600">&rarr;</span> 
                    <span className="text-primary border-b-2 border-primary pb-1">3. Resumen</span>
                    <span className="text-gray-300 dark:text-gray-600">&rarr;</span> 
                    <span>4. Pago</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
                
                {/* --- COLUMNA IZQUIERDA: LISTA DE PRODUCTOS --- */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Tarjeta de Lista */}
                    <div className="bg-white dark:bg-darkNavBg rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="font-bold text-gray-800 dark:text-white">Artículos ({cart.length})</h2>
                            <Link href="/carrito" className="text-sm text-primary hover:underline">Editar Carrito</Link>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {cart.map((item) => (
                                <div key={item.id} className="p-4 sm:p-6 flex gap-4 sm:gap-6 items-center">
                                    {/* Imagen */}
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200 dark:border-gray-600">
                                        {item.imagen ? (
                                            <img 
                                                src={item.imagen} 
                                                alt={item.nombre} 
                                                className="w-full h-full object-contain" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Sin img</div>
                                        )}
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg mb-1 line-clamp-2">
                                            {item.nombre}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                            {(item as any).atributo || 'Estándar'}
                                        </p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full">
                                                x{item.cantidad}
                                            </span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {((item.precioFinal ?? item.precio) * item.cantidad).toFixed(2)} €
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Datos de Envío Seleccionado */}
                    <div className="bg-white dark:bg-darkNavBg rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Método de Envío</h3>
                            <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {shippingData?.metodo === 'tienda' ? '🏬 Recogida en Tienda' : '🚚 Envío Express (Ontime)'}
                            </p>
                        </div>
                        <Link href="/checkout/envio" className="text-sm font-bold text-primary hover:text-primaryHover underline">
                            Cambiar
                        </Link>
                    </div>

                    {/* Datos de Dirección Resumidos */}
                    <div className="bg-white dark:bg-darkNavBg rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Dirección de Entrega</h3>
                            <p className="text-gray-900 dark:text-white text-sm">
                                {cliente.direccion}, {cliente.ciudad} ({cliente.codigoPostal})
                            </p>
                        </div>
                        <Link href="/checkout/direcciones" className="text-sm font-bold text-primary hover:text-primaryHover underline">
                            Editar
                        </Link>
                    </div>
                </div>

                {/* --- COLUMNA DERECHA: TOTALES (Sticky) --- */}
                <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6">
                    <div className="bg-white dark:bg-darkNavBg p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors">
                        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-4">
                            Importes
                        </h2>

                        <div className="space-y-3 text-sm mb-6">
                            <div className="flex justify-between text-gray-600 dark:text-gray-300">
                                <span>Subtotal</span>
                                <span>{subtotal.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-gray-600 dark:text-gray-300">
                                <span>Envío</span>
                                <span>{costeEnvio === 0 ? "Gratis" : `${costeEnvio.toFixed(2)} €`}</span>
                            </div>
                            {descuento > 0 && (
                                <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                                    <span>Descuento aplicado</span>
                                    <span>- {descuento.toFixed(2)} €</span>
                                </div>
                            )}
                        </div>

                        {/* Input Cupón */}
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                                Código Promocional
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="CÓDIGO"
                                    value={codigo}
                                    onChange={(e) => setCodigo(e.target.value)}
                                    className="flex-1 min-w-0 bg-white dark:bg-darkBg border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm outline-none focus:border-primary uppercase text-gray-900 dark:text-white"
                                />
                                <button 
                                    onClick={aplicarCupon}
                                    className="bg-gray-800 dark:bg-gray-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-black dark:hover:bg-gray-500 transition"
                                >
                                    APLICAR
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center mb-8">
                            <span className="text-lg font-bold text-gray-800 dark:text-white">Total</span>
                            <div className="text-right">
                                <span className="block text-3xl font-extrabold text-primary">
                                    {totalFinal.toFixed(2)} €
                                </span>
                                <span className="text-xs text-gray-400 font-medium">IVA incluido</span>
                            </div>
                        </div>

                        <button
                            onClick={() => router.push("/checkout/pago")}
                            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primaryHover transition-all shadow-lg shadow-yellow-500/20 hover:shadow-xl transform hover:-translate-y-0.5 flex justify-center items-center gap-2"
                        >
                            Ir a Pagar &rarr;
                        </button>
                    </div>

                    {/* Sellos de Seguridad */}
                    <div className="flex justify-center gap-4 opacity-50 grayscale">
                         <div className="text-[10px] border border-gray-300 dark:border-gray-600 px-2 py-1 rounded text-gray-500 dark:text-gray-400 font-bold">SSL SECURE</div>
                         <div className="text-[10px] border border-gray-300 dark:border-gray-600 px-2 py-1 rounded text-gray-500 dark:text-gray-400 font-bold">VISA</div>
                         <div className="text-[10px] border border-gray-300 dark:border-gray-600 px-2 py-1 rounded text-gray-500 dark:text-gray-400 font-bold">MASTERCARD</div>
                    </div>
                </div>

            </div>
        </div>
      </main>
    </div>
  );
}

