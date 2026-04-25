"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { getCart } from "@/lib/cartService";
import { FaShoppingCart, FaSearch, FaBars, FaTimes, FaUser, FaMoon, FaSun } from "react-icons/fa"; // Iconos extra
import { useDebounce } from "use-debounce";
import { useTheme } from "next-themes"; 


type Categoria = {
  id: number;
  nombre: string;
  parentId?: number | null;
  orden?: number;
  slug?: string;
  other_categoria?: Categoria[];
};

function getCategoryHref(cat: Categoria) {
  return `/categorias/${cat.id}`;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { cliente, logout } = useClienteAuth();
  
  // 🌓 Hook del tema
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Estados de UI
  const [cartCount, setCartCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Estado para menú móvil
  const [showMobileSearch, setShowMobileSearch] = useState(false); // Estado para buscador móvil

  // Estados de Datos
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 400);
  const [categories, setCategories] = useState<Categoria[]>([]);

  // 1. Evitar error de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowMobileSearch(false);
  }, [pathname]);

  // 3. Cargar categorías
  useEffect(() => {
    fetch("/api/categorias")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.categorias) {
          setCategories(data.categorias);
        }
      })
      .catch((err) => console.error("Error cargando menú:", err));
  }, []);

  // 4. Buscador
  useEffect(() => {
    const query = debouncedSearch.trim();
    if (!query) return;
    router.push(`/productos?q=${encodeURIComponent(query)}`);
  }, [debouncedSearch, router]);

  // 5. Contador Carrito
  const actualizarContador = () => {
    const cart = getCart();
    const totalCantidad = cart.reduce((acc, item) => acc + item.cantidad, 0);
    setCartCount(totalCantidad);
  };

  const categoriasPadre = categories.filter((cat) => cat.parentId === null);
  const categoriasOrdenadas = [...categoriasPadre].sort((a, b) => {
    const ordenA = Number(a.orden ?? 0);
    const ordenB = Number(b.orden ?? 0);
    if (ordenA !== ordenB) return ordenA - ordenB;
    return a.nombre.localeCompare(b.nombre);
  });

  useEffect(() => {
    actualizarContador();
    const handleStorageChange = () => actualizarContador();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    router.push("/");
  };

  if (!mounted) return null;

  

  // 👇 CONDICIÓN MÁGICA: Si estamos en admin, no renderizamos nada
  if (pathname && pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 bg-terciary text-neutral font-poppins dark:bg-darkNavBg dark:text-darkNavText transition-colors duration-300 shadow-sm">
      
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-3 flex justify-between items-center">
        
        {/* --- IZQUIERDA: Hamburguesa (Móvil) + Logo/Inicio --- */}
        <div className="flex items-center gap-4">
            {/* Botón Hamburguesa (Solo Móvil) */}
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden text-2xl hover:text-primary focus:outline-none"
            >
                <FaBars />
            </button>

            {/* Logo / Inicio */}
            <Link href="/" className="text-xl font-bold hover:text-primary whitespace-nowrap">
                Inicio
            </Link>

            {/* Categorías (Solo Desktop) */}
            <div className="hidden lg:flex space-x-4 items-center ml-4">
                {categoriasOrdenadas.map((cat) => {
                  const hijos = [...(cat.other_categoria ?? [])].sort((a, b) => {
                    const ordenA = Number(a.orden ?? 0);
                    const ordenB = Number(b.orden ?? 0);
                    if (ordenA !== ordenB) return ordenA - ordenB;
                    return a.nombre.localeCompare(b.nombre);
                  });

                  if (!hijos.length) {
                    return (
                      <Link
                        key={cat.id}
                        href={getCategoryHref(cat)}
                        className="hover:text-primary text-sm font-medium uppercase tracking-wide transition-colors whitespace-nowrap"
                      >
                        {cat.nombre}
                      </Link>
                    );
                  }

                  return (
                    <div key={cat.id} className="relative group">
                      <Link
                        href={getCategoryHref(cat)}
                        className="hover:text-primary text-sm font-medium uppercase tracking-wide transition-colors whitespace-nowrap"
                      >
                        {cat.nombre}
                      </Link>

                      <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[80]">
                        <div className="min-w-56 rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden">
                          <div className="py-2">
                            {hijos.map((hijo) => (
                              <Link
                                key={hijo.id}
                                href={getCategoryHref(hijo)}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors whitespace-nowrap"
                              >
                                {hijo.nombre}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
        </div>

        {/* --- DERECHA: Buscador + Acciones --- */}
        <div className="flex items-center space-x-3 md:space-x-4">
            
            {/* Buscador (Desktop) */}
            <div className="hidden md:block relative">
                <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-3 pr-8 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 border-none focus:ring-2 focus:ring-primary text-sm w-48 lg:w-64 transition-all"
                />
                <FaSearch className="absolute right-3 top-2.5 text-gray-400 text-xs" />
            </div>

            {/* Icono Lupa (Solo Móvil) */}
            <button 
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="md:hidden text-xl hover:text-primary"
            >
                <FaSearch />
            </button>

            {/* Botón Tema */}
            <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="bg-gray-200 dark:bg-gray-700 text-yellow-500 dark:text-blue-300 rounded-full p-2 transition-transform hover:scale-110"
                aria-label="Alternar tema"
            >
                {theme === "dark" ? <FaMoon /> : <FaSun />}
            </button>

            {/* Carrito */}
            <Link href="/carrito" className="relative text-2xl hover:text-primary transition-colors">
                <FaShoppingCart />
                {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce-short">
                    {cartCount}
                </span>
                )}
            </Link>

            {/* Usuario (Solo Desktop) */}
            <div className="hidden md:flex items-center gap-2">
                {cliente ? (
                    <>
                        <Link href="/account" className="text-sm font-medium hover:text-primary flex items-center gap-1">
                            <FaUser className="text-xs" /> {cliente.nombre}
                        </Link>
                        <button onClick={handleLogout} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 ml-2">
                            Salir
                        </button>
                    </>
                ) : (
                    <Link href="/auth" className="px-4 py-1.5 bg-primary text-white text-sm rounded-full hover:bg-primaryHover transition-transform hover:scale-105 shadow-md">
                        Login
                    </Link>
                )}
            </div>
        </div>

      </div>

      {/* --- BUSCADOR EXPANDIBLE (Móvil) --- */}
      {showMobileSearch && (
         <div className="md:hidden px-4 pb-3 animate-fade-in">
            <input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none"
                autoFocus
            />
         </div>
      )}

      {/* --- MENÚ LATERAL (DRAWER MÓVIL) --- */}
      {/* Overlay Oscuro */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Panel Lateral */}
      <div className={`fixed top-0 left-0 h-full w-[80%] max-w-sm bg-white dark:bg-darkNavBg z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         
         <div className="p-5 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
            <span className="font-bold text-lg dark:text-white">Menú</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500 hover:text-red-500 text-xl">
               <FaTimes />
            </button>
         </div>

         <div className="p-5 overflow-y-auto h-full pb-20 space-y-6">
            
            {/* Usuario Móvil */}
            {cliente ? (
               <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-xl flex items-center gap-3">
                   <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {cliente.nombre.charAt(0)}
                   </div>
                   <div>
                      <p className="font-bold text-gray-900 dark:text-white">{cliente.nombre}</p>
                      <Link href="/account" className="text-xs text-primary hover:underline">Ir a mi cuenta</Link>
                   </div>
               </div>
            ) : (
               <Link href="/auth" className="block w-full text-center bg-primary text-white py-3 rounded-lg font-bold shadow hover:bg-primaryHover">
                  Iniciar Sesión
               </Link>
            )}

            {/* Lista Categorías */}
            <div>
               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Categorías</h4>
               <ul className="space-y-2">
                {categoriasPadre.map((cat) => {
                    const hijos = cat.other_categoria ?? [];

                    return (
                      <li key={cat.id}>
                        <Link 
                          href={getCategoryHref(cat)}
                          className="block py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium"
                        >
                          {cat.nombre}
                        </Link>

                        {hijos.length > 0 && (
                          <div className="mt-1 ml-3 border-l border-gray-200 dark:border-gray-700 pl-3 space-y-1">
                            {hijos.map((hijo) => (
                              <Link
                                key={hijo.id}
                                href={getCategoryHref(hijo)}
                                className="block py-1.5 px-2 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary"
                              >
                                {hijo.nombre}
                              </Link>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
               </ul>
            </div>

            {/* Logout Móvil */}
            {cliente && (
               <button 
                 onClick={handleLogout}
                 className="w-full border border-red-200 text-red-600 dark:text-red-400 py-3 rounded-lg font-bold hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
               >
                 Cerrar Sesión
               </button>
            )}
         </div>
      </div>

    </nav>
  );
}

// "use client";

// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useClienteAuth } from "@/context/ClienteAuthContext";
// import { getCart } from "@/lib/cartService";
// import { FaShoppingCart } from "react-icons/fa";
// import { useDebounce } from "use-debounce";
// import { useTheme } from "next-themes"; // 👈 IMPORTANTE

// type Categoria = {
//   id: number;
//   nombre: string;
// };

// export default function Navbar() {
//   const router = useRouter();
//   const { cliente, logout } = useClienteAuth();
  
//   // 🌓 Hook del tema (next-themes)
//   const { theme, setTheme } = useTheme();
//   const [mounted, setMounted] = useState(false);

//   const [cartCount, setCartCount] = useState(0);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [debouncedSearch] = useDebounce(searchQuery, 400);
//   const [categories, setCategories] = useState<Categoria[]>([]);

//   // 1. Evitar error de hidratación
//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   // 2. Cargar categorías
//   useEffect(() => {
//     fetch("/api/categorias")
//       .then((res) => res.json())
//       .then((data) => {
//         if (data.ok && data.categorias) {
//           setCategories(data.categorias);
//         }
//       })
//       .catch((err) => console.error("Error cargando menú:", err));
//   }, []);

//   // 3. Buscador
//   useEffect(() => {
//     const query = debouncedSearch.trim();
//     if (!query) return;
//     router.push(`/productos?q=${encodeURIComponent(query)}`);
//   }, [debouncedSearch, router]);

//   // 4. Contador Carrito
//   const actualizarContador = () => {
//     const cart = getCart();
//     const totalCantidad = cart.reduce((acc, item) => acc + item.cantidad, 0);
//     setCartCount(totalCantidad);
//   };

//   useEffect(() => {
//     actualizarContador();
//     const handleStorageChange = () => actualizarContador();
//     window.addEventListener("storage", handleStorageChange);
//     return () => window.removeEventListener("storage", handleStorageChange);
//   }, []);

//   const handleLogout = () => {
//     logout();
//     router.push("/");
//   };

//   // Evitamos renderizar hasta que sepamos el tema (para evitar parpadeos)
//   if (!mounted) return null;

//   return (
//     <nav className="flex justify-between items-center bg-terciary text-neutral px-8 py-2 font-poppins dark:bg-darkNavBg dark:text-darkNavText transition-colors duration-300">
      
//       {/* Izquierda - categorías */}
//       <div className="flex space-x-6 overflow-x-auto items-center">
//         <Link href="/" className="hover:text-primary font-bold">
//           Inicio
//         </Link>

//         {categories.map((cat) => (
//           <Link
//             key={cat.id}
//             href={`/categorias/${cat.id}`}
//             className="hover:text-primary text-neutral dark:text-darkNavText whitespace-nowrap"
//           >
//             {cat.nombre}
//           </Link>
//         ))}
//       </div>

//       {/* Derecha */}
//       <div className="flex items-center space-x-4">
//         <input
//           type="text"
//           placeholder="Buscar..."
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)}
//           className="px-3 py-1 rounded-md text-black border border-gray-300 focus:outline-none focus:border-primary"
//         />

//         {/* BOTÓN MODO OSCURO AUTOMÁTICO */}
//         <button
//           onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
//           className="bg-primary hover:bg-primaryHover text-white rounded-full p-2 transition-colors w-10 h-10 flex items-center justify-center"
//           aria-label="Alternar tema"
//         >
//           {theme === "dark" ? "🌞" : "🌙"}
//         </button>

//         <Link href="/carrito" className="relative text-2xl hover:text-primary transition-colors">
//           <FaShoppingCart />
//           {cartCount > 0 && (
//             <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
//               {cartCount}
//             </span>
//           )}
//         </Link>

//         {cliente ? (
//           <div className="flex gap-2 items-center">
//             <Link href="/account" className="px-3 py-1 bg-primary text-white rounded hover:bg-primaryHover transition-colors dark:bg-gray-700 dark:hover:bg-gray-600">
//               Hola, {cliente.nombre}
//             </Link>
//             <button 
//               onClick={handleLogout} 
//               className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
//             >
//               Salir
//             </button>
//           </div>
//         ) : (
//           <Link href="/auth" className="px-4 py-2 bg-primary text-white rounded hover:bg-primaryHover transition-colors">
//             Login
//           </Link>
//         )}
//       </div>
//     </nav>
//   );
// }
