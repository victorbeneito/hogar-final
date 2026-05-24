"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import toast from "react-hot-toast";

interface Coupon {
  id: string;
  codigo: string;
  descripcion: string;
  descuento: number;
  fechaExpiracion: string;
  usado?: boolean;
}

export default function CouponsPage() {
  const { token, loading: authLoading } = useClienteAuth();
  const [cupones, setCupones] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const loadCoupons = async () => {
      try {
        const res = await fetchWithAuth("/api/cupones", token);
        // Asumimos que la API devuelve { coupons: [...] } o un array directo
        setCupones(res.coupons || res || []);
      } catch (error) {
        console.error(error);
        toast.error("Error al cargar tus cupones");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
        loadCoupons();
    }
  }, [token, authLoading]);

  // Función para copiar el código
  const handleCopy = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast.success("¡Código copiado al portapapeles!");
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-fondo dark:bg-darkBg flex items-center justify-center transition-colors">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg transition-colors duration-300">
      
      {/* Cabecera */}
      <div className="bg-white dark:bg-darkNavBg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
           <Link 
             href="/account" 
             className="text-sm font-bold text-gray-400 hover:text-primary mb-4 inline-block transition-colors"
           >
             &larr; Volver a mi cuenta
           </Link>
           <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
             <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-lg text-2xl">🎟️</span>
             Mis Cupones
           </h1>
           <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
             Descuentos exclusivos y recompensas disponibles para ti.
           </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-12">
        
        {cupones.length === 0 ? (
          // EMPTY STATE
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-darkNavBg rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
             <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 text-4xl grayscale opacity-50">
                🏷️
             </div>
             <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
               No tienes cupones activos
             </h3>
             <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
               Actualmente no tienes descuentos disponibles. Mantente atento a nuestras promociones o suscríbete a la newsletter.
             </p>
             <Link 
               href="/"
               className="text-primary font-bold hover:underline"
             >
               Volver a la tienda
             </Link>
          </div>
        ) : (
          // GRID DE CUPONES
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {cupones.map((c) => {
              const expirado = new Date(c.fechaExpiracion) < new Date();
              const activo = !c.usado && !expirado;

              return (
                <div 
                  key={c.id}
                  className={`relative flex flex-col bg-white dark:bg-darkNavBg rounded-xl overflow-hidden shadow-sm border transition-all duration-300 ${
                    activo 
                      ? "border-green-200 dark:border-green-900 shadow-green-100 dark:shadow-none hover:-translate-y-1 hover:shadow-lg" 
                      : "border-gray-200 dark:border-gray-700 opacity-70 grayscale-[0.5]"
                  }`}
                >
                    {/* Parte Superior: Descuento */}
                    <div className={`p-6 text-center ${
                        activo ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10" : "bg-gray-50 dark:bg-gray-800"
                    }`}>
                        <div className={`text-4xl font-extrabold ${activo ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                            {c.descuento}%
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Descuento</span>
                    </div>

                    {/* Línea de corte (Efecto Ticket) */}
                    <div className="relative h-1 bg-white dark:bg-darkNavBg">
                        <div className="absolute w-4 h-4 bg-fondo dark:bg-darkBg rounded-full -left-2 -top-2"></div>
                        <div className="absolute w-full border-t-2 border-dashed border-gray-200 dark:border-gray-700 top-0"></div>
                        <div className="absolute w-4 h-4 bg-fondo dark:bg-darkBg rounded-full -right-2 -top-2"></div>
                    </div>

                    {/* Parte Inferior: Detalles */}
                    <div className="p-6 flex flex-col flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2">{c.descripcion}</h3>
                        
                        <div className="mt-auto pt-4 space-y-3">
                            {/* Código (Click para copiar) */}
                            {activo ? (
                                <button
                                    onClick={() => handleCopy(c.codigo)}
                                    className="w-full group bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-2 flex items-center justify-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 transition-colors"
                                    title="Click para copiar"
                                >
                                    <span className="font-mono font-bold text-gray-700 dark:text-gray-300 group-hover:text-green-700 dark:group-hover:text-green-400 text-lg tracking-wider">
                                        {c.codigo}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                </button>
                            ) : (
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg py-2 text-center font-mono font-bold text-gray-400 line-through">
                                    {c.codigo}
                                </div>
                            )}

                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400">Caducidad:</span>
                                <span className={`font-medium ${expirado ? "text-red-500" : "text-gray-600 dark:text-gray-400"}`}>
                                    {new Date(c.fechaExpiracion).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Badges de estado */}
                            <div className="flex justify-center">
                                {expirado ? (
                                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase">Caducado</span>
                                ) : c.usado ? (
                                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Ya usado</span>
                                ) : (
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase animate-pulse">Disponible</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useClienteAuth } from "@/context/ClienteAuthContext";
// import { fetchWithAuth } from "@/utils/fetchWithAuth";
// import toast from "react-hot-toast";

// interface Coupon {
//   id: string;
//   codigo: string;
//   descripcion: string;
//   descuento: number;
//   fechaExpiracion: string;
//   usado?: boolean;
// }

// export default function CouponsPage() {
//   const { token } = useClienteAuth();
//   const [cupones, setCupones] = useState<Coupon[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!token) return;
//     const loadCoupons = async () => {
//       try {
//         const res = await fetchWithAuth("/api/cupones", token);
//         setCupones(res.coupons || []);
//       } catch (error) {
//         console.error(error);
//         toast.error("Error al cargar los cupones");
//       } finally {
//         setLoading(false);
//       }
//     };
//     loadCoupons();
//   }, [token]);

//   if (loading) return <p>Cargando cupones...</p>;

//   return (
//     <div className="max-w-3xl mx-auto">
//       <h1 className="text-2xl font-bold mb-6">Mis cupones</h1>

//       {cupones.length === 0 ? (
//         <p className="text-gray-500">No tienes cupones actualmente.</p>
//       ) : (
//         <div className="grid gap-4 sm:grid-cols-2">
//           {cupones.map((c) => {
//             const expirado = new Date(c.fechaExpiracion) < new Date();
//             const color = expirado
//               ? "border-gray-300 bg-gray-100 text-gray-500"
//               : c.usado
//               ? "border-yellow-400 bg-yellow-50 text-yellow-700"
//               : "border-green-500 bg-green-50 text-green-800";

//             return (
//               <div
//                 key={c.id}
//                 className={`border p-4 rounded-md shadow-sm ${color}`}
//               >
//                 <h2 className="text-lg font-semibold">{c.codigo}</h2>
//                 <p className="text-sm">{c.descripcion}</p>
//                 <p className="mt-1 text-sm">
//                   <strong>Descuento:</strong> {c.descuento}%
//                 </p>
//                 <p className="text-xs mt-2">
//                   <strong>Expira:</strong>{" "}
//                   {new Date(c.fechaExpiracion).toLocaleDateString()}
//                 </p>

//                 {expirado ? (
//                   <p className="text-xs mt-2 text-red-500 font-medium">
//                     Expirado
//                   </p>
//                 ) : c.usado ? (
//                   <p className="text-xs mt-2 text-yellow-600 font-medium">
//                     Ya usado
//                   </p>
//                 ) : (
//                   <p className="text-xs mt-2 text-green-600 font-medium">
//                     Disponible
//                   </p>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }
