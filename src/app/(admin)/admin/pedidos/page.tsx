"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";


interface Pedido {
  id: number;
  referencia?: string;
  numeroPedido?: string;
  nombre: string;
  cliente: { nombre: string; email: string; };
  pago?: { metodo?: string; totalFinal?: number; };
  totalFinal?: number;
  pagoMetodo?: string;
  transportistaNombre?: string;
  numeroSeguimiento?: string;
  estado: string;
  fecha?: string;
  fechaPedido?: string;
  createdAt?: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  redsys:          "Redsys",
  tarjeta:         "Redsys",
  paypal:          "PayPal",
  bizum:           "Bizum",
  transferencia:   "Transferencia bancaria",
  contrareembolso: "Contra reembolso",
  reembolso:       "Reembolso",
};

function paymentLabel(method?: string): string {
  if (!method) return "—";
  return PAYMENT_LABELS[method.toLowerCase()] ?? method;
}

type SourceFilter = "actuales" | "prestashop" | "todos";

function normalizeSourceFilter(value: string | null): SourceFilter {
  return value === "prestashop" || value === "todos" ? value : "actuales";
}

type EstadoPedido = { clave: string; nombre: string; color: string };

// Modal para cambiar estado masivo — carga estados desde la BD
function BulkStateModal({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: (estado: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState("");
  const [estados, setEstados] = useState<EstadoPedido[]>([]);
  const [loadingEstados, setLoadingEstados] = useState(true);

  useEffect(() => {
    fetch("/api/admin/pedidos/estados")
      .then((r) => r.json())
      .then((data) => setEstados(data.estados || []))
      .catch(() => setEstados([]))
      .finally(() => setLoadingEstados(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold text-[#4A4A4A] mb-1">Cambiar estado</h2>
        <p className="text-sm text-gray-500 mb-4">
          Se actualizará el estado de <strong>{count}</strong> pedido{count !== 1 ? "s" : ""}.
        </p>
        {loadingEstados ? (
          <div className="text-sm text-gray-400 py-2 mb-4">Cargando estados...</div>
        ) : (
          <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto pr-1">
            {estados.map((e) => (
              <button
                key={e.clave}
                onClick={() => setSelected(e.clave)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${
                  selected === e.clave
                    ? "border-[#6BAEC9] bg-[#6BAEC9]/10 font-semibold"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: e.color }}
                />
                <span className="text-gray-700">{e.nombre}</span>
                <span className="ml-auto text-xs text-gray-400 font-mono">{e.clave}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            disabled={!selected || loadingEstados}
            onClick={() => selected && onConfirm(selected)}
            className="rounded-xl bg-[#6BAEC9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5FA0B3] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de confirmación de borrado (doble confirmación)
function BulkDeleteModal({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        {step === 1 ? (
          <>
            <h2 className="text-lg font-bold text-red-600 mb-1">Eliminar pedidos</h2>
            <p className="text-sm text-gray-600 mb-4">
              Vas a eliminar <strong>{count}</strong> pedido{count !== 1 ? "s" : ""}. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={onCancel} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => setStep(2)} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-red-600 mb-1">¿Seguro? Confirmación final</h2>
            <p className="text-sm text-gray-600 mb-4">
              Se eliminarán permanentemente <strong>{count}</strong> pedido{count !== 1 ? "s" : ""} y todos sus datos asociados.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={onCancel} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={onConfirm} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Eliminar definitivamente
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
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
    fechaDesde: "",
    fechaHasta: "",
    sortBy: "fechaPedido",
    sortDir: "desc",
  });

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);
  const [total, setTotal] = useState(0);
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  // Colores de estados desde la BD
  const [estadoColors, setEstadoColors] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch("/api/admin/pedidos/estados")
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {};
        for (const e of d.estados ?? []) map[e.clave] = e.color;
        setEstadoColors(map);
      })
      .catch(() => {});
  }, []);

  // Selección masiva
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkModal, setBulkModal] = useState<"estado" | "delete" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const allChecked = pedidos.length > 0 && selectedIds.size === pedidos.length;
  const someChecked = selectedIds.size > 0 && !allChecked;

  useEffect(() => {
    setFilters((prev) => (prev.origen === origenInicial ? prev : { ...prev, origen: origenInicial }));
  }, [origenInicial]);

  // Reset page when filters change
  useEffect(() => { setPagina(1); }, [filters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page",  String(pagina));
    params.set("limit", String(porPagina));
    return params.toString();
  }, [filters, pagina, porPagina]);

  useEffect(() => {
    fetchPedidos();
  }, [queryString]);

  // Limpiar selección al cambiar los resultados
  useEffect(() => {
    setSelectedIds(new Set());
  }, [pedidos]);

  const fetchPedidos = async (query = queryString) => {
    try {
      const res = await fetch(`/api/pedidos${query ? `?${query}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      setPedidos(data.pedidos || []);
      setTotal(data.total ?? 0);
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
      paymentLabel(pedido.pagoMetodo),
      pedido.estado || "",
      pedido.totalFinal ?? "",
      pedido.fecha || pedido.fechaPedido || pedido.createdAt || "",
    ]);

    const csv = [
      ["ID", "Referencia", "Cliente", "Pago", "Estado", "Total", "Fecha"].join(";"),
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

  // Selección
  const toggleSelectAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pedidos.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Acciones masivas
  const handleBulkEstado = async (estado: string) => {
    setBulkLoading(true);
    try {
      await fetch("/api/pedidos/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), estado }),
      });
      setBulkModal(null);
      setSelectedIds(new Set());
      await fetchPedidos();
    } catch (err) {
      console.error("Error al cambiar estado masivo:", err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      await fetch("/api/pedidos/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setBulkModal(null);
      setPedidos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Error al eliminar pedidos masivo:", err);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-6 md:py-8 px-3 sm:px-4 md:px-6">
      {bulkModal === "estado" && (
        <BulkStateModal
          count={selectedIds.size}
          onConfirm={handleBulkEstado}
          onCancel={() => setBulkModal(null)}
        />
      )}
      {bulkModal === "delete" && (
        <BulkDeleteModal
          count={selectedIds.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkModal(null)}
        />
      )}

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
              <option value="CUESTIONARIO">CUESTIONARIO</option>
              <option value="CANCELADO">CANCELADO</option>
              <option value="DEVUELTO">DEVUELTO</option>
            </select>
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

          {/* Barra acciones masivas */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#6BAEC9]/10 border border-[#6BAEC9]/30 px-4 py-3">
              <span className="text-sm font-semibold text-[#4A4A4A]">
                {selectedIds.size} pedido{selectedIds.size !== 1 ? "s" : ""} seleccionado{selectedIds.size !== 1 ? "s" : ""}
              </span>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setBulkModal("estado")}
                  disabled={bulkLoading}
                  className="rounded-xl bg-[#6BAEC9] px-3 py-2 text-sm font-semibold text-white hover:bg-[#5FA0B3] disabled:opacity-50"
                >
                  Cambiar estado
                </button>
                <button
                  onClick={() => setBulkModal("delete")}
                  disabled={bulkLoading}
                  className="rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1280px]">
              <thead>
                <tr className="bg-[#F8F8F5]">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked; }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-[#6BAEC9] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#4A4A4A]">ID Pedido</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#4A4A4A]">Referencia</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#4A4A4A]">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#4A4A4A]">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#4A4A4A]">Pago</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#4A4A4A]">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#4A4A4A]">Fecha</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-[#4A4A4A]">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-8 py-12 text-center text-gray-500">
                      Cargando pedidos...
                    </td>
                  </tr>
                ) : pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-8 py-12 text-center text-gray-500">
                      No hay pedidos aún
                    </td>
                  </tr>
                ) : (
                  pedidos.map((pedido) => (
                    <tr
                      key={pedido.id}
                      className={`border-t hover:bg-[#F8F8F5] ${selectedIds.has(pedido.id) ? "bg-[#6BAEC9]/5" : ""}`}
                    >
                      <td className="px-4 py-6">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(pedido.id)}
                          onChange={() => toggleSelect(pedido.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#6BAEC9] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-[#6BAEC9]">{pedido.id}</td>
                      <td className="px-4 py-2.5 font-mono text-sm text-gray-500">
                        {pedido.referencia || pedido.numeroPedido || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-[#4A4A4A]">
                        {pedido.nombre && pedido.nombre !== "Cliente Importado"
                          ? pedido.nombre
                          : (pedido.cliente?.nombre || "Sin nombre")}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-semibold text-[#6BAEC9]">
                          €{pedido.pago?.totalFinal
                            ? pedido.pago.totalFinal.toFixed(2)
                            : pedido.totalFinal
                            ? pedido.totalFinal.toFixed(2)
                            : "0.00"}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">
                        {paymentLabel(pedido.pagoMetodo)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: estadoColors[pedido.estado] ?? "#6b7280" }}
                        >
                          {pedido.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-[#6BAEC9]">
                        {pedido.fecha
                          ? new Date(pedido.fecha).toLocaleDateString("es-ES")
                          : pedido.fechaPedido
                          ? new Date(pedido.fechaPedido).toLocaleDateString("es-ES")
                          : pedido.createdAt
                          ? new Date(pedido.createdAt).toLocaleDateString("es-ES")
                          : "Fecha no disponible"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => router.push(`/admin/pedidos/${pedido.id}`)}
                            className="p-2 hover:bg-[#6BAEC9]/10 rounded-xl transition-colors"
                            title="Ver / Editar pedido"
                          >
                            <svg className="w-5 h-5 text-[#6BAEC9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(pedido.id)}
                            className="p-2 hover:bg-[#F7A38B]/10 rounded-xl transition-colors"
                            title="Eliminar pedido"
                          >
                            <svg className="w-5 h-5 text-[#F7A38B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                <div
                  key={pedido.id}
                  className={`rounded-2xl border bg-[#F8F8F5] p-4 shadow-sm ${selectedIds.has(pedido.id) ? "border-[#6BAEC9]" : "border-gray-200"}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(pedido.id)}
                      onChange={() => toggleSelect(pedido.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-[#6BAEC9] cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Pedido</p>
                          <p className="font-mono text-sm text-[#6BAEC9]">{pedido.referencia || pedido.numeroPedido || `#${pedido.id}`}</p>
                        </div>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: estadoColors[pedido.estado] ?? "#6b7280" }}
                        >
                          {pedido.estado}
                        </span>
                      </div>
                    </div>
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
                      <p className="font-semibold text-gray-700">{paymentLabel(pedido.pagoMetodo)}</p>
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

          {/* ── Paginación ── */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-3 mt-2">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">
                {total > 0
                  ? <>Mostrando <strong>{Math.min((pagina - 1) * porPagina + 1, total)}–{Math.min(pagina * porPagina, total)}</strong> de <strong>{total}</strong> pedidos</>
                  : "Sin resultados"}
              </p>
              <select
                value={porPagina}
                onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm bg-white"
              >
                {[20, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>{n} por página</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => setPagina(1)} disabled={pagina === 1}
                className="px-2 py-1.5 text-xs rounded-md border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-100 transition-colors">
                «
              </button>
              <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}
                className="px-3 py-1.5 text-xs rounded-md border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-100 transition-colors">
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                const start = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
                const num = start + i;
                if (num > totalPaginas) return null;
                return (
                  <button key={num} onClick={() => setPagina(num)}
                    className={`w-8 h-8 text-xs rounded-md border transition-colors ${
                      pagina === num
                        ? "bg-[#6BAEC9] border-[#6BAEC9] text-white font-semibold"
                        : "border-gray-200 hover:bg-gray-100 text-gray-700"
                    }`}>
                    {num}
                  </button>
                );
              })}
              <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                className="px-3 py-1.5 text-xs rounded-md border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-100 transition-colors">
                ›
              </button>
              <button onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas}
                className="px-2 py-1.5 text-xs rounded-md border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-100 transition-colors">
                »
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
