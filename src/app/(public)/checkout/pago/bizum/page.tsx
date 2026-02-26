"use client";

import { useEffect, useState } from "react";
import { useRouter , useSearchParams } from "next/navigation";
import { getCart } from "@/lib/cartService";

export default function BizumPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // <--- Hook para leer la URL
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");

  const totalUrl = searchParams.get("total");
  const pedidoId = searchParams.get("id");

  const importeFinal = totalUrl ? parseFloat(totalUrl).toFixed(2) : "0.00";

  useEffect(() => {
    // Generar ID solo en cliente para evitar hydration mismatch
    setOrderId(String(Math.floor(10000 + Math.random() * 90000)));

    const cart = getCart();
    if (cart.length === 0) { 
        router.push("/carrito"); 
        return; 
    }
    
    const sub = cart.reduce((acc, item) => acc + (item.precioFinal ?? item.precio) * item.cantidad, 0);
    
    let envio = 0;
    if (typeof window !== "undefined") {
      const envioData = localStorage.getItem("checkout_envio");
      if (envioData) envio = JSON.parse(envioData).coste || 0;
    }
    setTotal(sub + envio);
  }, [router]);

  const handleConfirmar = () => {
    setLoading(true);
    // Simular tiempo de verificación del pago
    setTimeout(() => {
        router.push(`/checkout/confirmacion?pedido=${orderId}`);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg py-12 px-4 flex justify-center items-start font-sans transition-colors duration-300">
      
      <div className="max-w-xl w-full bg-white dark:bg-darkNavBg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all">
        
        {/* Cabecera Bizum (Branding Oficial) */}
        <div className="bg-gradient-to-r from-[#00bfa5] to-[#009688] p-8 text-center relative overflow-hidden">
            {/* Círculos decorativos de fondo */}
            <div className="absolute top-[-50%] left-[-10%] w-32 h-32 bg-white opacity-10 rounded-full"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-24 h-24 bg-white opacity-10 rounded-full"></div>
            
            <h1 className="text-3xl font-extrabold text-white tracking-wider italic relative z-10">bizum</h1>
            <p className="text-teal-50 text-sm mt-2 font-medium relative z-10">Pago móvil instantáneo y seguro</p>
        </div>

        <div className="p-8 md:p-10 space-y-8">
            
            {/* Instrucciones */}
            <div className="text-center">
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                    Para completar tu pedido, envía un Bizum por el importe exacto al siguiente número:
                </p>
                
                {/* Tarjeta de Datos de Pago */}
                <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-[#00bfa5] rounded-xl p-6 relative mx-auto max-w-sm">
                    
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#00bfa5] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        Datos de Envío
                    </div>
                    
                    <div className="mb-4 mt-2">
                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Teléfono Destino</p>
                        <p className="text-3xl font-mono font-bold text-gray-800 dark:text-white tracking-tight select-all">
                            678 529 510
                        </p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                         <p className="text-xs text-gray-400 uppercase font-bold mb-1">Concepto (Importante)</p>
                         <p className="text-xl font-bold text-[#009688] dark:text-[#4db6ac] select-all">
                            PEDIDO {orderId}
                         </p>
                    </div>
                </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-4 border-t border-b border-gray-100 dark:border-gray-700">
                <span className="font-bold text-lg text-gray-700 dark:text-gray-300">Importe a pagar:</span>
                <span className="font-extrabold text-3xl text-gray-900 dark:text-white">{importeFinal} €</span>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-4 pt-2">
                <button 
                    onClick={handleConfirmar}
                    disabled={loading}
                    className={`w-full bg-[#009688] hover:bg-[#00796b] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-teal-500/20 transition-all transform active:scale-[0.98] flex justify-center items-center gap-3 ${loading ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {loading ? (
                        <>
                           <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           <span>Verificando recepción...</span>
                        </>
                    ) : (
                        <>
                           <span>Confirmar Pago Realizado</span>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </>
                    )}
                </button>
                
                <button 
                    onClick={() => router.back()} 
                    disabled={loading}
                    className="w-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                >
                    Cancelar y volver atrás
                </button>
            </div>

            {/* Nota de seguridad */}
            <p className="text-[10px] text-center text-gray-400">
                Tu pedido se procesará automáticamente en cuanto recibamos la confirmación del pago.
            </p>
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { getCart } from "@/lib/cartService";

// export default function BizumPage() {
//   const router = useRouter();
//   const [total, setTotal] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [orderId, setOrderId] = useState("");

//   useEffect(() => {
//     setOrderId(String(Math.floor(10000 + Math.random() * 90000)));
//     const cart = getCart();
//     if (cart.length === 0) { router.push("/carrito"); return; }
//     const sub = cart.reduce((acc, item) => acc + (item.precioFinal ?? item.precio) * item.cantidad, 0);
    
//     let envio = 0;
//     if (typeof window !== "undefined") {
//       const envioData = localStorage.getItem("checkout_envio");
//       if (envioData) envio = JSON.parse(envioData).coste || 0;
//     }
//     setTotal(sub + envio);
//   }, [router]);

//   const handleConfirmar = () => {
//     setLoading(true);
//     setTimeout(() => {
//         router.push(`/checkout/confirmacion?pedido=${orderId}`);
//     }, 1500);
//   };

//   return (
//     <div className="min-h-screen bg-fondo py-12 px-4 flex justify-center items-start font-sans">
//       <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border border-[#e4e0d5] overflow-hidden">
        
//         {/* Cabecera Bizum */}
//         <div className="bg-gradient-to-r from-[#00bfa5] to-[#009688] text-white p-6 text-center">
//             <h1 className="text-2xl font-bold uppercase tracking-wide italic">Bizum</h1>
//             <p className="text-teal-100 text-sm mt-1">Pago inmediato y seguro desde tu móvil</p>
//         </div>

//         <div className="p-8 md:p-12 space-y-8">
            
//             {/* Instrucciones */}
//             <div className="text-center">
//                 <p className="text-gray-600 mb-6">
//                     Para finalizar tu pedido, envía un Bizum por el importe total al siguiente número:
//                 </p>
                
//                 <div className="bg-gray-50 border-2 border-[#00bfa5] rounded-xl p-6 inline-block w-full max-w-sm relative overflow-hidden">
//                     <div className="absolute top-0 right-0 bg-[#00bfa5] text-white text-[10px] font-bold px-2 py-1 rounded-bl">OFICIAL</div>
                    
//                     <p className="text-xs text-gray-500 uppercase font-bold mb-1">Enviar dinero a:</p>
//                     <p className="text-3xl font-extrabold text-gray-800 tracking-widest mb-4">+34 678 529 510</p>
                    
//                     <div className="border-t border-gray-200 pt-3">
//                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Concepto (Muy Importante)</p>
//                          <p className="text-lg font-bold text-[#009688]">PEDIDO {orderId}</p>
//                     </div>
//                 </div>
//             </div>

//             {/* Total */}
//             <div className="flex justify-between items-end border-t pt-4">
//                 <span className="font-bold text-xl text-gray-800">Total a enviar:</span>
//                 <span className="font-extrabold text-3xl text-primary">{total.toFixed(2)} €</span>
//             </div>

//             {/* Botones */}
//             <div className="space-y-3">
//                 <button 
//                     onClick={handleConfirmar}
//                     disabled={loading}
//                     className="w-full bg-[#009688] text-white py-4 rounded-lg font-bold text-lg hover:bg-teal-700 transition shadow-lg flex justify-center items-center gap-2"
//                 >
//                     {loading ? "Verificando..." : "Ya he enviado el Bizum"}
//                 </button>
//                 <button onClick={() => router.back()} className="w-full text-gray-400 hover:text-gray-600 text-sm">Cancelar</button>
//             </div>
//         </div>
//       </div>
//     </div>
//   );
// }