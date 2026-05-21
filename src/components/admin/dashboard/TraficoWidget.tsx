"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users, TrendingUp, Globe } from "lucide-react";

interface TraficoData {
  visitantesOnline: number;
  visitasHoy: number;
  visitasAyer: number;
  porcentajeCambio: number;
  grafica24h: Array<{ hora: string; visitas: number }>;
  topPaginas: Array<{ url: string; visitas: number }>;
  fuentes: Array<{ fuente: string; cantidad: number }>;
  dispositivos: Array<{ dispositivo: string; cantidad: number }>;
}

interface TraficoWidgetProps {
  token: string;
}

const fuenteColors: { [key: string]: string } = {
  directo: "#3b82f6",
  buscador: "#f59e0b",
  social: "#ec4899",
  referral: "#8b5cf6",
};

export default function TraficoWidget({ token }: TraficoWidgetProps) {
  const [data, setData] = useState<TraficoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrafico = async () => {
      try {
        const response = await fetch("/api/admin/trafico", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const traficoData = await response.json();
          setData(traficoData);
        }
      } catch (error) {
        console.error("Error al cargar tráfico:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrafico();
    const interval = setInterval(fetchTrafico, 60000); // Actualizar cada 60s
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <p className="text-gray-500">Error al cargar estadísticas de tráfico</p>
      </div>
    );
  }

  const visitasTotales = data.fuentes.reduce((sum, f) => sum + f.cantidad, 0);

  return (
    <div className="space-y-6">
      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Visitantes en línea */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              En línea ahora
            </span>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {data.visitantesOnline}
          </p>
        </div>

        {/* Visitas hoy */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">
            Visitas hoy
          </p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {data.visitasHoy}
          </p>
        </div>

        {/* Visitas ayer */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
            Visitas ayer
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {data.visitasAyer}
          </p>
        </div>

        {/* Cambio porcentual */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800">
          <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-2">
            Cambio
          </p>
          <p
            className={`text-3xl font-bold ${
              data.porcentajeCambio >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {data.porcentajeCambio >= 0 ? "+" : ""}
            {data.porcentajeCambio}%
          </p>
        </div>
      </div>

      {/* Gráfica y fuentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfica 24h */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Visitas - Últimas 24 horas
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.grafica24h}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hora" stroke="#9ca3af" style={{ fontSize: "12px" }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="visitas" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fuentes */}
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Fuentes de tráfico
          </h3>
          <div className="space-y-4">
            {data.fuentes.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos</p>
            ) : (
              data.fuentes.map((f) => {
                const porcentaje = visitasTotales > 0 ? (f.cantidad / visitasTotales) * 100 : 0;
                return (
                  <div key={f.fuente}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {f.fuente === "directo" && "Directo"}
                        {f.fuente === "buscador" && "Buscador"}
                        {f.fuente === "social" && "Redes"}
                        {f.fuente === "referral" && "Referral"}
                        {f.fuente === "email" && "Email"}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {f.cantidad} ({Math.round(porcentaje)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${porcentaje}%`,
                          backgroundColor: fuenteColors[f.fuente] || "#6b7280",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Top páginas */}
      <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Páginas más visitadas
        </h3>
        <div className="space-y-2">
          {data.topPaginas.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin datos</p>
          ) : (
            data.topPaginas.map((pagina, i) => (
              <div key={pagina.url} className="flex items-center justify-between py-2 px-3 rounded bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {pagina.url.substring(0, 40)}
                    {pagina.url.length > 40 ? "..." : ""}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">
                  {pagina.visitas}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
