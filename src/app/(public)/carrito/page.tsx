"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCart,
  setCart,
  removeFromCart,
  clearCart,
  CartItem,
} from "@/lib/cartService";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import toast from "react-hot-toast";

export default function CarritoPage() {
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const router = useRouter();
  const { cliente, loading } = useClienteAuth();
  const [isClient, setIsClient] = useState(false);

  // Evitar hidratación incorrecta
  useEffect(() => {
    setIsClient(true);
    const items = getCart();
    setCarrito(items);
  }, []);

  useEffect(() => {
    const nuevoTotal = carrito.reduce(
      (acc, item) => acc + (item.precioFinal ?? item.precio) * item.cantidad,
      0
    );
    setTotal(nuevoTotal);
  }, [carrito]);

  const updateQuantity = (id: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    const updated = carrito.map((item) =>
      item.id === id ? { ...item, cantidad: nuevaCantidad } : item
    );
    // Actualizamos localStorage y estado
    setCart(updated);
    setCarrito(updated);
    // Disparamos evento para actualizar el header
    window.dispatchEvent(new Event("storage"));
  };

  const handleRemove = (id: number) => {
    removeFromCart(id);
    setCarrito(getCart());
    window.dispatchEvent(new Event("storage"));
    toast.success("Producto eliminado");
  };

  const handleClearCart = () => {
    if (confirm("¿Estás seguro de que quieres vaciar todo el carrito?")) {
      clearCart();
      setCarrito([]);
      window.dispatchEvent(new Event("storage"));
      toast.success("Carrito vaciado");
    }
  };

  const handleFinalizarCompra = () => {
    if (loading) return;

    if (carrito.length === 0) {
      toast.error("Tu carrito está vacío.");
      return;
    }

    if (!cliente) {
      toast("Inicia sesión para continuar 🔒");
      router.push("/auth?redirect=/checkout/direcciones");
      return;
    }

    if (!cliente.direccion || !cliente.codigoPostal || !cliente.ciudad) {
      toast("Completa tu dirección de envío 🏠");
      router.push("/direcciones?next=/checkout/envio");
      return;
    }

    router.push("/checkout/envio");
  };

  if (!isClient) return null; // Evita parpadeos de hidratación

  // --- VISTA: CARRITO VACÍO ---
  if (carrito.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-fondo dark:bg-darkBg transition-colors px-4">
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
          Tu carrito está vacío 🛒
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
          Parece que aún no has añadido nada. Explora nuestro catálogo y encuentra lo que buscas.
        </p>
        <Link
          href="/productos"
          className="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-primaryHover transition shadow-lg transform hover:-translate-y-1"
        >
          Ir a la Tienda
        </Link>
      </div>
    );
  }

  // --- VISTA: CON PRODUCTOS ---
  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg transition-colors duration-300 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8">
           Tu Carrito <span className="text-gray-500 text-lg font-normal ml-2">({carrito.length} artículos)</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
            
            {/* --- LISTA DE PRODUCTOS --- */}
            <div className="lg:col-span-2 space-y-6">
                {carrito.map((item) => (
                    <div 
                        key={item.id} 
                        className="bg-white dark:bg-darkNavBg rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-6 transition-colors"
                    >
                        {/* Imagen */}
                        <div className="w-full sm:w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-600 relative">
                             <img
                                src={item.imagen || "/no-image.jpg"}
                                alt={item.nombre}
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Detalles */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 pr-4">
                                        {item.nombre}
                                    </h2>
                                    <button 
                                        onClick={() => handleRemove(item.id)}
                                        className="text-gray-400 hover:text-red-500 transition p-1"
                                        title="Eliminar producto"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                                
                                {/* Atributos opcionales (Talla, Color...) */}
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                                    {(item as any).tamanoSeleccionado && <p>Tamaño: <span className="text-gray-800 dark:text-gray-300">{(item as any).tamanoSeleccionado}</span></p>}
                                    {(item as any).colorSeleccionado && <p>Color: <span className="text-gray-800 dark:text-gray-300">{(item as any).colorSeleccionado}</span></p>}
                                    {(item as any).tiradorSeleccionado && <p>Tirador: <span className="text-gray-800 dark:text-gray-300">{(item as any).tiradorSeleccionado}</span></p>}
                                    {/* Si no hay atributos, mostramos algo por defecto */}
                                    {!(item as any).tamanoSeleccionado && !(item as any).colorSeleccionado && (
                                        <p>Opción: <span className="text-gray-800 dark:text-gray-300">{(item as any).atributo || 'Estándar'}</span></p>
                                    )}
                                </div>
                            </div>

                            {/* Controles de Precio y Cantidad */}
                            <div className="flex justify-between items-end mt-4">
                                {/* Selector Cantidad */}
                                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                                        disabled={item.cantidad <= 1}
                                        className="px-3 py-1 bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-600 dark:text-gray-300 transition"
                                    >
                                        −
                                    </button>
                                    <span className="px-4 py-1 text-sm font-bold text-gray-900 dark:text-white min-w-[2.5rem] text-center bg-white dark:bg-darkNavBg">
                                        {item.cantidad}
                                    </span>
                                    <button
                                        onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                                        className="px-3 py-1 bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
                                    >
                                        +
                                    </button>
                                </div>

                                {/* Precio Total Item */}
                                <div className="text-right">
                                    {item.cantidad > 1 && (
                                        <p className="text-xs text-gray-400 mb-1">
                                            {(item.precioFinal ?? item.precio).toFixed(2)} € / ud.
                                        </p>
                                    )}
                                    <p className="font-bold text-xl text-primary">
                                        {((item.precioFinal ?? item.precio) * item.cantidad).toFixed(2)} €
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleClearCart}
                    className="text-red-500 hover:text-red-700 text-sm font-semibold hover:underline transition"
                >
                    Vaciar todo el carrito
                </button>
            </div>

            {/* --- RESUMEN (Sticky) --- */}
            <div className="lg:col-span-1 lg:sticky lg:top-24">
                <div className="bg-white dark:bg-darkNavBg p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b dark:border-gray-700 pb-4">
                        Resumen del Pedido
                    </h2>
                    
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-gray-600 dark:text-gray-300">
                            <span>Subtotal</span>
                            <span>{total.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-300">
                            <span>Envío estimado</span>
                            <span className="text-green-600 dark:text-green-400 text-sm">Se calcula en el siguiente paso</span>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center mb-8">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                        <span className="text-3xl font-extrabold text-primary">
                            {total.toFixed(2)} €
                        </span>
                    </div>

                    <button
                        onClick={handleFinalizarCompra}
                        className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primaryHover transition-all shadow-lg shadow-yellow-500/20 hover:shadow-xl transform hover:-translate-y-0.5 flex justify-center items-center gap-2"
                    >
                        Tramitar Pedido &rarr;
                    </button>

                    <div className="mt-6 flex justify-center gap-4 opacity-50 grayscale">
                        <div className="text-[10px] border border-gray-300 dark:border-gray-600 px-2 py-1 rounded text-gray-500 dark:text-gray-400 font-bold">VISA</div>
                        <div className="text-[10px] border border-gray-300 dark:border-gray-600 px-2 py-1 rounded text-gray-500 dark:text-gray-400 font-bold">MASTERCARD</div>
                        <div className="text-[10px] border border-gray-300 dark:border-gray-600 px-2 py-1 rounded text-gray-500 dark:text-gray-400 font-bold">PAYPAL</div>
                    </div>
                </div>
                
                <div className="mt-6 text-center">
                    <Link href="/productos" className="text-sm text-gray-500 hover:text-primary underline">
                        Continuar comprando
                    </Link>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import {
//   getCart,
//   setCart,
//   removeFromCart,
//   clearCart,
//   CartItem,
// } from "@/lib/cartService";
// import { useClienteAuth } from "@/context/ClienteAuthContext";
// import toast from "react-hot-toast";

// export default function CarritoPage() {
//   const [carrito, setCarrito] = useState<CartItem[]>([]);
//   const [total, setTotal] = useState(0);
//   const router = useRouter();
//   const { cliente, loading } = useClienteAuth();

//   useEffect(() => {
//     const items = getCart();
//     setCarrito(items);
//   }, []);

//   useEffect(() => {
//     const nuevoTotal = carrito.reduce(
//       (acc, item) => acc + (item.precioFinal ?? item.precio) * item.cantidad,
//       0
//     );
//     setTotal(nuevoTotal);
//   }, [carrito]);

//   const updateQuantity = (id: number, nuevaCantidad: number) => {
//     if (nuevaCantidad < 1) return;
//     const updated = carrito.map((item) =>
//       item.id === id ? { ...item, cantidad: nuevaCantidad } : item
//     );
//     setCart(updated);
//     setCarrito(updated);
//   };

//   const handleRemove = (id: number) => {
//     removeFromCart(id);
//     setCarrito(getCart());
//   };

//   const handleClearCart = () => {
//     if (confirm("¿Vaciar todo el carrito?")) {
//       clearCart();
//       setCarrito([]);
//     }
//   };

//   const handleFinalizarCompra = () => {
//     if (loading) return;

//     if (carrito.length === 0) {
//       toast.error("Tu carrito está vacío.");
//       return;
//     }

//     if (!cliente) {
//       toast.error("Debes iniciar sesión para continuar.");
//       // router.push("/auth?redirect=/account/info?redirect=/checkout/envio");
//       router.push("/auth?redirect=/account/info?redirect=/checkout/direcciones");
//       return;
//     }

//     if (!cliente.direccion || !cliente.codigoPostal || !cliente.ciudad) {
//       toast("Por favor completa tu dirección antes de continuar 🏠");
//       // router.push("/account/info?redirect=/checkout/envio");
//       router.push("/account/info?redirect=/checkout/direcciones");
//       return;
//     }
//     // router.push("/checkout/envio");
//     router.push("/checkout/direcciones");
//   };

//   if (carrito.length === 0) {
//     return (
//       <div className="max-w-4xl mx-auto py-12 text-center">
//         <h1 className="text-2xl font-semibold mb-6 dark:text-white">
//           Tu carrito está vacío 🛒
//         </h1>
//         <Link
//           href="/productos"
//           className="inline-block bg-primary text-white px-4 py-2 rounded hover:bg-primaryHover transition"
//         >
//           Ir a comprar
//         </Link>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
//       <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
//         Tu carrito 🛍️
//       </h1>

//       {/* Lista de productos */}
//       <div className="bg-white dark:bg-darkNavBg shadow rounded-lg overflow-hidden divide-y dark:divide-gray-700 transition-colors duration-300">
//         {carrito.map((item) => (
//           <div key={item.id} className="p-4 flex items-center gap-4">
//             <img
//               src={item.imagen || "/no-image.jpg"}
//               alt={item.nombre}
//               className="w-20 h-20 object-cover rounded border dark:border-gray-600"
//             />

//             <div className="flex-1">
//               <h2 className="font-semibold text-gray-800 dark:text-gray-100">
//                 {item.nombre}
//               </h2>
//               <p className="text-sm text-gray-500 dark:text-gray-400">
//                 {item.tamanoSeleccionado && (
//                   <span>Tamaño: {item.tamanoSeleccionado} · </span>
//                 )}
//                 {item.colorSeleccionado && (
//                   <span>Color: {item.colorSeleccionado} · </span>
//                 )}
//                 {item.tiradorSeleccionado && (
//                   <span>Tirador: {item.tiradorSeleccionado}</span>
//                 )}
//               </p>
//               <p className="mt-1 text-gray-700 dark:text-gray-300 font-medium">
//                 {(item.precioFinal ?? item.precio).toFixed(2)} €
//               </p>
//             </div>

//             {/* Controles de cantidad */}
//             <div className="flex items-center gap-3">
//               <button
//                 onClick={() => updateQuantity(item.id, item.cantidad - 1)}
//                 className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 rounded dark:bg-gray-700 dark:hover:bg-gray-600"
//                 disabled={item.cantidad <= 1}
//               >
//                 –
//               </button>

//               <span className="font-medium w-6 text-center dark:text-white dark:bg-gray-700 dark:hover:bg-gray-600">
//                 {item.cantidad}
//               </span>

//               <button
//                 onClick={() => updateQuantity(item.id, item.cantidad + 1)}
//                 className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
//               >
//                 +
//               </button>

//               <button
//                 onClick={() => handleRemove(item.id)}
//                 className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm font-medium ml-2"
//               >
//                 Eliminar
//               </button>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Resumen y acciones */}
//       <div className="bg-white dark:bg-darkNavBg shadow rounded-lg p-6 text-right space-y-4 transition-colors duration-300">
//         <p className="text-lg text-gray-700 dark:text-gray-200">
//           Total:{" "}
//           <span className="text-2xl font-bold text-primary">
//             {total.toFixed(2)} €
//           </span>
//         </p>

//         <div className="flex justify-end gap-4">
//           <button
//             onClick={handleClearCart}
//             className="border border-gray-300 dark:border-gray-600 rounded px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300"
//           >
//             Vaciar carrito
//           </button>

//           <button
//             onClick={handleFinalizarCompra}
//             className="bg-primary text-white px-6 py-2 rounded font-semibold hover:bg-primaryHover transition dark:bg-gray-700 dark:hover:bg-gray-600"
//           >
//             Finalizar compra →
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }