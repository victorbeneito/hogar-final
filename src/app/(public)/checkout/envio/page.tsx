"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useClienteAuth } from "@/context/ClienteAuthContext";

export default function EnvioPage() {
  const router = useRouter();
  const { cliente, loading } = useClienteAuth();
  const [envioSeleccionado, setEnvioSeleccionado] = useState<string | null>(null);

  // 1. Protección de ruta
  useEffect(() => {
    if (!loading && !cliente) {
      toast.error("Debes iniciar sesión antes de continuar.");
      router.push("/auth?redirect=/checkout/envio");
    }
  }, [cliente, loading, router]);

  // 2. Recuperar selección previa
  useEffect(() => {
    const envioGuardado = localStorage.getItem("checkout_envio");
    if (envioGuardado) {
      setEnvioSeleccionado(JSON.parse(envioGuardado).metodo);
    }
  }, []);

  const handleContinue = () => {
    if (!envioSeleccionado) {
      toast.error("Por favor selecciona un método de envío.");
      return;
    }

    const envioData = {
      metodo: envioSeleccionado,
      coste: envioSeleccionado === "ontime" ? 5 : 0,
    };

    localStorage.setItem("checkout_envio", JSON.stringify(envioData));
    router.push("/checkout/resumen");
  };

  if (loading) return (
    <div className="min-h-screen flex justify-center items-center bg-fondo dark:bg-darkBg transition-colors">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg flex flex-col transition-colors duration-300">
      
      <main className="flex-1 flex items-start justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-4xl">
            
            {/* Cabecera */}
            <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                    Método de Envío 🚚
                </h1>
                <p className="text-gray-500 dark:text-gray-400">Elige cómo quieres recibir tu pedido.</p>
                
                {/* Breadcrumbs */}
                <div className="hidden md:flex justify-center mt-6 gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span className="text-green-500 cursor-pointer hover:underline" onClick={() => router.push('/checkout/direcciones')}>1. Dirección</span> 
                    <span className="text-gray-300 dark:text-gray-600">&rarr;</span> 
                    <span className="text-primary border-b-2 border-primary pb-1">2. Envío</span> 
                    <span className="text-gray-300 dark:text-gray-600">&rarr;</span> 
                    <span>3. Pago</span>
                </div>
            </div>

            <div className="bg-white dark:bg-darkNavBg rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-10 transition-colors">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Opción 1: Recogida */}
                    <label
                        className={`relative flex flex-col p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                        envioSeleccionado === "tienda"
                            ? "border-primary bg-yellow-50 dark:bg-yellow-900/10 shadow-md transform scale-[1.02]"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 bg-transparent"
                        }`}
                    >
                        <input
                            type="radio"
                            name="envio"
                            value="tienda"
                            checked={envioSeleccionado === "tienda"}
                            onChange={() => setEnvioSeleccionado("tienda")}
                            className="absolute opacity-0"
                        />
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-3xl">🏬</span>
                            {envioSeleccionado === "tienda" && (
                                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Recogida en Tienda</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1">
                            Pásate por nuestra tienda en Sabadell cuando te avisemos.
                        </p>
                        <span className="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 py-1 px-3 rounded-full text-sm self-start">
                            Gratis
                        </span>
                    </label>

                    {/* Opción 2: Envío a Domicilio */}
                    <label
                        className={`relative flex flex-col p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                        envioSeleccionado === "ontime"
                            ? "border-primary bg-yellow-50 dark:bg-yellow-900/10 shadow-md transform scale-[1.02]"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 bg-transparent"
                        }`}
                    >
                        <input
                            type="radio"
                            name="envio"
                            value="ontime"
                            checked={envioSeleccionado === "ontime"}
                            onChange={() => setEnvioSeleccionado("ontime")}
                            className="absolute opacity-0"
                        />
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-3xl">🚚</span>
                            {envioSeleccionado === "ontime" && (
                                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Envío Express (Ontime)</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1">
                            Entrega en 24-72 horas laborales en la puerta de tu casa.
                        </p>
                        <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 py-1 px-3 rounded-full text-sm self-start">
                            5,00 €
                        </span>
                    </label>

                </div>

                {/* Botones de Navegación */}
                <div className="flex flex-col-reverse md:flex-row justify-between gap-4 mt-10 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => router.push('/checkout/direcciones')}
                        className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-bold"
                    >
                        &larr; Atrás
                    </button>
                    
                    <button
                        onClick={handleContinue}
                        className="flex-1 md:flex-none px-10 py-3 rounded-lg bg-primary text-white font-bold tracking-wide hover:bg-primaryHover transition-all shadow-lg shadow-yellow-500/30 transform active:scale-95"
                    >
                        Continuar al Pago &rarr;
                    </button>
                </div>

            </div>
        </div>
      </main>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { toast } from "react-hot-toast";
// import { useClienteAuth } from "@/context/ClienteAuthContext";

// export default function EnvioPage() {
//   const router = useRouter();
//   const { cliente, loading } = useClienteAuth();
//   const [envioSeleccionado, setEnvioSeleccionado] = useState<string | null>(null);

//   useEffect(() => {
//     if (!loading) {
//       if (!cliente) {
//         toast.error("Debes iniciar sesión antes de continuar.");
//         router.push("/auth?redirect=/checkout/envio");
//         return;
//       }
//     }
//   }, [cliente, loading, router]);

//   useEffect(() => {
//     const envioGuardado = localStorage.getItem("checkout_envio");
//     if (envioGuardado) {
//       setEnvioSeleccionado(JSON.parse(envioGuardado).metodo);
//     }
//   }, []);

//   const handleContinue = () => {
//     if (!envioSeleccionado) {
//       toast.error("Por favor selecciona un método de envío antes de continuar.");
//       return;
//     }

//     const envioData = {
//       metodo: envioSeleccionado,
//       coste: envioSeleccionado === "ontime" ? 5 : 0,
//     };

//     localStorage.setItem("checkout_envio", JSON.stringify(envioData));
//     router.push("/checkout/resumen");
//   };

//   if (loading) return <p className="p-8 text-center dark:text-white">Cargando...</p>;

//   return (
//     <div className="max-w-3xl mx-auto px-4 py-12">
//       <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
//         Método de envío 🚚
//       </h1>

//       <div className="space-y-4">
//         {/* Recogida en tienda */}
//         <label
//           className={`block border rounded-lg p-4 cursor-pointer transition-colors duration-200 ${
//             envioSeleccionado === "tienda"
//               ? "border-primary bg-primary/10"
//               : "border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary"
//           }`}
//         >
//           <div className="flex items-center">
//             <input
//               type="radio"
//               name="envio"
//               value="tienda"
//               checked={envioSeleccionado === "tienda"}
//               onChange={() => setEnvioSeleccionado("tienda")}
//               className="mr-3"
//             />
//             <div>
//               <span className="font-medium text-gray-800 dark:text-gray-100 block">
//                 🏬 El Hogar de tus Sueños — Recogida en tienda
//               </span>
//               <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Gratis</p>
//             </div>
//           </div>
//         </label>

//         {/* Ontime */}
//         <label
//           className={`block border rounded-lg p-4 cursor-pointer transition-colors duration-200 ${
//             envioSeleccionado === "ontime"
//               ? "border-primary bg-primary/10"
//               : "border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary"
//           }`}
//         >
//           <div className="flex items-center">
//             <input
//               type="radio"
//               name="envio"
//               value="ontime"
//               checked={envioSeleccionado === "ontime"}
//               onChange={() => setEnvioSeleccionado("ontime")}
//               className="mr-3"
//             />
//             <div>
//               <span className="font-medium text-gray-800 dark:text-gray-100 block">
//                 🚚 Ontime — 24–72 horas desde el envío
//               </span>
//               <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">5 €</p>
//             </div>
//           </div>
//         </label>
//       </div>

//       <div className="flex justify-end mt-8">
//         <button
//           onClick={handleContinue}
//           className="bg-primary text-white px-6 py-2 rounded font-semibold hover:bg-primaryHover transition dark:bg-gray-700 dark:hover:bg-gray-600"
//         >
//           Continuar al pago →
//         </button>
//       </div>
//     </div>
//   );
// }
