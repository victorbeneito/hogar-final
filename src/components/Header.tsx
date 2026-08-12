"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import BannerContacto from "./BannerContacto";

// El logo se muestra con altura fija (64 / 96 / 112 px según pantalla) y anchura
// automática. Con proporción ~2,6:1 eso son unos 170 px de ancho en móvil y 290 en
// escritorio. Lleva `priority` porque está en la cabecera de todas las páginas.
const SIZES_LOGO = "(max-width: 767px) 170px, 290px";

export default function Header() {

  const pathname = usePathname(); // 👈 Obtén la ruta actual

  // 👇 CONDICIÓN MÁGICA: Si estamos en admin, no renderizamos nada
  if (pathname && pathname.startsWith("/admin")) {
    return null;
  }
  return (
    <header className="bg-white dark:bg-darkBg transition-colors duration-300 w-full border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-5 md:py-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8">
          
          {/* --- 1. LOGOTIPO (Izquierda en PC, Centrado en Móvil) --- */}
          <Link href="/" className="flex-shrink-0 hover:opacity-90 transition-opacity">
            {/* Logo Claro. width/height son las medidas del fichero: dan la
                proporción, el tamaño en pantalla lo fija la clase `h-…`. */}
            <Image
              src="/img/logo-hogar-claro.jpg"
              alt="El Hogar de tus Sueños"
              width={284}
              height={109}
              sizes={SIZES_LOGO}
              priority
              className="h-16 md:h-24 lg:h-28 w-auto object-contain block dark:hidden"
            />
            {/* Logo Oscuro. El fichero son 1215x469 y 40 KB para mostrarse a 112 px
                de alto como mucho: next/image lo reescala. */}
            <Image
              src="/img/logo-hogar-dark.jpg"
              alt="El Hogar de tus Sueños"
              width={1215}
              height={469}
              sizes={SIZES_LOGO}
              priority
              className="h-16 md:h-24 lg:h-28 w-auto object-contain hidden dark:block"
            />
          </Link>

          {/* --- 2. BANNERS (Ocultos en Móvil) --- */}
          {/* Usamos 'hidden md:flex' para que desaparezcan en pantallas pequeñas */}
          <div className="hidden md:flex flex-1 items-center justify-around lg:justify-end gap-6 lg:gap-12">

            {/* Banner Dudas (mini-banners clicables: fijo, móvil y email) */}
            <BannerContacto />

            {/* REVI: Widget de sello/badge de valoraciones */}
            <div className="flex-shrink-0">
              <div
                className="revi-widget-X6RbBk4RDL"
                data-revi-widget-lazy=""
                data-id-product=""
                data-lang="es"
              />
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}

// "use client";
// export default function Header() {
//   return (
//     <header className="bg-fondo dark:bg-darkBg p-8 flex items-center justify-between">
//       {/* Logo per a modo normal */}
//       <img
//         src="/img/logo-hogar-claro.jpg"
//         alt="Logotipo Claro"
//         className="h-32 ml-8 block dark:hidden"
//       />
//       {/* Logo per a modo obscur */}
//       <img
//         src="/img/logo-hogar-dark-2.jpg"
//         alt="Logotipo Oscuro"
//         className="h-32 ml-8 hidden dark:block"
//       />
//       <div className="flex-1 flex justify-center">
//         <img
//         src="/img/banner-dudas.jpg"
//         alt="Banner Dudas y Consultas"
//         className="h-32 rounded-lg shadow-lg object-contain"
//       />
//       </div>
//             {/* Banner per a modo normal */}
//       <img
//         src="/img/banner-revi-claro.jpg"
//         alt="Banner Revi Claro"
//         className="h-32 ml-8 block dark:hidden"
//       />
//       {/* Logo per a modo obscur */}
//       <img
//         src="/img/banner-revi.jpg"
//         alt="Banner Revi Oscuro"
//         className="h-32 ml-8 hidden dark:block"
//       />
//     </header>
//   );
// }

