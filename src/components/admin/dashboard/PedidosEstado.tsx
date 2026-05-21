"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface EstadoData {
  estado: string;
  _count: { id: number };
}

interface PedidosEstadoProps {
  data: EstadoData[];
}

const FALLBACK_COLORS: Record<string, string> = {
  PENDIENTE:  "#f59e0b",
  PROCESANDO: "#3b82f6",
  ENVIADO:    "#8b5cf6",
  ENTREGADO:  "#10b981",
  CANCELADO:  "#ef4444",
  DEVUELTO:   "#6366f1",
};

export default function PedidosEstado({ data }: PedidosEstadoProps) {
  const [colores, setColores] = useState<Record<string, string>>(FALLBACK_COLORS);

  useEffect(() => {
    fetch("/api/admin/pedidos/estados")
      .then((r) => r.json())
      .then(({ estados }) => {
        if (!Array.isArray(estados)) return;
        const mapa: Record<string, string> = { ...FALLBACK_COLORS };
        estados.forEach((e: { clave: string; color: string }) => {
          if (e.clave && e.color) mapa[e.clave] = e.color;
        });
        setColores(mapa);
      })
      .catch(() => {});
  }, []);

  const chartData = data.map((item) => ({
    estado: item.estado,
    cantidad: item._count.id,
  }));

  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Pedidos por Estado
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            className="dark:stroke-gray-700"
          />
          <XAxis
            dataKey="estado"
            stroke="#9ca3af"
            style={{ fontSize: "12px" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#fff",
            }}
            formatter={(value) => [`${value} pedidos`, "Cantidad"]}
          />
          <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.estado}
                fill={colores[entry.estado] ?? "#6b7280"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-6 grid grid-cols-2 gap-2">
        {chartData.map((item) => (
          <div key={item.estado} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colores[item.estado] ?? "#6b7280" }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {item.estado}: {item.cantidad}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
