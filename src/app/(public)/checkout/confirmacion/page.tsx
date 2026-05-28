"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { clearCart } from "@/lib/cartService"; 

export default function ConfirmacionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pedidoId = searchParams.get("pedido") || "PENDIENTE";

  // Estado para controlar la UI
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Simular carga
    const timer = setTimeout(() => {
      setLoading(false);
      
      // 2. Vaciar el carrito
      if (typeof window !== "undefined") {
         clearCart(); 
         localStorage.removeItem("checkout_envio"); 
         // Lanzamos evento para actualizar el contador del header a 0
         window.dispatchEvent(new Event("storage"));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-darkBg transition-colors duration-300">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Procesando tu pedido...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBg flex flex-col items-center justify-center px-4 py-12 font-sans transition-colors duration-300">
      
      {/* TARJETA PRINCIPAL */}
      <div className="max-w-xl w-full bg-white dark:bg-darkNavBg rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-gray-100 dark:border-gray-700 animate-fade-in-up">
        
        {/* Icono de Éxito Animado */}
        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow shadow-sm">
          <svg 
            className="w-12 h-12 text-green-600 dark:text-green-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
          ¡Gracias por tu compra!
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed">
          Tu pedido ha sido procesado correctamente. Hemos enviado un email de confirmación con todos los detalles.
        </p>

        {/* Tarjeta con detalles del pedido */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
           <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 pb-3 mb-3">
              <span className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">Nº de Pedido</span>
              <span className="text-xl font-mono font-bold text-primary">#{pedidoId}</span>
           </div>
           
           <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">Estado</span>
              <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold px-3 py-1 rounded-full uppercase border border-green-200 dark:border-green-800">
                Confirmado
              </span>
           </div>
        </div>

        {/* Botones de Acción */}
        <div className="space-y-4">
          <Link 
            href="/"
            className="block w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-yellow-500/20 hover:bg-primaryHover hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            Volver a la tienda
          </Link>
          
          <Link 
            href="/account/orders"
            className="block w-full bg-white dark:bg-gray-700 text-gray-700 dark:text-white font-bold py-4 rounded-xl border-2 border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Ver mis pedidos
          </Link>
        </div>

      </div>

      {/* Footer pequeño */}
      <p className="mt-8 text-gray-400 dark:text-gray-500 text-sm font-medium">
        ¿Necesitas ayuda? <Link href="/contacto" className="underline hover:text-gray-600 dark:hover:text-gray-300 transition">Contáctanos</Link>
      </p>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import Link from "next/link";
// import { clearCart } from "@/lib/cartService"; // Asegúrate de importar tu función de vaciar carrito

// export default function ConfirmacionPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const pedidoId = searchParams.get("pedido") || "PENDIENTE";

//   // Estado para controlar la UI
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // 1. Simular carga
//     const timer = setTimeout(() => {
//       setLoading(false);
      
//       // 2. IMPORTANTE: Vaciar el carrito aquí porque la compra ha sido "exitosa"
//       // (Si usas Context, llama a clearCart() del contexto)
//       if (typeof window !== "undefined") {
//          clearCart(); // O localStorage.removeItem('cart');
//          localStorage.removeItem("checkout_envio"); // Limpiamos datos temporales
//       }
//     }, 1000);

//     return () => clearTimeout(timer);
//   }, []);

//   if (loading) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
//         <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
//         <p className="text-gray-500 font-medium">Finalizando pedido...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-fondo flex flex-col items-center justify-center px-4 py-12 font-sans">
//       <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center border border-[#e4e0d5]">
        
//         {/* Icono de Éxito Animado */}
//         <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
//           <svg 
//             className="w-12 h-12 text-green-600" 
//             fill="none" 
//             stroke="currentColor" 
//             viewBox="0 0 24 24"
//           >
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
//           </svg>
//         </div>

//         <h1 className="text-3xl md:text-4xl font-extrabold text-[#333] mb-4">
//           ¡Gracias por tu compra!
//         </h1>
        
//         <p className="text-gray-600 mb-8 text-lg">
//           Tu pedido ha sido procesado correctamente. Hemos enviado un email de confirmación con los detalles.
//         </p>

//         {/* Tarjeta con detalles del pedido */}
//         <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
//            <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-3">
//               <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Nº de Pedido</span>
//               <span className="text-xl font-bold text-primary font-mono">#{pedidoId}</span>
//            </div>
           
//            <div className="flex justify-between items-center">
//               <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Estado</span>
//               <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
//                 Pagado / Confirmado
//               </span>
//            </div>
           
//            {/* ⚠️ NOTA: No intentamos mostrar el "Total" aquí leyendo de la BD
//               porque si el pedido es simulado, fallaría el toFixed().
//               Es mejor mostrar un mensaje genérico de éxito.
//            */}
//         </div>

//         {/* Botones de Acción */}
//         <div className="space-y-4">
//           <Link 
//             href="/"
//             className="block w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-yellow-500/20 hover:bg-primaryHover hover:scale-[1.02] transition-all"
//           >
//             Volver a la tienda
//           </Link>
          
//           <Link 
//             href="/account/pedidos"
//             className="block w-full bg-white text-gray-600 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
//           >
//             Ver mis pedidos
//           </Link>
//         </div>

//       </div>

//       {/* Footer pequeño */}
//       <p className="mt-8 text-gray-400 text-sm">
//         ¿Necesitas ayuda? <a href="/contacto" className="underline hover:text-gray-600">Contáctanos</a>
//       </p>
//     </div>
//   );
// }