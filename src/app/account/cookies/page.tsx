"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg transition-colors duration-300 font-sans">
      
      {/* Cabecera */}
      <div className="bg-white dark:bg-darkNavBg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
           <Link 
             href="/" 
             className="text-sm font-bold text-gray-400 hover:text-primary mb-4 inline-block transition-colors"
           >
             &larr; Volver al inicio
           </Link>
           <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
             <span className="text-4xl">🍪</span> Política de Cookies
           </h1>
           <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
             Transparencia total sobre cómo usamos tus datos.
           </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-12 text-gray-600 dark:text-gray-300 leading-relaxed">

          {/* Sección 1: Qué son */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. ¿Qué son las cookies?
            </h2>
            <p className="mb-4">
              Una cookie es un pequeño fichero de texto que se almacena en tu navegador cuando visitas casi cualquier página web. Su utilidad es que la web sea capaz de recordar tu visita cuando vuelvas a navegar por esa página.
            </p>
            <p>
              Las cookies suelen almacenar información de carácter técnico, preferencias personales, personalización de contenidos, estadísticas de uso, enlaces a redes sociales, acceso a cuentas de usuario, etc.
            </p>
          </section>

          {/* Sección 2: Tipos (Tabla) */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              2. Cookies que utilizamos
            </h2>
            
            <div className="bg-white dark:bg-darkNavBg rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Finalidad</th>
                            <th className="p-4 hidden sm:table-cell">Duración</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        <tr>
                            <td className="p-4 font-bold text-gray-800 dark:text-white">Técnicas</td>
                            <td className="p-4">Necesarias para la navegación y el buen funcionamiento de nuestra web (carrito, sesión, etc.).</td>
                            <td className="p-4 hidden sm:table-cell">Sesión</td>
                        </tr>
                        <tr>
                            <td className="p-4 font-bold text-gray-800 dark:text-white">Personalización</td>
                            <td className="p-4">Permiten recordar tus preferencias (idioma, moneda, modo oscuro).</td>
                            <td className="p-4 hidden sm:table-cell">1 año</td>
                        </tr>
                        <tr>
                            <td className="p-4 font-bold text-gray-800 dark:text-white">Analíticas</td>
                            <td className="p-4">Nos ayudan a entender cómo usas la web para mejorarla (Google Analytics).</td>
                            <td className="p-4 hidden sm:table-cell">2 años</td>
                        </tr>
                    </tbody>
                </table>
            </div>
          </section>

          {/* Sección 3: Desactivación */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Desactivación de cookies
            </h2>
            <p className="mb-4">
              Puedes permitir, bloquear o eliminar las cookies instaladas en tu equipo mediante la configuración de las opciones del navegador instalado en tu ordenador.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                    ⚠️ Nota: Si desactivas las cookies técnicas, es posible que algunas funciones de la tienda (como el carrito de compra o el inicio de sesión) no funcionen correctamente.
                </p>
            </div>
          </section>

          {/* Botón de Configuración */}
          <div className="pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
             <button
               onClick={() => window.dispatchEvent(new CustomEvent("openCookieSettings"))}
               className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-8 py-3 rounded-lg hover:opacity-90 transition shadow-lg"
             >
               <Settings2 className="w-5 h-5" />
               Gestionar mis preferencias
             </button>
             <p className="text-xs text-gray-400 mt-4">
                Última actualización: Febrero 2026
             </p>
          </div>

        </div>
      </main>
    </div>
  );
}