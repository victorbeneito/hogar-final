"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";


interface Pedido {
  id: number;
  referencia?: string;
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
  estadoPago?: string;
  transportistaNombre?: string;
  numeroSeguimiento?: string;

  estado: string;
  fecha?: string;
  fechaPedido?: string;
  createdAt?: string;
}

type SourceFilter = "actuales" | "prestashop" | "todos";

function normalizeSourceFilter(value: string | null): SourceFilter {
  return value === "prestashop" || value === "todos" ? value : "actuales";
}


export default function AdminPedidos() {
  const searchParams = useSearchParams();
  const origenInicial = normalizeSourceFilter(searchParams.get("origen"));
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const [filters, setFilters] = useState({
    origen: origenInicial,
    id: "",
    referencia: "",
    cliente: "",
    estado: "",
    estadoPago: "",
    fechaDesde: "",
    fechaHasta: "",
    sortBy: "fechaPedido",
    sortDir: "desc",
  });
  const normalize = (value?: string) => String(value || "").toLowerCase();

  useEffect(() => {
    setFilters((prev) => (prev.origen === origenInicial ? prev : { ...prev, origen: origenInicial }));
  }, [origenInicial]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    fetchPedidos();
  }, [queryString]);

  const fetchPedidos = async (query = queryString) => {
    try {
      const res = await fetch(`/api/pedidos${query ? `?${query}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      setPedidos(data.pedidos || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchPedidos();
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    const res = await fetch(`/api/pedidos${queryString ? `?${queryString}` : ""}`, { cache: "no-store" });
    const data = await res.json();
    const rows = (data.pedidos || []).map((pedido: Pedido) => [
      pedido.id,
      pedido.referencia || pedido.numeroPedido || "",
      pedido.nombre || pedido.cliente?.nombre || "",
      pedido.estado || "",
      pedido.estadoPago || "",
      pedido.totalFinal ?? "",
      pedido.fecha || pedido.fechaPedido || pedido.createdAt || "",
    ]);

    const csv = [
      ["ID", "Referencia", "Cliente", "Estado", "Estado pago", "Total", "Fecha"].join(";"),
      ...rows.map((row: string[]) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    <div className="min-h-screen bg-[#F8F8F5] py-6 md:py-8 px-3 sm:px-4 md:px-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="mb-6 flex flex-col gap-3">
          <div>
            <p className="text-sm text-gray-500">Pedidos</p>
            <h1 className="text-3xl md:text-4xl font-bold text-[#4A4A4A]">📋 Gestión de pedidos nuevos</h1>
            <p className="mt-2 text-sm text-gray-500 max-w-2xl">
              Los pedidos importados de Prestashop se consultan en el archivo histórico; aquí se prioriza la gestión diaria.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/admin/pedidos/nuevo")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6BAEC9] px-4 py-3 text-sm font-semibold text-white hover:bg-[#5FA0B3] shadow-md"
            >
              + Nuevo pedido
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Exportar
            </button>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
            <button
              onClick={() => router.push("/admin/prestashop")}
              className="inline-flex items-center gap-2 rounded-xl border border-[#6BAEC9]/30 bg-[#6BAEC9]/5 px-4 py-3 text-sm font-semibold text-[#5FA0B3] hover:bg-[#6BAEC9]/10"
            >
              Archivo Prestashop
            </button>
            <button
              onClick={() => router.push("/admin")}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Volver
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-[#6BAEC9]/10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            <input
              value={filters.id}
              onChange={(e) => setFilters((prev) => ({ ...prev, id: e.target.value }))}
              placeholder="Buscar por ID"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={filters.referencia}
              onChange={(e) => setFilters((prev) => ({ ...prev, referencia: e.target.value }))}
              placeholder="Referencia / Nº pedido"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={filters.cliente}
              onChange={(e) => setFilters((prev) => ({ ...prev, cliente: e.target.value }))}
              placeholder="Buscar por cliente"
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
            <select
              value={filters.origen}
              onChange={(e) => setFilters((prev) => ({ ...prev, origen: e.target.value as SourceFilter }))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
            >
              <option value="actuales">Fuente: nuevos</option>
              <option value="prestashop">Fuente: Prestashop</option>
              <option value="todos">Fuente: todos</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.estado}
                onChange={(e) => setFilters((prev) => ({ ...prev, estado: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
              >
                <option value="">Estado</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="PROCESANDO">PROCESANDO</option>
                <option value="ENVIADO">ENVIADO</option>
                <option value="ENTREGADO">ENTREGADO</option>
                <option value="CANCELADO">CANCELADO</option>
                <option value="DEVUELTO">DEVUELTO</option>
              </select>
              <select
                value={filters.estadoPago}
                onChange={(e) => setFilters((prev) => ({ ...prev, estadoPago: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
              >
                <option value="">Pago</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="PAGADO">PAGADO</option>
                <option value="FALLIDO">FALLIDO</option>
                <option value="REEMBOLSADO">REEMBOLSADO</option>
              </select>
            </div>
            <input
              type="date"
              value={filters.fechaDesde}
              onChange={(e) => setFilters((prev) => ({ ...prev, fechaDesde: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              type="date"
              value={filters.fechaHasta}
              onChange={(e) => setFilters((prev) => ({ ...prev, fechaHasta: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
            >
              <option value="fechaPedido">Ordenar por fecha</option>
              <option value="id">Ordenar por ID</option>
              <option value="numeroPedido">Ordenar por número</option>
              <option value="totalFinal">Ordenar por total</option>
              <option value="estado">Ordenar por estado</option>
              <option value="estadoPago">Ordenar por pago</option>
            </select>
            <select
              value={filters.sortDir}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortDir: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </div>

          <div className="mb-4 flex justify-end">
            <button
              onClick={() => fetchPedidos()}
              className="rounded-xl bg-[#6BAEC9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5FA0B3]"
            >
              Buscar
            </button>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1280px]">
              <thead>
                <tr className="bg-[#F8F8F5]">
                  <th className="px-8 py-4 text-left text-lg font-bold text-[#4A4A4A]">
                    ID Pedido
                  </th>
                  <th className="px-8 py-4 text-left text-lg font-bold text-[#4A4A4A]">
                    Referencia
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
                    Pago
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
                      colSpan={8}
                      className="px-8 py-12 text-center text-gray-500"
                    >
                      Cargando pedidos...
                    </td>
                  </tr>
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
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
                      <td className="px-8 py-6 font-mono text-sm text-gray-500">
                        {pedido.referencia || pedido.numeroPedido || "—"}
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
                            normalize(pedido.estado) === "entregado"
                              ? "bg-green-100 text-green-700"
                              : normalize(pedido.estado) === "pendiente"
                              ? "bg-yellow-100 text-yellow-700"
                              : normalize(pedido.estado) === "procesando"
                              ? "bg-blue-100 text-blue-700"
                              : normalize(pedido.estado) === "enviado"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {pedido.estado}
                        </span>
                      </td>

                      <td className="px-8 py-6">
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-semibold ${
                            normalize(pedido.estadoPago) === "pagado"
                              ? "bg-green-100 text-green-700"
                              : normalize(pedido.estadoPago) === "fallido"
                              ? "bg-red-100 text-red-700"
                              : normalize(pedido.estadoPago) === "reembolsado"
                              ? "bg-gray-200 text-gray-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {pedido.estadoPago || "PENDIENTE"}
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

          <div className="md:hidden space-y-4">
            {loading ? (
              <div className="py-10 text-center text-gray-500">Cargando pedidos...</div>
            ) : pedidos.length === 0 ? (
              <div className="py-10 text-center text-gray-500">No hay pedidos aún</div>
            ) : (
              pedidos.map((pedido) => (
                <div key={pedido.id} className="rounded-2xl border border-gray-200 bg-[#F8F8F5] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Pedido</p>
                      <p className="font-mono text-sm text-[#6BAEC9]">{pedido.referencia || pedido.numeroPedido || `#${pedido.id}`}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      normalize(pedido.estado) === "entregado"
                        ? "bg-green-100 text-green-700"
                        : normalize(pedido.estado) === "pendiente"
                        ? "bg-yellow-100 text-yellow-700"
                        : normalize(pedido.estado) === "procesando"
                        ? "bg-blue-100 text-blue-700"
                        : normalize(pedido.estado) === "enviado"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {pedido.estado}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Cliente</p>
                      <p className="font-semibold text-gray-800">{pedido.nombre || pedido.cliente?.nombre || "Sin nombre"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Total</p>
                      <p className="font-semibold text-[#6BAEC9]">{pedido.totalFinal ? pedido.totalFinal.toFixed(2) : "0.00"} €</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Pago</p>
                      <p className="font-semibold text-gray-700">{pedido.estadoPago || "PENDIENTE"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Fecha</p>
                      <p className="font-semibold text-gray-700">
                        {pedido.fecha
                          ? new Date(pedido.fecha).toLocaleDateString("es-ES")
                          : pedido.fechaPedido
                          ? new Date(pedido.fechaPedido).toLocaleDateString("es-ES")
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => router.push(`/admin/pedidos/${pedido.id}`)}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-200"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleDelete(pedido.id)}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#F7A38B] border border-gray-200"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
