"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Search,
  UserCircle,
  Sun,
  Moon,
  LogOut,
  Settings,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";

const mockNotifications = [
  { id: 1, tipo: "pedido",   texto: "Nuevo pedido #1042",                  tiempo: "hace 5 min", leida: false },
  { id: 2, tipo: "stock",    texto: "'Edredón Nórdico' sin stock",       tiempo: "hace 1h",    leida: false },
  { id: 3, tipo: "cliente",  texto: "Nuevo cliente registrado",            tiempo: "hace 2h",    leida: true  },
];

export function AdminHeader() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser]   = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);

  const unreadCount = mockNotifications.filter((n) => !n.leida).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    router.push("/admin-login");
  };

  const btn = "p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative";

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-6 gap-4 flex-shrink-0 shadow-sm z-30">

      {/* Búsqueda */}
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar pedidos, productos, clientes…"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-400"
        />
      </div>

      <div className="flex items-center gap-1 ml-auto">

        {/* Dark mode */}
        <button onClick={toggleDark} className={btn} title="Cambiar tema">
          {darkMode
            ? <Sun  className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            : <Moon className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
        </button>

        {/* Notificaciones */}
        <div ref={notifRef} className="relative">
          <button onClick={() => setShowNotif(!showNotif)} className={btn} title="Notificaciones">
            <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-800 dark:text-white">Notificaciones</span>
                <span className="text-xs text-blue-500 cursor-pointer hover:underline">Marcar todas leídas</span>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
                {mockNotifications.map((n) => (
                  <li key={n.id} className={`px-4 py-3 flex gap-3 items-start hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!n.leida ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                    <div className="mt-0.5 flex-shrink-0">
                      {n.tipo === "pedido"  && <ShoppingCart   className="w-4 h-4 text-blue-500" />}
                      {n.tipo === "stock"   && <AlertTriangle  className="w-4 h-4 text-orange-500" />}
                      {n.tipo === "cliente" && <UserCircle     className="w-4 h-4 text-green-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{n.texto}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.tiempo}</p>
                    </div>
                    {!n.leida && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
                <Link href="/admin/notificaciones" className="text-xs text-blue-500 hover:underline">
                  Ver todas →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Usuario */}
        <div ref={userRef} className="relative">
          <button onClick={() => setShowUser(!showUser)} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#3498db] flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden md:block">Admin</span>
          </button>

          {showUser && (
            <div className="absolute right-0 top-12 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Administrador</p>
                <p className="text-xs text-gray-400 truncate">admin@hogar.com</p>
              </div>
              <Link
                href="/admin/perfil"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setShowUser(false)}
              >
                <Settings className="w-4 h-4" />
                Mi perfil
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}