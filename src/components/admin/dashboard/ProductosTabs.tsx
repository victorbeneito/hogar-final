"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Eye, Search } from "lucide-react";

interface ProductosStatsData {
  masVendidos: Array<{
    id: number;
    nombre: string;
    cantidad: number;
    total: number;
  }>;
  masVistos: Array<{
    id?: number;
    slug?: string;
    nombre: string;
    visitas: number;
  }>;
  masBuscados: Array<{
    termino: string;
    cantidad: number;
  }>;
}

interface ProductosTabsProps {
  token: string;
  desde?: string;
  hasta?: string;
}

export default function ProductosTabs({ token, desde, hasta }: ProductosTabsProps) {
  const [data, setData] = useState<ProductosStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"vendidos" | "vistos" | "buscados">("vendidos");

  useEffect(() => {
    const fetchProductosStats = async () => {
      try {
        const url = new URL("/api/admin/productos-stats", window.location.origin);
        if (desde && hasta) {
          url.searchParams.append("desde", desde);
          url.searchParams.append("hasta", hasta);
        }

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const statsData = await response.json();
          setData(statsData);
        }
      } catch (error) {
        console.error("Error al cargar estadísticas de productos:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProductosStats();
    }
  }, [token, desde, hasta]);

  if (loading) {
    return (
      <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const tabs = [
    { id: "vendidos" as const, label: "Más Vendidos", icon: ShoppingBag },
    { id: "vistos" as const, label: "Más Vistos", icon: Eye },
    { id: "buscados" as const, label: "Más Buscados", icon: Search },
  ];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "vendidos" && (
          <div className="space-y-3">
            {data.masVendidos.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Sin datos de productos vendidos
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">
                        Producto
                      </th>
                      <th className="text-center py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">
                        Cantidad
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.masVendidos.map((producto, i) => (
                      <tr
                        key={`${producto.id}-${i}`}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                          {producto.nombre}
                        </td>
                        <td className="py-3 px-2 text-center text-gray-700 dark:text-gray-300">
                          {producto.cantidad}
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-green-600 dark:text-green-400">
                          €{producto.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "vistos" && (
          <div className="space-y-2">
            {data.masVistos.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Sin datos de productos vistos
              </p>
            ) : (
              data.masVistos.map((producto, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {producto.nombre}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold">
                      {producto.visitas} visitas
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "buscados" && (
          <div className="space-y-2">
            {data.masBuscados.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Sin datos de búsquedas
              </p>
            ) : (
              data.masBuscados.map((busqueda, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {busqueda.termino}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-semibold">
                      {busqueda.cantidad} búsquedas
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
