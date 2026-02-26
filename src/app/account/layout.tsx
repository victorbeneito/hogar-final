"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClienteAuth } from "@/context/ClienteAuthContext";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { cliente, loading, logout } = useClienteAuth();

  const links = [
    { name: "Panel Principal", href: "/account", icon: "🏠" },
    { name: "Mis Pedidos", href: "/account/orders", icon: "📦" },
    { name: "Información", href: "/account/info", icon: "👤" },
    { name: "Direcciones", href: "/direcciones", icon: "📍" },
    { name: "Cupones", href: "/account/coupons", icon: "🎟️" },
    { name: "Alertas", href: "/account/alerts", icon: "🔔" },
    { name: "Cookies", href: "/account/cookies", icon: "🍪" },
  ];

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12 font-sans">
      
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* --- BARRA LATERAL --- */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-darkNavBg rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 lg:sticky lg:top-24 overflow-hidden">
            
            {/* Info Usuario */}
            <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                      {cliente?.nombre?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0 overflow-hidden">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {cliente?.nombre || "Usuario"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block">Cliente verificado</p>
                  </div>
              </div>
            </div>

            {/* Menú de Navegación */}
            {/* CAMBIOS REALIZADOS:
                1. max-w-[85vw]: Fuerza bruta para que el contenedor sea menor que la pantalla en móvil.
                2. pb-2: Espacio inferior para que la barra de scroll (si es visible) no tape texto.
                3. flex-nowrap + flex-shrink-0 (en los hijos): Obliga a que los items no se encojan.
            */}
            <nav className="
              flex flex-row lg:flex-col 
              gap-2 p-2 pb-3
              overflow-x-auto 
              w-full 
              max-w-[85vw] lg:max-w-none 
              flex-nowrap 
              items-center lg:items-stretch 
              /* touch-pan-x */ 
            ">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all 
                      whitespace-nowrap flex-shrink-0 select-none
                      ${
                        isActive
                          ? "bg-primary text-white shadow-md transform scale-[1.02]"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary"
                      }
                    `}
                  >
                    <span className="text-lg">{link.icon}</span>
                    {link.name}
                  </Link>
                );
              })}
              
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 lg:hidden flex-shrink-0"></div>

              <button
                onClick={logout}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all whitespace-nowrap flex-shrink-0 mt-0 lg:mt-4 lg:border-t lg:border-gray-100 lg:dark:border-gray-700"
              >
                <span className="text-lg">🚪</span>
                <span className="lg:inline">Salir</span>
              </button>
              
              {/* Espaciador final para asegurar que se pueda scrollear hasta el final */}
              <div className="w-4 flex-shrink-0 lg:hidden"></div>
            </nav>
          </div>
        </aside>

        {/* --- CONTENIDO PRINCIPAL --- */}
        <main className="flex-1 min-w-0">
           {children}
        </main>

      </div>
    </div>
  );
}

// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { useClienteAuth } from "@/context/ClienteAuthContext";

// export default function AccountLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const pathname = usePathname();
//   const { cliente, loading, logout } = useClienteAuth();

//   const links = [
//     { name: "Panel Principal", href: "/account", icon: "🏠" },
//     { name: "Mis Pedidos", href: "/account/orders", icon: "📦" },
//     { name: "Información", href: "/account/info", icon: "👤" },
//     { name: "Direcciones", href: "/direcciones", icon: "📍" },
//     { name: "Cupones", href: "/account/coupons", icon: "🎟️" },
//     { name: "Alertas", href: "/account/alerts", icon: "🔔" },
//     { name: "Cookies", href: "/account/cookies", icon: "🍪" },
//   ];

//   if (loading) {
//     return (
//       <div className="w-full max-w-7xl mx-auto px-4 py-12 flex justify-center">
//         <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12 font-sans">
      
//       <div className="flex flex-col lg:flex-row gap-8">
        
//         {/* --- BARRA LATERAL --- */}
//         <aside className="w-full lg:w-64 flex-shrink-0">
//           <div className="bg-white dark:bg-darkNavBg rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 lg:sticky lg:top-24 overflow-hidden">
            
//             {/* Info Usuario */}
//             <div className="p-4 lg:p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
//               <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0">
//                       {cliente?.nombre?.charAt(0).toUpperCase() || "U"}
//                   </div>
//                   <div className="min-w-0 overflow-hidden">
//                       <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
//                           {cliente?.nombre || "Usuario"}
//                       </p>
//                       <p className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block">Cliente verificado</p>
//                   </div>
//               </div>
//             </div>

//             {/* Menú de Navegación */}
//             <nav className="flex flex-row lg:flex-col gap-2 p-2 overflow-x-auto w-full max-w-[calc(100vw-2.5rem)] lg:max-w-none flex-nowrap items-center lg:items-stretch touch-pan-x scrollbar-hide">
//               {links.map((link) => {
//                 const isActive = pathname === link.href;
//                 return (
//                   <Link
//                     key={link.href}
//                     href={link.href}
//                     className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 select-none ${
//                       isActive
//                         ? "bg-primary text-white shadow-md transform scale-[1.02]"
//                         : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary"
//                     }`}
//                   >
//                     <span className="text-lg">{link.icon}</span>
//                     {link.name}
//                   </Link>
//                 );
//               })}
              
//               <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 lg:hidden flex-shrink-0"></div>

//               <button
//                 onClick={logout}
//                 className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all whitespace-nowrap flex-shrink-0 mt-0 lg:mt-4 lg:border-t lg:border-gray-100 lg:dark:border-gray-700"
//               >
//                 <span className="text-lg">🚪</span>
//                 <span className="lg:inline">Salir</span>
//               </button>
              
//               {/* Espaciador final para móvil */}
//               <div className="w-4 flex-shrink-0 lg:hidden"></div>
//             </nav>
//           </div>
//         </aside>

//         {/* --- CONTENIDO PRINCIPAL --- */}
//         <main className="flex-1 min-w-0">
//            {children}
//         </main>

//       </div>
//     </div>
//   );
// }
