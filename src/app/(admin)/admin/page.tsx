"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";

// 1. Añadimos 'cupones' al tipo de estadísticas
type Stats = {
  productos?: number;
  categorias?: number;
  marcas?: number;
  pedidos?: number;
  clientes?: number;
  cupones?: number; // <--- NUEVO
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) return;
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Error al cargar estadísticas:", err);
      }
    }

    fetchStats();
  }, []);

  // 2. Añadimos la sección de Cupones al array
  const sections = [
    {
      title: "Productos",
      href: "/admin/productos",
      count: stats.productos,
      color: "bg-primary hover:bg-hover",
    },
    {
      title: "Categorías",
      href: "/admin/categorias",
      count: stats.categorias,
      color: "bg-primaryHover hover:bg-hover",
    },
    {
      title: "Marcas",
      href: "/admin/marcas",
      count: stats.marcas,
      color: "bg-accent hover:bg-hover",
    },
    {
      title: "Pedidos",
      href: "/admin/pedidos",
      count: stats.pedidos,
      color: "bg-[#91B390] hover:bg-hover",
    },
    {
      title: "Clientes",
      href: "/admin/clientes",
      count: stats.clientes,
      color: "bg-secondary hover:bg-hover",
    },
    // --- NUEVA SECCIÓN ---
    {
      title: "Cupones",
      href: "/admin/cupones",
      count: stats.cupones,
      color: "bg-purple-400 hover:bg-purple-700", // Color morado para diferenciar
    },
  ];

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-secondary mb-2">
            Panel de Administración
          </h1>
          <p className="text-gray-600">
            Gestiona todas las secciones de tu tienda online
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Link
              key={section.title}
              href={section.href}
              className={`rounded-xl shadow-md p-6 text-white transition-transform transform hover:scale-105 ${section.color}`}
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">
                    {section.title}
                  </h2>
                  <p className="text-sm opacity-90">
                    Administrar {section.title.toLowerCase()}
                  </p>
                </div>
                {typeof section.count === "number" && (
                  <div className="mt-6 text-right">
                    <span className="text-4xl font-bold">{section.count}</span>
                    <span className="block text-sm opacity-90">
                      {section.title.toLowerCase()}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
