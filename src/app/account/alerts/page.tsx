"use client";

import Link from "next/link";
import { useState } from "react";

export default function AlertsPage() {
  // Simulamos estado de preferencias
  const [prefs, setPrefs] = useState({
    newsletter: true,
    promos: true,
    pedidos: true,
    stock: false,
  });

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg transition-colors duration-300">
      
      {/* Cabecera */}
      <div className="bg-white dark:bg-darkNavBg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
           <Link 
             href="/account" 
             className="text-sm font-bold text-gray-400 hover:text-primary mb-4 inline-block transition-colors"
           >
             &larr; Volver a mi cuenta
           </Link>
           <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
             <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 p-2 rounded-lg">🔔</span>
             Mis Alertas
           </h1>
           <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
             Gestiona tus avisos de stock, bajadas de precio y notificaciones.
           </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        
        {/* SECCIÓN 1: ALERTAS DE PRODUCTOS (Empty State) */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Avisos de Disponibilidad
          </h2>
          
          {/* Tarjeta de "No hay alertas" */}
          <div className="bg-white dark:bg-darkNavBg rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 text-center flex flex-col items-center">
             <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
             </div>
             
             <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
               No tienes alertas de stock activas
             </h3>
             <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
               Cuando un producto no esté disponible, podrás activar una alerta en su ficha para que te avisemos en cuanto vuelva.
             </p>
             
             <Link 
               href="/productos"
               className="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-primaryHover transition shadow-lg shadow-yellow-500/20"
             >
               Explorar Catálogo
             </Link>
          </div>
        </section>

        {/* SECCIÓN 2: PREFERENCIAS (Toggle Switches) */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Preferencias de Comunicación
          </h2>

          <div className="bg-white dark:bg-darkNavBg rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
             
             {/* Opción 1: Newsletter */}
             <div className="p-6 flex items-center justify-between gap-4">
                <div>
                   <h3 className="font-bold text-gray-800 dark:text-white">Newsletter y Novedades</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Recibe noticias sobre nuevos productos y tendencias.</p>
                </div>
                <button 
                  onClick={() => toggle('newsletter')}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${prefs.newsletter ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow ${prefs.newsletter ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
             </div>

             {/* Opción 2: Promociones */}
             <div className="p-6 flex items-center justify-between gap-4">
                <div>
                   <h3 className="font-bold text-gray-800 dark:text-white">Ofertas Exclusivas</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Cupones descuento y promociones solo para ti.</p>
                </div>
                <button 
                  onClick={() => toggle('promos')}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${prefs.promos ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow ${prefs.promos ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
             </div>

             {/* Opción 3: Estado Pedidos */}
             <div className="p-6 flex items-center justify-between gap-4">
                <div className="opacity-75">
                   <h3 className="font-bold text-gray-800 dark:text-white">Estado de Pedidos</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Emails sobre cambios de estado en tus compras (Obligatorio).</p>
                </div>
                {/* Deshabilitado a propósito */}
                <div className="relative w-12 h-6 rounded-full bg-primary/50 cursor-not-allowed">
                  <span className="absolute top-1 left-1 bg-white/80 w-4 h-4 rounded-full translate-x-6 shadow" />
                </div>
             </div>

          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
             Los cambios se guardan automáticamente en tu navegador.
          </p>
        </section>

      </main>
    </div>
  );
}