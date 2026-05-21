"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface EstadoData {
  estado: string;
  _count: { id: number };
}

interface PedidosEstadoProps {
  data: EstadoData[];
}

const estadoColors: { [key: string]: string } = {
  PENDIENTE: "#6b7280",
  PROCESANDO: "#3b82f6",
  ENVIADO: "#f59e0b",
  ENTREGADO: "#22c55e",
  CANCELADO: "#ef4444",
};

export default function PedidosEstado({ data }: PedidosEstadoProps) {
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
          <Bar
            dataKey="cantidad"
            radius={[8, 8, 0, 0]}
            fill="#3b82f6"
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-6 grid grid-cols-2 gap-2">
        {chartData.map((item) => (
          <div key={item.estado} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: estadoColors[item.estado] || "#6b7280",
              }}
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
