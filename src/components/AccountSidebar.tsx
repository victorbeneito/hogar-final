"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/account/info", label: "Información" },
  { href: "/account/orders", label: "Historial de pedidos" },
  { href: "/account/coupons", label: "Vales" },
  { href: "/account/alerts", label: "Mis alertas" },
  { href: "/account/cookies", label: "Configuración de cookies" },
];

export default function AccountSidebar() {
  const pathname = usePathname();

  return (
    // 👇 FIX: Fondo oscuro y texto claro en modo oscuro
    <aside className="w-64 bg-white dark:bg-darkNavBg shadow-md p-6 rounded-lg h-fit transition-colors duration-300">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Mi cuenta</h2>
      <nav className="flex flex-col space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`p-2 rounded-md transition-colors duration-200 
              ${pathname === link.href 
                ? "bg-gray-100 dark:bg-gray-700 font-medium text-primary dark:text-primaryHover" 
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}