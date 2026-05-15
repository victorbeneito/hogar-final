"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, RefreshCw, Search, Settings } from "lucide-react";

type InvoiceRow = {
  id: number;
  numeroFactura: string;
  fechaFactura: string;
  total: number;
  baseImponible: number;
  totalIva: number;
  porcentajeIva: number;
  pdfUrl?: string | null;
  pedido: {
    id: number;
    numeroPedido: string;
    nombre: string;
    apellidos: string | null;
    email: string;
    totalFinal: number;
    estado: string;
    fechaPedido: string | null;
  };
};

type SourceFilter = "actuales" | "prestashop" | "todos";

function normalizeSourceFilter(value: string | null): SourceFilter {
  return value === "prestashop" || value === "todos" ? value : "actuales";
}

export default function AdminFacturasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origenInicial = normalizeSourceFilter(searchParams.get("origen"));
  const [facturas, setFacturas] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    origen: origenInicial,
    numero: "",
    cliente: "",
    fechaDesde: "",
    fechaHasta: "",
    sortBy: "fechaFactura",
    sortDir: "desc",
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    setFilters((prev) => (prev.origen === origenInicial ? prev : { ...prev, origen: origenInicial }));
  }, [origenInicial]);

  useEffect(() => {
    fetchFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchFacturas(query = queryString) {
    try {
      const res = await fetch(`/api/facturas${query ? `?${query}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      setFacturas(data.facturas || []);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await fetchFacturas();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-6 md:py-8 px-3 sm:px-4 md:px-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="mb-6 flex flex-col gap-3">
          <div>
            <p className="text-sm text-gray-500">Facturas</p>
            <h1 className="text-3xl md:text-4xl font-bold text-[#4A4A4A]">Gestión de facturas nuevas</h1>
            <p className="mt-2 text-sm text-gray-500 max-w-2xl">
              Las facturas importadas de Prestashop quedan en el archivo histórico; aquí se prioriza el flujo operativo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/admin/facturas/configuracion")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6BAEC9] px-4 py-3 text-sm font-semibold text-white hover:bg-[#5FA0B3] shadow-md"
            >
              <Settings className="w-4 h-4" />
              Configuración
            </button>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
            <button
              onClick={() => router.push("/admin/prestashop")}
              className="inline-flex items-center gap-2 rounded-xl border border-[#6BAEC9]/30 bg-[#6BAEC9]/5 px-4 py-3 text-sm font-semibold text-[#5FA0B3] hover:bg-[#6BAEC9]/10"
            >
              Archivo Prestashop
            </button>
            <button
              onClick={() => router.push("/admin/pedidos")}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Volver a pedidos
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border border-[#6BAEC9]/10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            <input
              value={filters.numero}
              onChange={(e) => setFilters((prev) => ({ ...prev, numero: e.target.value }))}
              placeholder="Buscar por factura"
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
              <option value="actuales">Fuente: nuevas</option>
              <option value="prestashop">Fuente: Prestashop</option>
              <option value="todos">Fuente: todas</option>
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
              <option value="fechaFactura">Ordenar por fecha</option>
              <option value="numeroFactura">Ordenar por número</option>
              <option value="nombre">Ordenar por cliente</option>
              <option value="total">Ordenar por total</option>
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
              onClick={() => fetchFacturas()}
              className="rounded-xl bg-[#6BAEC9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5FA0B3] inline-flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="bg-[#F8F8F5] text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-gray-500" colSpan={6}>
                      Cargando facturas...
                    </td>
                  </tr>
                ) : facturas.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-gray-500" colSpan={6}>
                      No hay facturas todavía.
                    </td>
                  </tr>
                ) : (
                  facturas.map((factura) => (
                    <tr key={factura.id} className="border-t border-gray-100">
                      <td className="px-4 py-4 font-semibold text-gray-900">{factura.numeroFactura}</td>
                      <td className="px-4 py-4 text-gray-600">{new Date(factura.fechaFactura).toLocaleDateString("es-ES")}</td>
                      <td className="px-4 py-4 text-gray-600">{[factura.pedido.nombre, factura.pedido.apellidos].filter(Boolean).join(" ") || factura.pedido.email}</td>
                      <td className="px-4 py-4 text-gray-600">{factura.pedido.numeroPedido}</td>
                      <td className="px-4 py-4 font-semibold text-[#6BAEC9]">{Number(factura.total).toFixed(2)} €</td>
                      <td className="px-4 py-4">
                        <Link href={`/admin/pedidos/${factura.pedido.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#6BAEC9] hover:underline">
                          Ver pedido <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {loading ? (
              <div className="rounded-xl border border-gray-200 p-4 text-gray-500">Cargando facturas...</div>
            ) : facturas.length === 0 ? (
              <div className="rounded-xl border border-gray-200 p-4 text-gray-500">No hay facturas todavía.</div>
            ) : (
              facturas.map((factura) => (
                <article key={factura.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{factura.numeroFactura}</p>
                      <p className="text-xs text-gray-500">{new Date(factura.fechaFactura).toLocaleDateString("es-ES")}</p>
                    </div>
                    <p className="text-lg font-bold text-[#6BAEC9]">{Number(factura.total).toFixed(2)} €</p>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    <p>{[factura.pedido.nombre, factura.pedido.apellidos].filter(Boolean).join(" ") || factura.pedido.email}</p>
                    <p className="text-xs text-gray-500">Pedido {factura.pedido.numeroPedido}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
