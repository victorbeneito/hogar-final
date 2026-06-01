// components/admin/AdminSidebar.tsx
// VERSIÓN CON LUCIDE-REACT (ya instalado en tu package.json)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import {
  ShoppingCart,
  FileText,
  Archive,
  Tag,
  Palette,
  Store,
  Ticket,
  Truck,
  Users,
  CreditCard,
  Settings,
  ClipboardList,
  Box,
  UserCheck,
  Info,
  Zap,
  Wrench,
  Database,
  Upload,
  ChevronDown,
  ChevronRight,
  Home,
  Menu,
  X,
  UsersRound,
  Star,
  BookOpen,
} from "lucide-react";

const navigation = [
  {
    label: "INICIO",
    items: [
      { name: "Dashboard", href: "/admin", icon: Home },
    ],
  },
  {
    label: "PEDIDOS",
    items: [
      { name: "Pedidos",   href: "/admin/pedidos",  icon: ShoppingCart },
      { name: "Facturas",  href: "/admin/facturas", icon: FileText },
      { name: "Carritos",  href: "/admin/carritos", icon: Archive },
    ],
  },
  {
    label: "PRESTASHOP",
    items: [
      { name: "Archivo", href: "/admin/prestashop", icon: Archive },
    ],
  },
  {
    label: "CATÁLOGO",
    items: [
      { name: "Productos",   href: "/admin/productos",   icon: Box },
      { name: "Categorías",  href: "/admin/categorias",  icon: Tag },
      { name: "Atributos",   href: "/admin/atributos",   icon: Palette },
      { name: "Marcas",      href: "/admin/marcas",      icon: Store },
      { name: "Proveedores", href: "/admin/proveedores", icon: Store },
      { name: "Descuentos",  href: "/admin/cupones",     icon: Ticket },
      { name: "Transportes", href: "/admin/transportes", icon: Truck },
    ],
  },
  {
    label: "CLIENTES",
    items: [
      { name: "Clientes",    href: "/admin/clientes",    icon: Users },
    ],
  },
  {
    label: "PERSONALIZAR",
    items: [
      { name: "Formas de pago", href: "/admin/personalizar/formas-pago", icon: CreditCard },
      { name: "Módulos", href: "/admin/personalizar/modulos", icon: Settings },
      { name: "Configuración de Correos", href: "/admin/personalizar/correos", icon: FileText },
        { name: "Páginas CMS", href: "/admin/cms", icon: FileText },
      { name: "Blog Tienda", href: "/admin/blog", icon: BookOpen },
    ],
  },
  {
    label: "PARÁMETROS TIENDA",
    items: [
      { name: "Configuración",     href: "/admin/configuracion",           icon: Settings },
      { name: "Config. Pedidos",   href: "/admin/configuracion/pedidos",   icon: ClipboardList },
      { name: "Config. Productos", href: "/admin/configuracion/productos", icon: Box },
      { name: "Ajustes Clientes",  href: "/admin/configuracion/clientes",  icon: UserCheck },
    ],
  },
  {
    label: "PARÁMETROS AVANZADOS",
    items: [
      { name: "Importar CSV",   href: "/admin/importar",      icon: Upload },
      { name: "Información",    href: "/admin/sistema/info",           icon: Info },
      { name: "Rendimiento",    href: "/admin/sistema/rendimiento",    icon: Zap },
      { name: "Administración", href: "/admin/sistema/administracion", icon: Wrench },
      { name: "Equipo",         href: "/admin/sistema/equipo",         icon: UsersRound },
      { name: "Base de Datos",  href: "/admin/sistema/base-datos",     icon: Database },
    ],
  },
];

interface TokenPayload {
  rol?: string;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(navigation.map((g) => [g.label, true]))
  );

  useEffect(() => {
    try {
      const token = localStorage.getItem("adminToken");
      if (token) {
        const decoded = jwtDecode<TokenPayload>(token);
        setRole(decoded.rol?.toLowerCase() ?? null);
      }
    } catch {
      setRole(null);
    }
  }, []);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className={`
        relative flex flex-col bg-[#2c3e50] text-white
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-16" : "w-64"}
        h-screen flex-shrink-0 overflow-hidden
      `}
    >
      {/* Logo / toggle */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold tracking-wide text-white truncate">
              🏠 Hogar Admin
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">
              v{process.env.NEXT_PUBLIC_APP_VERSION ?? "—"}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors ml-auto"
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? (
            <Menu className="w-5 h-5 text-white" />
          ) : (
            <X className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navigation.map((group) => {
          // Auditors no ven "PERSONALIZAR" ni "PARÁMETROS AVANZADOS"
          if (role === "auditor" && ["PERSONALIZAR", "PARÁMETROS AVANZADOS"].includes(group.label)) {
            return null;
          }
          return (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
              >
                <span>{group.label}</span>
                {openGroups[group.label] ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}

            {(collapsed || openGroups[group.label]) && (
              <ul>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.name : undefined}
                        className={`
                          flex items-center gap-3 py-2 text-sm transition-colors
                          ${collapsed ? "justify-center px-2" : "px-4"}
                          ${active
                            ? "bg-[#3498db] text-white font-semibold border-l-4 border-[#2980b9]"
                            : "text-gray-300 hover:bg-white/10 hover:text-white border-l-4 border-transparent"
                          }
                        `}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/10 text-xs text-gray-500">
          Hogar Admin v{process.env.NEXT_PUBLIC_APP_VERSION ?? "—"}
        </div>
      )}
    </aside>
  );
}
