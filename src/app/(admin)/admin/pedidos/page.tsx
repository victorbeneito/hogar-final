"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";


interface Pedido {
  id: number;
  numeroPedido?: string;

  nombre: string;

  cliente: {
    nombre: string;
    email: string;
  };

  pago?: {
    metodo?: string;
    totalFinal?: number;
  };

  // 👇 Añadir este campo
  totalFinal?: number;

  estado: string;
  fecha?: string;
  fechaPedido?: string;
  createdAt?: string;
}


export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    try {
      const res = await fetch("/api/pedidos");
      const data = await res.json();
      setPedidos(data.pedidos || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este pedido?")) return;
    try {
      await fetch(`/api/pedidos/${id}`, { method: "DELETE" });
      setPedidos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error al eliminar pedido:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-[#4A4A4A] mb-12">
          📋 Gestión de Pedidos
        </h1>

        {/* Botón volver al panel de administración */}
        <div className="mb-12">
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] hover:from-[#5FA0B3] hover:to-[#91C8D9] shadow-md transition-all duration-300"
          >
            ← Volver al Panel de Administración
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#6BAEC9]/10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8F8F5]">
                  <th className="px-8 py-4 text-left text-lg font-bold text-[#4A4A4A]">
                    ID Pedido
                  </th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-[#4A4A4A]">
                    Cliente
                  </th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-[#4A4A4A]">
                    Total
                  </th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-[#4A4A4A]">
                    Estado
                  </th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-[#4A4A4A]">
                    Fecha
                  </th>
                  <th className="px-8 py-4 text-right text-lg font-bold text-[#4A4A4A]">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-8 py-12 text-center text-gray-500"
                    >
                      Cargando pedidos...
                    </td>
                  </tr>
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-8 py-12 text-center text-gray-500"
                    >
                      No hay pedidos aún
                    </td>
                  </tr>
                ) : (
                  pedidos.map((pedido) => (
                    <tr key={pedido.id} className="border-t hover:bg-[#F8F8F5]">
                      <td className="px-8 py-6 font-mono text-sm text-[#6BAEC9]">
                        {pedido.id}
                      </td>

                      <td className="px-8 py-6 font-semibold text-[#4A4A4A]">
   {pedido.nombre && pedido.nombre !== "Cliente Importado" 
      ? pedido.nombre 
      : (pedido.cliente?.nombre || "Sin nombre")}
</td>

                      <td className="px-8 py-6">
                       <p className="text-sm font-semibold text-[#6BAEC9]">
  €
  {pedido.pago?.totalFinal
    ? pedido.pago.totalFinal.toFixed(2)
    : pedido.totalFinal
    ? pedido.totalFinal.toFixed(2)
    : "0.00"}
</p>
                      </td>

                      <td className="px-8 py-6">
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-semibold ${
                            pedido.estado === "entregado"
                              ? "bg-green-100 text-green-700"
                              : pedido.estado === "pendiente"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {pedido.estado}
                        </span>
                      </td>

                      <td className="px-8 py-6 text-sm text-[#6BAEC9]">
                        {pedido.fecha
    ? new Date(pedido.fecha).toLocaleDateString("es-ES")
    : pedido.fechaPedido
    ? new Date(pedido.fechaPedido).toLocaleDateString("es-ES")
    : pedido.createdAt
    ? new Date(pedido.createdAt).toLocaleDateString("es-ES")
    : "Fecha no disponible"}
                      </td>

                      <td className="px-8 py-6 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() =>
                              router.push(`/admin/pedidos/${pedido.id}`)
                            }
                            className="p-2 hover:bg-[#6BAEC9]/10 rounded-xl transition-colors"
                            title="Ver / Editar pedido"
                          >
                            <svg
                              className="w-5 h-5 text-[#6BAEC9]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>

                          <button
                            onClick={() => handleDelete(pedido.id)}
                            className="p-2 hover:bg-[#F7A38B]/10 rounded-xl transition-colors"
                            title="Eliminar pedido"
                          >
                            <svg
                              className="w-5 h-5 text-[#F7A38B]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
