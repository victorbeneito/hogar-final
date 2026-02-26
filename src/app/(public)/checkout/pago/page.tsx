"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { getCart, CartItem, clearCart } from "@/lib/cartService"; // Añadido clearCart
import { toast } from "react-hot-toast";

import PasarelaRedsys from "@/components/PasarelaRedsys"; 
import PasarelaPaypal from "@/components/PasarelaPaypal"; 

export default function PagoPage() {
  const router = useRouter();
  const { cliente, loading } = useClienteAuth();

  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [costeEnvio, setCosteEnvio] = useState(0); // Estado para guardar el envío
  const [descuento, setDescuento] = useState(0);
  
  // Popups
  const [showRedsys, setShowRedsys] = useState(false);
  const [showPaypal, setShowPaypal] = useState(false);
  
  const [pedidoTempId, setPedidoTempId] = useState("");
  const [procesando, setProcesando] = useState(false); // Para deshabilitar botón al guardar

 useEffect(() => {
    if (!loading) {
        if (!cliente) { 
            router.push("/auth?redirect=/checkout/pago"); 
            return; 
        }
        
        const cart = getCart();
        if (cart.length === 0) { 
            router.push("/carrito"); 
            return; 
        }
        setCarrito(cart);

        // 1. Recuperar envío
        let envio = 0;
        const envioData = localStorage.getItem("checkout_envio");
        if (envioData) {
            const parsed = JSON.parse(envioData);
            envio = parsed.coste || 0;
            setCosteEnvio(envio);
        }

        // 2. Recuperar descuento del cupón <--- NUEVO
        const descuentoData = localStorage.getItem("checkout_descuento");
        const montoDescuento = descuentoData ? parseFloat(descuentoData) : 0;
        setDescuento(montoDescuento);

        // 3. Calcular total restando el descuento
        const subtotal = cart.reduce((acc, item) => acc + (item.precioFinal ?? item.precio) * item.cantidad, 0);
        
        // El total es: subtotal + envío - descuento (mínimo 0)
        setTotal(Math.max(0, subtotal + envio - montoDescuento));
    }
  }, [router, cliente, loading]); 

  // Recargo solo visual para contrareembolso
  const calcularTotalMostrado = () => {
    if (metodoPago === "contrareembolso") {
        // total ya tiene restado el descuento del cupón
        return (total + 3 + (total * 0.03)).toFixed(2);
    }
    return total.toFixed(2);
  };

  // 👇 AQUÍ ESTÁ LA MAGIA: Guardamos antes de seguir
  const handlePagarClick = async () => {
    if (!metodoPago) { 
        toast.error("Por favor, selecciona cómo quieres pagar"); 
        return; 
    }

    if (!cliente) return;

    setProcesando(true); // Bloqueamos botón
    const toastId = toast.loading("Registrando pedido...");

    // 1. Preparamos los datos para la BD
    const datosPedido = {
        clienteId: cliente.id,
        carrito: carrito,
        totalFinal: parseFloat(calcularTotalMostrado()), // Usamos el total final calculado
        subtotal: total - costeEnvio,
        descuentoAplicado: descuento,
        
        cliente: {
            nombre: cliente.nombre,
            email: cliente.email,
            telefono: cliente.telefono || "",
            direccion: cliente.direccion,
            ciudad: cliente.ciudad,
            cp: cliente.codigoPostal
        },
        
        metodoPago: { metodo: metodoPago },
        metodoEnvio: { metodo: "estándar", coste: costeEnvio }
    };

    try {
        // 2. Guardamos en BD
        const response = await fetch("/api/pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosPedido),
        });

        const data = await response.json();
        toast.dismiss(toastId);

        if (data.ok) {
            const realId = data.pedido.id; // ID REAL DE LA BD
            const numeroPedido = data.pedido.numeroPedido; // EJ: PED-2026-0001
            
            setPedidoTempId(String(realId)); // Actualizamos estado para los popups
            
            // Limpiamos carrito porque ya está guardado en BD (Pendiente de pago)
            // Opcional: Si prefieres borrarlo SOLO tras el pago exitoso, comenta esta línea.
            // clearCart(); 
            // window.dispatchEvent(new Event("storage"));

            // 3. --- ENRUTAMIENTO ORIGINAL (RESTAURO TU LÓGICA) ---
            if (metodoPago === 'tarjeta') {
                setShowRedsys(true); // Abre tu popup original
            } else if (metodoPago === 'paypal') {
                setShowPaypal(true); // Abre tu popup original
            } else if (metodoPago === 'contrareembolso') {
               router.push(`/checkout/pago/contrareembolso?id=${realId}&total=${datosPedido.totalFinal}`);
            } else if (metodoPago === 'transferencia') {
               router.push(`/checkout/pago/transferencia?id=${realId}&total=${datosPedido.totalFinal}`);
            } else if (metodoPago === 'bizum') {
               router.push(`/checkout/pago/bizum?id=${realId}&total=${datosPedido.totalFinal}`);
            }

        } else {
            toast.error(data.error || "Error al iniciar el pedido");
        }

    } catch (error) {
        console.error(error);
        toast.error("Error de conexión");
    } finally {
        setProcesando(false);
    }
  };

  const handleSuccess = () => {
    setShowRedsys(false);
    setShowPaypal(false);
    clearCart(); // Limpiamos carrito al confirmar pago exitoso
    localStorage.removeItem("checkout_descuento");
    window.dispatchEvent(new Event("storage"));
    router.push(`/checkout/confirmacion?pedido=${pedidoTempId}`);

  };

  if (loading) return (
    <div className="min-h-screen flex justify-center items-center bg-fondo dark:bg-darkBg transition-colors">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg flex flex-col transition-colors duration-300">
      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-4xl">
            
            {/* Cabecera */}
            <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                    Método de Pago 💳
                </h1>
                <p className="text-gray-500 dark:text-gray-400">Selecciona una forma de pago segura.</p>
                
                {/* Breadcrumbs */}
                <div className="hidden md:flex justify-center mt-6 gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span className="text-green-500 cursor-pointer hover:underline" onClick={() => router.push('/checkout/direcciones')}>1. Dirección</span> 
                    <span className="text-gray-300 dark:text-gray-600">&rarr;</span> 
                    <span className="text-green-500 cursor-pointer hover:underline" onClick={() => router.push('/checkout/envio')}>2. Envío</span> 
                    <span className="text-gray-300 dark:text-gray-600">&rarr;</span> 
                    <span className="text-primary border-b-2 border-primary pb-1">3. Pago</span>
                </div>
            </div>

            <div className="bg-white dark:bg-darkNavBg rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-10 transition-colors">
            
                {/* Selector de Pagos Completo */}
                <div className="space-y-4">
                    {[
                    { id: "tarjeta", label: "Pago con Tarjeta", desc: "Visa, Mastercard, Maestro. Pago inmediato.", icon: "💳" },
                    { id: "paypal", label: "PayPal", desc: "Paga con tu saldo PayPal o tarjeta asociada.", icon: "🅿️" },
                    { id: "bizum", label: "Bizum", desc: "Introduce tu móvil y paga al instante.", icon: "📱" },
                    { id: "transferencia", label: "Transferencia Bancaria", desc: "El pedido se enviará tras recibir el ingreso.", icon: "🏦" },
                    { id: "contrareembolso", label: "Contrareembolso", desc: "Paga en efectivo al recibirlo (+3€ y 3% recargo).", icon: "💵" },
                    ].map((opt) => (
                    <label 
                        key={opt.id} 
                        className={`relative flex items-center p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                            metodoPago === opt.id 
                            ? "border-primary bg-yellow-50 dark:bg-yellow-900/10 ring-1 ring-primary transform scale-[1.01]" 
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-transparent"
                        }`}
                    >
                        <input 
                            type="radio" 
                            name="pago" 
                            value={opt.id} 
                            checked={metodoPago === opt.id} 
                            onChange={() => setMetodoPago(opt.id)} 
                            className="absolute opacity-0 w-full h-full cursor-pointer z-10" 
                        />
                        
                        {/* Radio visual */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 flex-shrink-0 ${
                             metodoPago === opt.id ? "border-primary" : "border-gray-300 dark:border-gray-500"
                        }`}>
                            {metodoPago === opt.id && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
                        </div>

                        <div className="text-2xl mr-4">{opt.icon}</div>
                        
                        <div>
                            <span className={`font-bold block text-lg ${metodoPago === opt.id ? "text-primary" : "text-gray-800 dark:text-gray-200"}`}>
                                {opt.label}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {opt.desc}
                            </span>
                        </div>
                    </label>
                    ))}
                </div>

                <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-lg font-medium text-gray-600 dark:text-gray-300">Total a Pagar:</span>
                        <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                            {calcularTotalMostrado()} €</span>
                    </div>

                    <div className="flex flex-col-reverse md:flex-row justify-between gap-4">
                        <button
                            onClick={() => router.push('/checkout/envio')}
                            className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-bold"
                        >
                            &larr; Volver
                        </button>
                        
                        <button 
                            onClick={handlePagarClick} 
                            disabled={procesando}
                            className="flex-1 md:flex-none px-10 py-4 rounded-lg bg-primary text-white font-bold text-lg tracking-wide hover:bg-primaryHover transition-all shadow-lg shadow-yellow-500/30 transform active:scale-[0.98] flex justify-center items-center gap-2"
                        >
                            {procesando ? 'Guardando...' : 
                             metodoPago === 'transferencia' || metodoPago === 'bizum' || metodoPago === 'contrareembolso' 
                                ? 'Continuar y Ver Datos \u2192' 
                                : 'Pagar Ahora 🔒'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
      </main>

      {/* Modales Invisibles CON ID ACTUALIZADO */}
      <PasarelaRedsys 
          isOpen={showRedsys} 
          onClose={() => setShowRedsys(false)} 
          onSuccess={handleSuccess} 
          importe={calcularTotalMostrado()} // Total correcto
          orderId={pedidoTempId} // ID REAL de la base de datos
      />
      <PasarelaPaypal 
          isOpen={showPaypal} 
          onClose={() => setShowPaypal(false)} 
          onSuccess={handleSuccess} 
          importe={calcularTotalMostrado()} 
          orderId={pedidoTempId} 
      />
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useClienteAuth } from "@/context/ClienteAuthContext";
// import { getCart, CartItem } from "@/lib/cartService";

// import PasarelaRedsys from "@/components/PasarelaRedsys"; 
// import PasarelaPaypal from "@/components/PasarelaPaypal"; 

// export default function PagoPage() {
//   const router = useRouter();
//   const { cliente } = useClienteAuth();

//   const [carrito, setCarrito] = useState<CartItem[]>([]);
//   const [metodoPago, setMetodoPago] = useState<string | null>(null);
//   const [total, setTotal] = useState(0);
  
//   // Popups
//   const [showRedsys, setShowRedsys] = useState(false);
//   const [showPaypal, setShowPaypal] = useState(false);
  
//   const [pedidoTempId, setPedidoTempId] = useState("");

//   useEffect(() => {
//     if (!cliente) { router.push("/auth"); return; }
//     const cart = getCart();
//     if (cart.length === 0) { router.push("/carrito"); return; }
//     setCarrito(cart);

//     let costeEnvio = 0;
//     const envioData = localStorage.getItem("checkout_envio");
//     if (envioData) costeEnvio = JSON.parse(envioData).coste || 0;

//     const subtotal = cart.reduce((acc, item) => acc + (item.precioFinal ?? item.precio) * item.cantidad, 0);
//     setTotal(subtotal + costeEnvio);
//   }, [router, cliente]);

//   // Recargo solo visual para contrareembolso
//   const calcularTotalMostrado = () => {
//     if (metodoPago === "contrareembolso") return (total + 3 + (total * 0.03)).toFixed(2);
//     return total.toFixed(2);
//   };

//   const handlePagarClick = () => {
//     if (!metodoPago) { alert("Selecciona un método de pago"); return; }

//     const idSimulado = String(Math.floor(1000 + Math.random() * 9000));
//     setPedidoTempId(idSimulado);

//     // --- ENRUTAMIENTO DE PAGOS ---
//     if (metodoPago === 'tarjeta') {
//       setShowRedsys(true); 
//     } else if (metodoPago === 'paypal') {
//       setShowPaypal(true); 
//     } else if (metodoPago === 'contrareembolso') {
//        router.push('/checkout/pago/contrareembolso');
//     } else if (metodoPago === 'transferencia') {
//        router.push('/checkout/pago/transferencia');
//     } else if (metodoPago === 'bizum') {
//        router.push('/checkout/pago/bizum');
//     }
//   };

//   const handleSuccess = () => {
//     setShowRedsys(false);
//     setShowPaypal(false);
//     router.push(`/checkout/confirmacion?pedido=${pedidoTempId}`);
//   };

//   return (
//     <div className="max-w-3xl mx-auto px-4 py-12">
//       <h1 className="text-3xl font-bold mb-6 text-gray-900">Método de pago 💳</h1>

//       {/* Selector de Pagos Completo */}
//       <div className="space-y-4">
//         {[
//           { id: "tarjeta", label: "💳 Pago con tarjeta (Redsys)", desc: "Pago seguro instantáneo" },
//           { id: "paypal", label: "💰 Pagar con PayPal", desc: "Usa tu saldo o tarjeta" },
//           { id: "bizum", label: "📱 Bizum", desc: "Envío inmediato al móvil" },
//           { id: "transferencia", label: "🏦 Transferencia Bancaria", desc: "El pedido se enviará tras recibir el pago" },
//           { id: "contrareembolso", label: "💵 Contrareembolso", desc: "+3€ y 3% comisión de gestión" },
//         ].map((opt) => (
//           <label key={opt.id} className={`block border rounded-lg p-4 cursor-pointer transition-colors ${metodoPago === opt.id ? "border-primary bg-yellow-50 ring-1 ring-primary" : "hover:border-primary"}`}>
//             <div className="flex items-center">
//               <input type="radio" name="pago" value={opt.id} checked={metodoPago === opt.id} onChange={() => setMetodoPago(opt.id)} className="mr-3 h-5 w-5 text-primary" />
//               <div>
//                   <span className="font-bold text-gray-800 block">{opt.label}</span>
//                   <span className="text-xs text-gray-500">{opt.desc}</span>
//               </div>
//             </div>
//           </label>
//         ))}
//       </div>

//       <div className="mt-10 border-t pt-6 flex justify-between items-center">
//         <div className="text-lg font-bold">Total: <span className="text-primary text-2xl">{calcularTotalMostrado()} €</span></div>
//         <button onClick={handlePagarClick} className="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-primaryHover transition">
//           {metodoPago === 'transferencia' || metodoPago === 'bizum' ? 'Ver Datos de Pago ->' : 'Pagar Ahora ->'}
//         </button>
//       </div>

//       {/* Modales */}
//       <PasarelaRedsys isOpen={showRedsys} onClose={() => setShowRedsys(false)} onSuccess={handleSuccess} importe={total.toFixed(2)} orderId={pedidoTempId} />
//       <PasarelaPaypal isOpen={showPaypal} onClose={() => setShowPaypal(false)} onSuccess={handleSuccess} importe={total.toFixed(2)} orderId={pedidoTempId} />
//     </div>
//   );
// }