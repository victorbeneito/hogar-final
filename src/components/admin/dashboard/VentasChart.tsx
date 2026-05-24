"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface VentasChartProps {
  data: Array<{ fecha: string; total: number }>;
  desde?: string;
  hasta?: string;
}

function formatarEtiqueta(fecha: string): string {
  // Clave horaria: "2026-05-21T08" (13 chars con T)
  if (fecha.length === 13 && fecha.includes("T")) {
    return fecha.slice(11, 13) + ":00";
  }
  // Clave diaria o semanal: "2026-05-21"
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

export default function VentasChart({ data, desde, hasta }: VentasChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    fecha: formatarEtiqueta(item.fecha),
  }));

  const titulo = desde && hasta
    ? `Ventas - ${desde} → ${hasta}`
    : "Ventas - Últimos 30 días";

  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        {titulo}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            className="dark:stroke-gray-700"
          />
          <XAxis
            dataKey="fecha"
            stroke="#9ca3af"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: "12px" }}
            label={{ value: "€", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#fff",
            }}
            formatter={(value) => `€${Number(value).toFixed(2)}`}
            labelFormatter={(label) => `${label}`}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorTotal)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
