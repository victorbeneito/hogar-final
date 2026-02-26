"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useClienteAuth } from "@/context/ClienteAuthContext";

export default function AccountPage() {
  const { cliente, loading, logout } = useClienteAuth();
  const router = useRouter();

  // Protección de ruta
  useEffect(() => {
    if (!loading && !cliente) {
      router.push("/auth");
    }
  }, [cliente, loading, router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (loading || !cliente) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Enlaces del Dashboard
  const menuItems = [
    {
      title: "Mis Pedidos",
      desc: "Historial de compras y estado de envíos.",
      href: "/account/orders",
      icon: "📦",
      color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    },
    {
      title: "Mis Direcciones",
      desc: "Gestiona tus direcciones de envío.",
      href: "/direcciones",
      icon: "📍",
      color: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    },
    {
      title: "Datos Personales",
      desc: "Edita tu perfil y cambia la contraseña.",
      href: "/account/info",
      icon: "👤",
      color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    },
    {
      title: "Mis Cupones",
      desc: "Descuentos disponibles para ti.",
      href: "/account/coupons",
      icon: "🎟️",
      color: "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400",
    },
    {
      title: "Alertas",
      desc: "Avisos de stock y newsletter.",
      href: "/account/alerts",
      icon: "🔔",
      color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
    },
    {
      title: "Ayuda y Cookies",
      desc: "Políticas legales y soporte.",
      href: "/account/cookies",
      icon: "🍪",
      color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Cabecera del Dashboard */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-white dark:bg-darkNavBg p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          {/* Avatar con Inicial */}
          <div className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-lg shadow-yellow-500/20 flex-shrink-0">
              {cliente.nombre.charAt(0).toUpperCase()}
          </div>

          <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                  Hola, {cliente.nombre} 👋
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Bienvenido a tu área personal. Desde aquí puedes gestionar toda tu actividad.
              </p>
          </div>
      </div>

      {/* Grid de Accesos Directos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, idx) => (
              <Link 
                  key={idx} 
                  href={item.href}
                  className="group bg-white dark:bg-darkNavBg p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 h-full"
              >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                      {item.icon}
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors">
                          {item.title}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                          {item.desc}
                      </p>
                  </div>
              </Link>
          ))}
      </div>

      {/* Botón Cerrar Sesión (Visible también aquí para facilidad) */}
      <div className="flex justify-center pt-6">
          <button 
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 font-bold text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 px-6 py-3 rounded-xl transition-all"
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              Cerrar Sesión
          </button>
      </div>

    </div>
  );
}