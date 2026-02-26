"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCart } from "@/lib/cartService";

export default function PayPalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white font-sans text-gray-500">
        <div className="w-10 h-10 border-4 border-[#003087] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PayPalInterface />
    </Suspense>
  );
}

function PayPalInterface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Estados de datos
  const [importe, setImporte] = useState("0.00");
  const orderId = searchParams.get("orderId") || Math.floor(100000 + Math.random() * 900000).toString();

  // Estados de flujo: 'login' -> 'review' -> 'processing' -> 'success'
  const [step, setStep] = useState<'login' | 'review' | 'processing' | 'success'>('login');
  const [email, setEmail] = useState("cliente@ejemplo.com");

  // 1. Cargar datos
  useEffect(() => {
    const cart = getCart();
    const subtotal = cart.reduce(
      (acc: number, item: any) => acc + (item.precioFinal ?? item.precio) * item.cantidad,
      0
    );

    let costeEnvio = 0;
    if (typeof window !== "undefined") {
      const envioData = localStorage.getItem("checkout_envio");
      if (envioData) {
        try {
            const data = JSON.parse(envioData);
            costeEnvio = data.coste || 0;
        } catch (e) {
            console.error(e);
        }
      }
    }
    setImporte((subtotal + costeEnvio).toFixed(2));
  }, []);

  // 2. Manejadores de eventos
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    setTimeout(() => setStep('review'), 1000); // Simula carga de cuenta
  };

  const handlePay = () => {
    setStep('processing');
    setTimeout(() => setStep('success'), 2000); // Simula transacción
  };

  const finalizarCompra = () => {
    router.push(`/checkout/confirmacion?pedido=${orderId}`);
  };

  return (
    // ⚡ OVERLAY: Tapamos la app (z-[9999]) y forzamos tema claro (PayPal es siempre blanco)
    <div className="fixed inset-0 z-[9999] bg-[#f5f7fa] flex flex-col font-sans text-[#2c2e2f] overflow-y-auto">
      
      {/* HEADER PAYPAL SIMPLE */}
      <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-center relative z-10 shadow-sm">
         {/* Logo PayPal CSS */}
         <div className="flex items-center gap-1">
            <span className="text-[#003087] font-bold text-2xl italic font-serif">Pay</span>
            <span className="text-[#009cde] font-bold text-2xl italic font-serif">Pal</span>
         </div>
         <div className="absolute right-4 text-xs text-gray-500 hidden md:block">
            🔒 Seguro
         </div>
      </div>

      <div className="flex-1 flex items-start justify-center pt-8 px-4 pb-12">
        
        {/* --- PASO 1: LOGIN SIMULADO --- */}
        {step === 'login' && (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-full max-w-md text-center">
                <h1 className="text-xl font-medium mb-6 text-gray-700">Paga con PayPal</h1>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded focus:border-[#009cde] focus:ring-1 focus:ring-[#009cde] outline-none transition"
                        placeholder="Correo electrónico o número de móvil"
                        required
                    />
                    <button type="submit" className="w-full bg-[#003087] hover:bg-[#002366] text-white font-bold py-3 rounded transition-colors">
                        Siguiente
                    </button>
                </form>
                
                <div className="my-6 flex items-center">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="px-3 text-xs text-gray-400">o</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                </div>

                <button className="w-full bg-white border border-gray-800 text-gray-800 font-bold py-3 rounded hover:bg-gray-50 transition-colors">
                    Crear cuenta
                </button>

                <button onClick={() => router.back()} className="mt-6 text-[#009cde] text-sm hover:underline font-medium">
                    Cancelar y volver a El Hogar de tus Sueños
                </button>
            </div>
        )}

        {/* --- PASO 2: REVISIÓN DE PAGO --- */}
        {step === 'review' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-lg overflow-hidden">
                <div className="bg-[#003087] p-6 text-white text-center">
                    <p className="opacity-80 text-sm uppercase tracking-wide mb-1">Total a pagar</p>
                    <p className="text-4xl font-bold">{importe} €</p>
                </div>
                
                <div className="p-8 space-y-6">
                    {/* Método de pago */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <span className="text-gray-500 text-sm font-medium">Pagar con</span>
                        <div className="text-right">
                            <div className="font-bold text-gray-800 flex items-center justify-end gap-2">
                                <span className="text-xs bg-gray-200 px-1 rounded">VISA</span> 
                                •••• 4242
                            </div>
                            <p className="text-xs text-gray-400">Tipo de cambio aplicable</p>
                        </div>
                    </div>

                    {/* Dirección */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <span className="text-gray-500 text-sm font-medium">Enviar a</span>
                        <div className="text-right">
                            <p className="font-bold text-gray-800">Dirección Principal</p>
                            <p className="text-xs text-green-600">Verificada</p>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            onClick={handlePay}
                            className="w-full bg-[#003087] hover:bg-[#002366] text-white font-bold py-4 rounded-full shadow-lg transition-transform active:scale-[0.98]"
                        >
                            Pagar Ahora
                        </button>
                        <p className="text-xs text-center text-gray-400 mt-4 px-4 leading-relaxed">
                            Si continúas, aceptas las Condiciones de uso y la Política de privacidad de PayPal. No compartiremos tus datos financieros con el vendedor.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* --- PASO 3: PROCESANDO (Spinner) --- */}
        {step === 'processing' && (
            <div className="text-center pt-20">
                <div className="w-16 h-16 border-4 border-[#f2f2f2] border-t-[#003087] rounded-full animate-spin mx-auto mb-6"></div>
                <h2 className="text-xl font-medium text-gray-700">Procesando de forma segura...</h2>
                <p className="text-gray-400 text-sm mt-2">No cierres esta ventana</p>
            </div>
        )}

        {/* --- PASO 4: ÉXITO --- */}
        {step === 'success' && (
            <div className="bg-white p-10 rounded-lg shadow-lg text-center max-w-md w-full animate-fade-in-up">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Has pagado {importe} €!</h2>
                <p className="text-gray-500 mb-8">Redirigiendo a la tienda...</p>
                <button 
                    onClick={finalizarCompra}
                    className="text-[#009cde] font-bold hover:underline"
                >
                    Si no redirige automáticamente, haz clic aquí
                </button>
                {/* Auto redirect effect */}
                <EffectRedirect onComplete={finalizarCompra} />
            </div>
        )}

      </div>

      <div className="text-center py-6 text-[11px] text-gray-400 space-x-4 border-t border-gray-200">
          <span>Privacidad</span>
          <span>Legal</span>
          <span>Copyright © 1999-2026 PayPal. Todos los derechos reservados.</span>
      </div>
    </div>
  );
}

// Pequeño componente para efecto de redirección automática
function EffectRedirect({ onComplete }: { onComplete: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onComplete, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);
    return null;
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useClienteAuth } from "@/context/ClienteAuthContext";
// import { getCart, CartItem } from "@/lib/cartService";
// import PasarelaRedsys from "@/components/PasarelaRedsys"; // Tu componente Redsys
// import PasarelaPaypal from "@/components/PasarelaPaypal"; // 👈 NUEVO: Importar Paypal

// export default function PagoPage() {
//   const router = useRouter();
//   const { cliente } = useClienteAuth();

//   const [carrito, setCarrito] = useState<CartItem[]>([]);
//   const [metodoPago, setMetodoPago] = useState<string | null>(null);
//   const [total, setTotal] = useState(0);
  
//   // --- ESTADOS PARA LOS POPUPS ---
//   const [showRedsys, setShowRedsys] = useState(false);
//   const [showPaypal, setShowPaypal] = useState(false); // 👈 Estado para PayPal
  
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

//   const calcularTotalConRecargo = () => {
//     if (metodoPago === "contrareembolso") return (total + (3 + total * 0.03)).toFixed(2);
//     return total.toFixed(2);
//   };

//   const handlePagarClick = () => {
//     if (!metodoPago) { alert("Selecciona un método de pago"); return; }

//     // Generamos ID simulado
//     const idSimulado = String(Math.floor(1000 + Math.random() * 9000));
//     setPedidoTempId(idSimulado);

//     // LÓGICA DE DIRECCIONAMIENTO
//     if (metodoPago === 'tarjeta') {
//       setShowRedsys(true); // Abrir Redsys
//     } else if (metodoPago === 'paypal') {
//       setShowPaypal(true); // 👈 Abrir PayPal
//     } else {
//       // Bizum, Contrareembolso, etc. van directos por ahora
//       router.push(`/checkout/confirmacion?pedido=${idSimulado}`);
//     }
//   };

//   // Callback común para cuando acaban los popups
//   const handleSuccess = () => {
//     setShowRedsys(false);
//     setShowPaypal(false);
//     router.push(`/checkout/confirmacion?pedido=${pedidoTempId}`);
//   };

//   return (
//     <div className="max-w-3xl mx-auto px-4 py-12">
//       <h1 className="text-3xl font-bold mb-6 text-gray-900">Método de pago 💳</h1>

//       {/* Selector de Pagos */}
//       <div className="space-y-4">
//         {[
//           { id: "tarjeta", label: "💳 Pago con tarjeta (Redsys)" },
//           { id: "paypal", label: "💰 Pagar con PayPal" },
//           { id: "bizum", label: "📱 Bizum" },
//           { id: "contrareembolso", label: "💵 Contrareembolso (+3 € + 3%)" },
//         ].map((opt) => (
//           <label key={opt.id} className={`block border rounded-lg p-4 cursor-pointer transition-colors ${metodoPago === opt.id ? "border-primary bg-yellow-50" : "hover:border-primary"}`}>
//             <div className="flex items-center">
//               <input type="radio" name="pago" value={opt.id} checked={metodoPago === opt.id} onChange={() => setMetodoPago(opt.id)} className="mr-3 h-5 w-5 text-primary" />
//               <span className="font-medium text-gray-800">{opt.label}</span>
//             </div>
//           </label>
//         ))}
//       </div>

//       {/* Botón Pagar */}
//       <div className="mt-10 border-t pt-6 flex justify-between items-center">
//         <div className="text-lg font-bold">Total: <span className="text-primary text-2xl">{calcularTotalConRecargo()} €</span></div>
//         <button onClick={handlePagarClick} className="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-primaryHover transition">
//           Pagar Ahora &rarr;
//         </button>
//       </div>

//       {/* --- POPUPS DE PASARELAS --- */}
      
//       {/* 1. REDSYS */}
//       <PasarelaRedsys 
//         isOpen={showRedsys}
//         onClose={() => setShowRedsys(false)}
//         onSuccess={handleSuccess}
//         importe={total.toFixed(2)}
//         orderId={pedidoTempId}
//       />

//       {/* 2. PAYPAL (NUEVO) */}
//       <PasarelaPaypal
//         isOpen={showPaypal}
//         onClose={() => setShowPaypal(false)}
//         onSuccess={handleSuccess}
//         importe={total.toFixed(2)}
//         orderId={pedidoTempId}
//       />
      
//     </div>
//   );
// }