"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

/**
 * Componente interno que carga los productos
 */
function ProductosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q")?.trim() || "";

  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        setCargando(true);
        setError("");

        const url = q
          ? `/api/productos?q=${encodeURIComponent(q)}`
          : "/api/productos";

        const res = await fetch(url, { cache: "no-store" });
        
        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        
        const data = await res.json();
        
        // Adaptamos según si tu API devuelve un array directo o un objeto { productos: [...] }
        const lista = Array.isArray(data) ? data : data.productos;
        setProductos(lista || []);

      } catch (err: any) {
        console.error(err);
        setError("Hubo un problema al cargar los productos. Inténtalo de nuevo.");
      } finally {
        // Pequeño delay artificial si quieres evitar parpadeos muy rápidos (opcional)
        // setTimeout(() => setCargando(false), 300);
        setCargando(false);
      }
    };

    cargarProductos();
  }, [q]);

  // --- 1. SKELETON LOADING (Carga elegante) ---
  if (cargando) {
    return (
      <main className="min-h-screen bg-fondo dark:bg-darkBg px-4 py-8 md:py-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Título Skeleton */}
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-8 animate-pulse"></div>
          
          {/* Grid de Tarjetas Skeleton */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-darkNavBg rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm h-[400px] flex flex-col animate-pulse">
                <div className="bg-gray-200 dark:bg-gray-700 h-48 rounded-lg mb-4 w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-auto"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4"></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // --- 2. ESTADO DE ERROR ---
  if (error) {
    return (
      <main className="min-h-screen bg-fondo dark:bg-darkBg px-4 py-12 flex flex-col items-center justify-center text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-100 dark:border-red-800">
           <p className="text-red-600 dark:text-red-400 font-bold mb-4">{error}</p>
           <button 
             onClick={() => window.location.reload()}
             className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
           >
             Recargar página
           </button>
        </div>
      </main>
    );
  }

  // --- 3. VISTA PRINCIPAL ---
  return (
    <main className="min-h-screen bg-fondo dark:bg-darkBg px-4 py-8 md:py-12 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Cabecera de Sección */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-200 dark:border-gray-700 pb-4 gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                    {q ? `Resultados para "${q}"` : "Nuestra Colección"}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {productos.length} {productos.length === 1 ? 'producto encontrado' : 'productos encontrados'}
                </p>
            </div>
            
            {q && (
                <Link 
                  href="/productos"
                  className="text-primary hover:text-primaryHover font-bold text-sm underline underline-offset-4"
                >
                  Ver todos los productos
                </Link>
            )}
        </div>

        {/* Grid de Productos */}
        {productos.length === 0 ? (
          // Estado Vacío (Empty State)
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-4xl">
                🔍
             </div>
             <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {q ? `No encontramos nada con "${q}"` : "No hay productos disponibles"}
             </h3>
             <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                Intenta buscar con otros términos o echa un vistazo a nuestras categorías principales.
             </p>
             <button 
                onClick={() => router.push('/productos')}
                className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primaryHover transition"
             >
                Ver todo el catálogo
             </button>
          </div>
        ) : (
          // Lista de productos
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productos.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Página principal /productos
 * Envuelto en Suspense para evitar errores de compilación con useSearchParams
 */
export default function ProductosPage() {
  return (
    <Suspense 
        fallback={
            <div className="min-h-screen bg-fondo dark:bg-darkBg flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        }
    >
      <ProductosContent />
    </Suspense>
  );
}

// 'use client';

// import { Suspense, useEffect, useState } from 'react';
// import { useSearchParams } from 'next/navigation';
// import ProductCard from '@/components/ProductCard';

// /**
//  * Este componente renderiza la lista de productos usando el parámetro de búsqueda (?q=)
//  * Debe ir envuelto en <Suspense> porque usa useSearchParams()
//  */
// function ProductosContent() {
//   const searchParams = useSearchParams();
//   const q = searchParams.get('q')?.trim() || ''; // lee ?q=
//   const [productos, setProductos] = useState<any[]>([]);
//   const [cargando, setCargando] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const cargarProductos = async () => {
//       try {
//         setCargando(true);

//         // Construye la URL de la API según si hay búsqueda
//         const url = q
//           ? `/api/productos?q=${encodeURIComponent(q)}`
//           : '/api/productos';

//         const res = await fetch(url, { cache: 'no-store' });
//         const data = await res.json();
//         console.log('🧾 API Productos:', data);

//         const lista = Array.isArray(data) ? data : data.productos;
//         setProductos(lista || []);
//       } catch (err: any) {
//         setError('No se pudieron cargar los productos');
//       } finally {
//         setCargando(false);
//       }
//     };

//     cargarProductos();
//   }, [q]); // vuelve a ejecutarse al cambiar el texto en URL

//   if (cargando) {
//     return (
//       <main className="min-h-screen bg-fondo px-4 py-12">
//         <div className="max-w-5xl mx-auto text-[#777777]">
//           Cargando productos...
//         </div>
//       </main>
//     );
//   }

//   if (error) {
//     return (
//       <main className="min-h-screen bg-fondo px-4 py-12">
//         <div className="max-w-5xl mx-auto text-red-500">{error}</div>
//       </main>
//     );
//   }

//   return (
//     <main className="min-h-screen bg-fondo px-4 py-12">
//       <div className="max-w-5xl mx-auto">
//         <h1 className="text-3xl font-extrabold text-[#333333] mb-6">
//           {q ? `Resultados para "${q}"` : 'Productos'}
//         </h1>

//         {productos.length === 0 ? (
//           <p className="text-[#777777]">
//             {q
//               ? `No se encontraron productos con "${q}".`
//               : 'No hay productos disponibles.'}
//           </p>
//         ) : (
//           <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
//             {productos.map((p) => (
//               <ProductCard key={p.id} producto={p} />
//             ))}
//           </div>
//         )}
//       </div>
//     </main>
//   );
// }

// /**
//  * Página principal de /productos
//  * Se envuelve ProductosContent en <Suspense> para cumplir con useSearchParams()
//  */
// export default function ProductosPage() {
//   return (
//     <Suspense fallback={<div className="p-8">Cargando filtros...</div>}>
//       <ProductosContent />
//     </Suspense>
//   );
// }

