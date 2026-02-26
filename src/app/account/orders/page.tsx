"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

// ... (Mantenemos las interfaces igual) ...
interface Producto {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  imagen?: string;
}

interface Pedido {
  id: number;
  numeroPedido?: string;
  fechaPedido?: string;
  createdAt?: string;
  estado: string;
  totalFinal: number;
  envioMetodo: string;
  envioCoste: number;
  pagoMetodo: string;
  productos: Producto[];
}

export default function OrdersPage() {
  const { token, cliente, loading: authLoading } = useClienteAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoAbierto, setPedidoAbierto] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !cliente?.id) return;

    const fetchPedidos = async () => {
      try {
        const data = await fetchWithAuth(`/api/pedidos?clienteId=${cliente.id}`, token);
        setPedidos(data.pedidos || []);
      } catch (err) {
        console.error("❌ Error al obtener pedidos:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
        fetchPedidos();
    }
  }, [token, cliente, authLoading]);

  const togglePedido = (id: number) => {
    setPedidoAbierto((prev) => (prev === id ? null : id));
  };

  const getStatusColor = (estado: string) => {
    const s = estado.toLowerCase();
    if (s.includes("entregado") || s.includes("completado")) return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    if (s.includes("pendiente")) return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
    if (s.includes("enviado")) return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    if (s.includes("cancelado")) return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ⚡ CAMBIO PRINCIPAL: Eliminamos el wrapper "min-h-screen" y la cabecera separada.
  // Ahora es un contenedor simple que se adapta al Layout padre.
  return (
    <div className="space-y-6">
      
      {/* Cabecera integrada en el flujo */}
      <div className="flex flex-col items-start gap-2 mb-6">
           <Link 
             href="/account" 
             className="text-sm font-bold text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
           >
             &larr; Volver al panel
           </Link>
           <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
             Mis Pedidos
           </h1>
      </div>

      {pedidos.length === 0 ? (
          // EMPTY STATE
          <div className="flex flex-col items-center justify-center py-16 bg-gray-50 dark:bg-darkBg/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center">
             <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-3xl grayscale opacity-50 shadow-sm">
                📦
             </div>
             <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
               Sin historial de pedidos
             </h3>
             <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs mx-auto">
               Aún no has realizado ninguna compra. ¡Es hora de llenar ese carrito!
             </p>
             <Link 
               href="/productos"
               className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-primaryHover transition shadow-md"
             >
               Explorar Tienda
             </Link>
          </div>
        ) : (
          // LISTA DE PEDIDOS
          <div className="space-y-4">
            {pedidos.map((pedido) => {
              const abierto = pedidoAbierto === pedido.id;
              const referencia = pedido.numeroPedido || `#${pedido.id}`;
              // Formateo seguro de fecha
              const fecha = pedido.fechaPedido 
                ? new Date(pedido.fechaPedido).toLocaleDateString("es-ES") 
                : new Date().toLocaleDateString("es-ES");

              return (
                <div key={pedido.id} className="bg-white dark:bg-darkNavBg rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  
                  {/* CABECERA DE LA TARJETA */}
                  <div 
                    onClick={() => togglePedido(pedido.id)}
                    className="p-5 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none"
                  >
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <span className="text-base font-bold text-gray-900 dark:text-white">{referencia}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(pedido.estado)}`}>
                                {pedido.estado}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {fecha}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="font-extrabold text-gray-900 dark:text-white text-lg">
                            {Number(pedido.totalFinal).toFixed(2)} €
                        </span>
                        
                        <div className={`w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center transition-transform duration-300 ${abierto ? 'rotate-180 bg-gray-100 dark:bg-gray-600' : ''}`}>
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                  </div>

                  {/* DETALLE DESPLEGABLE */}
                  {abierto && (
                    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-black/10 p-5 animate-fade-in text-sm">
                        
                        {/* Datos del pedido */}
                        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6 text-gray-600 dark:text-gray-300">
                            <div className="space-y-1">
                                <p><span className="font-semibold">Envío:</span> {pedido.envioMetodo}</p>
                                <p><span className="font-semibold">Pago:</span> {pedido.pagoMetodo}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p><span className="font-semibold">Coste Envío:</span> {Number(pedido.envioCoste).toFixed(2)} €</p>
                            </div>
                        </div>

                        {/* Lista Productos */}
                        <div className="bg-white dark:bg-darkBg/30 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {pedido.productos.map((prod, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="font-medium text-gray-800 dark:text-white">
                                            {prod.cantidad}x {prod.nombre}
                                        </div>
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {Number(prod.subtotal).toFixed(2)} €
                                    </span>
                                </div>
                            ))}
                        </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
      )}
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useClienteAuth } from "@/context/ClienteAuthContext";
// import { fetchWithAuth } from "@/utils/fetchWithAuth";

// interface Producto {
//   productoId: string;
//   nombre: string;
//   cantidad: number;
//   precioUnitario: number;
//   subtotal: number;
// }

// // ✅ INTERFACE ACTUALIZADA A LA NUEVA BASE DE DATOS
// interface Pedido {
//   id: number;
//   numeroPedido?: string;
//   fechaPedido?: string;
//   createdAt?: string;
//   estado: string;
  
//   // Datos planos (ya no son objetos)
//   totalFinal: number;
//   envioMetodo: string;
//   envioCoste: number;
//   pagoMetodo: string;
  
//   productos: Producto[];
//   clienteId?: string;
// }

// export default function OrdersPage() {
//   const { token, cliente } = useClienteAuth();
//   const [pedidos, setPedidos] = useState<Pedido[]>([]);
//   const [pedidoAbierto, setPedidoAbierto] = useState<number | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!token || !cliente?.id) return;

//     const fetchPedidos = async () => {
//       try {
//         const data = await fetchWithAuth(
//           `/api/pedidos?clienteId=${cliente.id}`,
//           token
//         );
//         setPedidos(data.pedidos || []);
//       } catch (err) {
//         console.error("❌ Error al obtener pedidos:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchPedidos();
//   }, [token, cliente]);

//   const togglePedido = (id: number) => {
//     setPedidoAbierto((prev) => (prev === id ? null : id));
//   };

//   const formatPrice = (amount: number) => {
//     return Number(amount || 0).toFixed(2);
//   };

//   if (loading) return <p>Cargando pedidos...</p>;
//   if (!pedidos.length)
//     return <p>No tienes pedidos registrados todavía.</p>;

//   return (
//     <div>
//       <h1 className="text-2xl font-bold mb-6">Historial de pedidos</h1>

//       <div className="divide-y divide-gray-200 border border-gray-200 rounded-md bg-white shadow-sm">
//         {pedidos.map((pedido) => {
//           const abierto = pedidoAbierto === pedido.id;
//           const referencia = pedido.numeroPedido || pedido.id;

//           return (
//             <div key={pedido.id} className="p-4">
//               {/* --- Cabecera del pedido --- */}
//               <button
//                 onClick={() => togglePedido(pedido.id)}
//                 className="w-full flex justify-between items-center text-left font-medium text-gray-800 hover:text-blue-600"
//               >
//                 <div>
//                   <p className="text-sm text-gray-500">
//                     <span className="font-semibold text-gray-800">
//                       Ref. pedido:
//                     </span>{" "}
//                     {referencia}
//                   </p>
//                   <p>
//                     <span className="font-semibold">Fecha:</span>{" "}
//                     {new Date(
//                       pedido.fechaPedido ??
//                         pedido.createdAt ??
//                         ""
//                     ).toLocaleDateString("es-ES")}
//                   </p>
//                   <p>
//                     <span className="font-semibold">Método de pago:</span>{" "}
//                     {/* ✅ CORREGIDO: Usamos pagoMetodo directo */}
//                     {pedido.pagoMetodo || "–"}
//                   </p>
//                 </div>

//                 <div className="text-right">
//                   <p>
//                     <span className="font-semibold">Total:</span>{" "}
//                     {/* ✅ CORREGIDO: Usamos totalFinal directo */}
//                     {formatPrice(pedido.totalFinal)} €
//                   </p>
//                   <p className="capitalize text-sm text-gray-600">
//                     Estado: {pedido.estado}
//                   </p>
//                 </div>
//               </button>

//               {/* --- Detalle desplegable con productos --- */}
//               {abierto && (
//                 <div className="mt-4 border-t border-gray-200 pt-4 animate-fade-in">
//                   <h3 className="text-lg font-semibold mb-3">
//                     Productos
//                   </h3>

//                   <div className="overflow-x-auto">
//                     <table className="w-full text-sm border-collapse mb-4">
//                       <thead>
//                         <tr className="border-b bg-gray-100">
//                           <th className="text-left p-2">Producto</th>
//                           <th className="p-2 text-center">Unidades</th>
//                           <th className="p-2 text-right">Precio</th>
//                           <th className="p-2 text-right">Subtotal</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {pedido.productos.map((prod, index) => (
//                           <tr
//                             key={index}
//                             className="border-b"
//                           >
//                             <td className="p-2">{prod.nombre}</td>
//                             <td className="p-2 text-center">
//                               {prod.cantidad}
//                             </td>
//                             <td className="p-2 text-right">
//                               {formatPrice(prod.precioUnitario)} €
//                             </td>
//                             <td className="p-2 text-right">
//                               {formatPrice(prod.subtotal)} €
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>

//                   {/* Info adicional */}
//                   <div className="mb-4 text-sm">
//                     <p>
//                       <strong>Método de envío:</strong>{" "}
//                       {/* ✅ CORREGIDO: Datos planos */}
//                       {pedido.envioMetodo || "–"}{" "}
//                       {pedido.envioCoste
//                         ? `(Coste: ${formatPrice(pedido.envioCoste)} €)`
//                         : ""}
//                     </p>
//                   </div>

//                   {/* Botón cerrar */}
//                   <button
//                     onClick={() => setPedidoAbierto(null)}
//                     className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm"
//                   >
//                     Cerrar detalles
//                   </button>
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }