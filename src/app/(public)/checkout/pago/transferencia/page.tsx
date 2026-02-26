"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getCart } from "@/lib/cartService";
import toast from "react-hot-toast";

export default function TransferenciaPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // <--- Hook para leer la URL
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const totalUrl = searchParams.get("total");
  const pedidoId = searchParams.get("id");

  // Si por lo que sea no viene en la URL, ponemos 0 o gestionamos error
  const importeFinal = totalUrl ? parseFloat(totalUrl).toFixed(2) : "0.00";

  const IBAN = "ES82 0081 0319 0452 7458 0563";

  useEffect(() => {
    // Generar ID en cliente
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
    // Simular proceso
    setTimeout(() => {
        router.push(`/checkout/confirmacion?pedido=${orderId}`);
    }, 1500);
  };

  const copiarIBAN = () => {
    navigator.clipboard.writeText(IBAN);
    toast.success("IBAN copiado al portapapeles");
  };

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg py-12 px-4 flex justify-center items-start font-sans transition-colors duration-300">
      
      <div className="max-w-xl w-full bg-white dark:bg-darkNavBg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all">
        
        {/* Cabecera Azul */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-center relative overflow-hidden">
            <div className="absolute top-[-50%] left-[-10%] w-32 h-32 bg-white opacity-10 rounded-full"></div>
            <h1 className="text-2xl font-bold uppercase tracking-widest text-white relative z-10">Transferencia Bancaria</h1>
            <p className="text-blue-100 text-sm mt-2 relative z-10">Realiza el pago cómodamente desde tu banco</p>
        </div>

        <div className="p-8 md:p-10 space-y-8">
            
            {/* Aviso Importante */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-5 rounded-r-lg shadow-sm">
                <div className="flex gap-4">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                        <strong>Nota:</strong> Tu pedido se preparará una vez recibamos el ingreso en nuestra cuenta (1-2 días laborables).
                    </p>
                </div>
            </div>

            {/* Datos Bancarios (Tarjeta Central) */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 bg-gray-50 dark:bg-gray-800/30 text-center relative">
                
                <p className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Entidad Bancaria</p>
                <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-6 flex items-center justify-center gap-2">
                    <span className="text-2xl">🏦</span> Banco Sabadell
                </h3>
                
                <div className="mb-6">
                    <p className="text-gray-400 text-xs uppercase font-bold mb-2 tracking-wider">IBAN para el ingreso</p>
                    <div 
                        onClick={copiarIBAN}
                        className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4 rounded-lg shadow-sm cursor-pointer hover:border-blue-400 dark:hover:border-blue-400 transition-colors group relative"
                        title="Click para copiar"
                    >
                        <code className="text-lg md:text-2xl font-mono font-bold text-gray-800 dark:text-white tracking-wider block">
                            {IBAN}
                        </code>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        </div>
                        <p className="text-[10px] text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click para copiar</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Beneficiario</p>
                        <p className="font-medium text-gray-800 dark:text-white text-sm">El Hogar de tus Sueños S.L.</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Concepto (Vital)</p>
                        <p className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 inline-block px-2 py-0.5 rounded text-sm border border-blue-100 dark:border-blue-800">
                            Pedido #{orderId}
                        </p>
                    </div>
                </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-4 border-t border-gray-100 dark:border-gray-700">
                <span className="font-bold text-lg text-gray-700 dark:text-gray-300">Importe a transferir:</span>
                <span className="font-extrabold text-3xl text-gray-900 dark:text-white">{importeFinal} €</span>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-4 pt-2">
                <button 
                    onClick={handleConfirmar}
                    disabled={loading}
                    className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 transition-all transform active:scale-[0.98] flex justify-center items-center gap-3 ${loading ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {loading ? (
                        <>
                           <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           <span>Finalizando...</span>
                        </>
                    ) : (
                        <>
                           <span>Confirmar Pedido</span>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </>
                    )}
                </button>
                
                <button 
                    onClick={() => router.back()} 
                    disabled={loading}
                    className="w-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                >
                    Cancelar operación
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { getCart } from "@/lib/cartService";
// import toast from "react-hot-toast";

// export default function TransferenciaPage() {
//   const router = useRouter();
//   const [total, setTotal] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [orderId, setOrderId] = useState("");

//   const IBAN = "ES82 0081 0319 0452 7458 0563";

//   useEffect(() => {
//     // Generar ID en cliente
//     setOrderId(String(Math.floor(10000 + Math.random() * 90000)));

//     const cart = getCart();
//     if (cart.length === 0) { 
//         router.push("/carrito"); 
//         return; 
//     }

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
//     // Simular proceso
//     setTimeout(() => {
//         router.push(`/checkout/confirmacion?pedido=${orderId}`);
//     }, 1500);
//   };

//   const copiarIBAN = () => {
//     navigator.clipboard.writeText(IBAN);
//     toast.success("IBAN copiado al portapapeles");
//   };

//   return (
//     <div className="min-h-screen bg-fondo dark:bg-darkBg py-12 px-4 flex justify-center items-start font-sans transition-colors duration-300">
      
//       <div className="max-w-xl w-full bg-white dark:bg-darkNavBg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all">
        
//         {/* Cabecera Azul */}
//         <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-center relative overflow-hidden">
//             <div className="absolute top-[-50%] left-[-10%] w-32 h-32 bg-white opacity-10 rounded-full"></div>
//             <h1 className="text-2xl font-bold uppercase tracking-widest text-white relative z-10">Transferencia Bancaria</h1>
//             <p className="text-blue-100 text-sm mt-2 relative z-10">Realiza el pago cómodamente desde tu banco</p>
//         </div>

//         <div className="p-8 md:p-10 space-y-8">
            
//             {/* Aviso Importante */}
//             <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-5 rounded-r-lg shadow-sm">
//                 <div className="flex gap-4">
//                     <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
//                     <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
//                         <strong>Nota:</strong> Tu pedido se preparará una vez recibamos el ingreso en nuestra cuenta (1-2 días laborables).
//                     </p>
//                 </div>
//             </div>

//             {/* Datos Bancarios (Tarjeta Central) */}
//             <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 bg-gray-50 dark:bg-gray-800/30 text-center relative">
                
//                 <p className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Entidad Bancaria</p>
//                 <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-6 flex items-center justify-center gap-2">
//                     <span className="text-2xl">🏦</span> Banco Sabadell
//                 </h3>
                
//                 <div className="mb-6">
//                     <p className="text-gray-400 text-xs uppercase font-bold mb-2 tracking-wider">IBAN para el ingreso</p>
//                     <div 
//                         onClick={copiarIBAN}
//                         className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4 rounded-lg shadow-sm cursor-pointer hover:border-blue-400 dark:hover:border-blue-400 transition-colors group relative"
//                         title="Click para copiar"
//                     >
//                         <code className="text-lg md:text-2xl font-mono font-bold text-gray-800 dark:text-white tracking-wider block">
//                             {IBAN}
//                         </code>
//                         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                             <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
//                         </div>
//                         <p className="text-[10px] text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click para copiar</p>
//                     </div>
//                 </div>

//                 <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto border-t border-gray-200 dark:border-gray-700 pt-4">
//                     <div>
//                         <p className="text-xs text-gray-400 font-bold uppercase mb-1">Beneficiario</p>
//                         <p className="font-medium text-gray-800 dark:text-white text-sm">El Hogar de tus Sueños S.L.</p>
//                     </div>
//                     <div>
//                         <p className="text-xs text-gray-400 font-bold uppercase mb-1">Concepto (Vital)</p>
//                         <p className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 inline-block px-2 py-0.5 rounded text-sm border border-blue-100 dark:border-blue-800">
//                             Pedido #{orderId}
//                         </p>
//                     </div>
//                 </div>
//             </div>

//             {/* Total */}
//             <div className="flex justify-between items-center py-4 border-t border-gray-100 dark:border-gray-700">
//                 <span className="font-bold text-lg text-gray-700 dark:text-gray-300">Importe a transferir:</span>
//                 <span className="font-extrabold text-3xl text-gray-900 dark:text-white">{total.toFixed(2)} €</span>
//             </div>

//             {/* Botones de Acción */}
//             <div className="space-y-4 pt-2">
//                 <button 
//                     onClick={handleConfirmar}
//                     disabled={loading}
//                     className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 transition-all transform active:scale-[0.98] flex justify-center items-center gap-3 ${loading ? 'opacity-70 cursor-wait' : ''}`}
//                 >
//                     {loading ? (
//                         <>
//                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                            <span>Finalizando...</span>
//                         </>
//                     ) : (
//                         <>
//                            <span>Confirmar Pedido</span>
//                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
//                         </>
//                     )}
//                 </button>
                
//                 <button 
//                     onClick={() => router.back()} 
//                     disabled={loading}
//                     className="w-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-medium transition-colors"
//                 >
//                     Cancelar operación
//                 </button>
//             </div>

//         </div>
//       </div>
//     </div>
//   );
// }