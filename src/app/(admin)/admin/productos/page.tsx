"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/lib/useAdminFetch";
import {
  Plus, Wrench, Search, ChevronUp, ChevronDown,
  ChevronsUpDown, Eye, Pencil, Trash2, Copy,
  ChevronLeft, ChevronRight, Download, Upload,
  Database, CheckCircle2, XCircle, X,
} from "lucide-react";
import { useDebounce } from "use-debounce";

// ─── Tipos ───────────────────────────────────────────────────────────────────
type Producto = {
  id: number;
  nombre: string;
  referencia: string | null;
  precio: number;
  precioOferta: number | null;
  stock: number;
  numVariantes: number;
  activo: boolean;
  destacado: boolean;
  slug: true,
  imagenes: string[] | null;
  productoimagen?: { url: string }[] | null;
  Categoria: { id: number; nombre: string } | null;
  Marca:     { id: number; nombre: string } | null;
};

type SortField = "id" | "nombre" | "referencia" | "precio" | "stock" | "activo";
type SortDir   = "asc" | "desc";

type Filtros = {
  idMin: string; idMax: string;
  nombre: string;
  referencia: string;
  categoria: string;
  precioMin: string; precioMax: string;
  stockMin: string;  stockMax: string;
  activo: string;
};

const filtrosVacios: Filtros = {
  idMin: "", idMax: "", nombre: "", referencia: "",
  categoria: "", precioMin: "", precioMax: "",
  stockMin: "", stockMax: "", activo: "",
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ProductosPage() {
  const { secureFetch } = useAdminFetch();
  const router = useRouter();
  const [productos,      setProductos]      = useState<Producto[]>([]);
  const [total,          setTotal]          = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [pagina,         setPagina]         = useState(1);
  const [porPagina,      setPorPagina]      = useState(20);
  const [sortField,      setSortField]      = useState<SortField>("id");
  const [sortDir,        setSortDir]        = useState<SortDir>("asc");
  const [seleccionados,  setSeleccionados]  = useState<number[]>([]);
  const [filtros,        setFiltros]        = useState<Filtros>(filtrosVacios);
  const [showTools,      setShowTools]      = useState(false);
  const [showDeleteModal,setShowDeleteModal] = useState(false);
  const [productoABorrar,setProductoABorrar] = useState<Producto | null>(null);
  const [toast,          setToast]          = useState<{ msg: string; tipo: "ok"|"error" } | null>(null);

  const [dFiltros] = useDebounce(filtros, 400);

  // Restaurar filtros guardados al montar
  useEffect(() => {
    const saved = sessionStorage.getItem("adminProductosFiltros");
    if (saved) {
      try { setFiltros(JSON.parse(saved)); } catch {}
    }
  }, []);

  // Guardar filtros en sessionStorage al cambiar
  useEffect(() => {
    if (Object.values(filtros).some(v => v !== "")) {
      sessionStorage.setItem("adminProductosFiltros", JSON.stringify(filtros));
    } else {
      sessionStorage.removeItem("adminProductosFiltros");
    }
  }, [filtros]);

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const cargarProductos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:     String(pagina),
        limit:    String(porPagina),
        sortBy:   sortField,
        sortDir,
        ...(dFiltros.idMin      && { idMin:      dFiltros.idMin }),
        ...(dFiltros.idMax      && { idMax:      dFiltros.idMax }),
        ...(dFiltros.nombre     && { nombre:     dFiltros.nombre }),
        ...(dFiltros.referencia && { referencia: dFiltros.referencia }),
        ...(dFiltros.categoria  && { categoria:  dFiltros.categoria }),
        ...(dFiltros.precioMin  && { precioMin:  dFiltros.precioMin }),
        ...(dFiltros.precioMax  && { precioMax:  dFiltros.precioMax }),
        ...(dFiltros.stockMin   && { stockMin:   dFiltros.stockMin }),
        ...(dFiltros.stockMax   && { stockMax:   dFiltros.stockMax }),
        ...(dFiltros.activo     && { activo:     dFiltros.activo }),
      });
      const res = await fetch(`/api/admin/productos?${params}`);
      const data = await res.json();
      setProductos(data.productos ?? []);
      setTotal(data.total ?? 0);
    } catch {
      mostrarToast("Error al cargar productos", "error");
    } finally {
      setLoading(false);
    }
  }, [pagina, porPagina, sortField, sortDir, dFiltros]);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  const mostrarToast = (msg: string, tipo: "ok"|"error") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPagina(1);
  };

  const toggleSeleccion = (id: number) =>
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const toggleTodos = () =>
    setSeleccionados(
      seleccionados.length === productos.length ? [] : productos.map(p => p.id)
    );

  const setFiltro = (key: keyof Filtros, val: string) => {
    setFiltros(prev => ({ ...prev, [key]: val }));
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setFiltros(filtrosVacios);
    setPagina(1);
    sessionStorage.removeItem("adminProductosFiltros");
  };

  // ── Acciones ────────────────────────────────────────────────────────────────
  const confirmarBorrar = (p: Producto) => { setProductoABorrar(p); setShowDeleteModal(true); };

  const borrarProducto = async () => {
    if (!productoABorrar) return;
    const result = await secureFetch(`/api/admin/productos/${productoABorrar.id}`, { method: "DELETE" });
    if (result.ok) {
      mostrarToast("Producto eliminado", "ok");
      setShowDeleteModal(false);
      cargarProductos();
    }
  };

  const duplicarProducto = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/productos/${id}/duplicar`, { method: "POST" });
      if (!res.ok) throw new Error();
      mostrarToast("Producto duplicado", "ok");
      cargarProductos();
    } catch {
      mostrarToast("Error al duplicar el producto", "error");
    }
  };

  const toggleActivo = async (p: Producto) => {
  try {
    await fetch(`/api/admin/productos/${p.id}`, {
      method: "PUT", // ← antes tenías PATCH
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, activo: !p.activo }),
    });
    cargarProductos();
  } catch {
    mostrarToast("Error al cambiar estado", "error");
  }
};

  // ── Render: cabecera de columna ordenable ───────────────────────────────────
  const ColHeader = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap ${className}`}
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field
          ? sortDir === "asc"
            ? <ChevronUp className="w-3 h-3 text-blue-500" />
            : <ChevronDown className="w-3 h-3 text-blue-500" />
          : <ChevronsUpDown className="w-3 h-3 text-gray-400" />}
      </div>
    </th>
  );

  const hayFiltros = Object.values(filtros).some(v => v !== "");

  return (
    <div className="space-y-4">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
          ${toast.tipo === "ok" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.tipo === "ok"
            ? <CheckCircle2 className="w-4 h-4" />
            : <XCircle      className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Cabecera página ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Productos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} producto{total !== 1 ? "s" : ""} en total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Herramientas */}
          <div className="relative">
            <button
              onClick={() => setShowTools(!showTools)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Wrench className="w-4 h-4" />
              Herramientas
              <ChevronDown className="w-3 h-3" />
            </button>
            {showTools && (
              <div className="absolute right-0 top-10 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20">
                <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Download className="w-4 h-4 text-green-600" /> Exportar CSV
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/admin/importar")}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Upload className="w-4 h-4 text-blue-600" /> Importar CSV
                </button>
                <div className="border-t border-gray-100 dark:border-gray-800" />
                <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Database className="w-4 h-4 text-purple-600" /> Mostrar SQL
                </button>
              </div>
            )}
          </div>

          {/* Nuevo producto */}
          <Link
            href="/admin/productos/nuevo"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#3498db] hover:bg-[#2980b9] text-white rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </Link>
        </div>
      </div>

      {/* ── Acciones seleccionados ── */}
      {seleccionados.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
          <span className="text-blue-700 dark:text-blue-300 font-medium">
            {seleccionados.length} seleccionado{seleccionados.length > 1 ? "s" : ""}
          </span>
          <button className="text-red-600 hover:underline font-medium">Eliminar seleccionados</button>
          <button className="text-gray-500 hover:underline ml-auto" onClick={() => setSeleccionados([])}>
            Deseleccionar
          </button>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

        {/* Controles superiores */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Mostrar</span>
            <select
              value={porPagina}
              onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1); }}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-800 dark:text-white"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>por página</span>
          </div>

        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {/* Checkbox */}
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={seleccionados.length === productos.length && productos.length > 0}
                    onChange={toggleTodos}
                    className="rounded border-gray-300 text-blue-500"
                  />
                </th>
                <ColHeader field="id"    label="ID"    className="w-16" />
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-16">Imagen</th>
                <ColHeader field="nombre"     label="Nombre"     />
                <ColHeader field="referencia" label="Referencia" className="w-32" />
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-36">Categoría</th>
                <ColHeader field="precio" label="Precio"   className="w-32" />
                <ColHeader field="stock"  label="Cantidad" className="w-24" />
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-24">Variantes</th>
                <ColHeader field="activo" label="Estado"   className="w-24" />
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-32">Acciones</th>
              </tr>

              {/* ── Fila de filtros ── */}
              <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <td />
                {/* ID min/max */}
                <td className="px-1 py-1.5">
                  <div className="flex gap-1">
                    <input placeholder="Mín." value={filtros.idMin} onChange={e => setFiltro("idMin", e.target.value)}
                      className="w-12 px-1 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 dark:text-white" />
                    <input placeholder="Máx." value={filtros.idMax} onChange={e => setFiltro("idMax", e.target.value)}
                      className="w-12 px-1 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 dark:text-white" />
                  </div>
                </td>
                <td />
                {/* Nombre */}
                <td className="px-1 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input placeholder="Buscar nombre…" value={filtros.nombre} onChange={e => setFiltro("nombre", e.target.value)}
                      className="w-full pl-5 pr-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 dark:text-white" />
                  </div>
                </td>
                {/* Referencia */}
                <td className="px-1 py-1.5">
                  <input placeholder="Buscar ref." value={filtros.referencia} onChange={e => setFiltro("referencia", e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 dark:text-white" />
                </td>
                {/* Categoría */}
                <td className="px-1 py-1.5">
                  <input placeholder="Categoría" value={filtros.categoria} onChange={e => setFiltro("categoria", e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 dark:text-white" />
                </td>
                {/* Precio min/max */}
                <td className="px-1 py-1.5">
                  <div className="flex gap-1">
                    <input placeholder="Mín." value={filtros.precioMin} onChange={e => setFiltro("precioMin", e.target.value)}
                      className="w-14 px-1 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 dark:text-white" />
                    <input placeholder="Máx." value={filtros.precioMax} onChange={e => setFiltro("precioMax", e.target.value)}
                      className="w-14 px-1 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 dark:text-white" />
                  </div>
                </td>
                {/* Stock min/max */}
                <td className="px-1 py-1.5">
                  <div className="flex gap-1">
                    <input placeholder="Mín." value={filtros.stockMin} onChange={e => setFiltro("stockMin", e.target.value)}
                      className="w-12 px-1 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 dark:text-white" />
                    <input placeholder="Máx." value={filtros.stockMax} onChange={e => setFiltro("stockMax", e.target.value)}
                      className="w-12 px-1 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 dark:text-white" />
                  </div>
                </td>
                {/* Variantes (sin filtro) */}
                <td />
                {/* Estado */}
                <td className="px-1 py-1.5">
                  <select value={filtros.activo} onChange={e => setFiltro("activo", e.target.value)}
                    className="w-full px-1 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 dark:text-white">
                    <option value="">Todos</option>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </td>
                {/* Limpiar filtros (Acciones) */}
                <td className="px-1 py-1.5 text-center">
                  {hayFiltros && (
                    <button
                      onClick={limpiarFiltros}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-md px-2 py-1 hover:bg-red-50 transition-colors whitespace-nowrap mx-auto"
                    >
                      <X className="w-3 h-3" /> Limpiar filtros
                    </button>
                  )}
                </td>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400 dark:text-gray-500">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                productos.map(p => {
                  const imagenUrl =
                    (Array.isArray(p.imagenes) && p.imagenes.length > 0 && p.imagenes[0]) ||
                    (Array.isArray(p.productoimagen) && p.productoimagen.length > 0 && p.productoimagen[0]?.url) ||
                    null;
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${seleccionados.includes(p.id) ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={seleccionados.includes(p.id)} onChange={() => toggleSeleccion(p.id)}
                          className="rounded border-gray-300 text-blue-500" />
                      </td>
                      {/* ID */}
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{p.id}</td>
                      {/* Imagen */}
                      <td className="px-3 py-2.5">
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                          {imagenUrl ? (
                            <img src={imagenUrl} alt={p.nombre} className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-gray-300 text-lg">📦</span>
                          )}
                        </div>
                      </td>
                      {/* Nombre */}
                      <td className="px-3 py-2.5">
                        <Link href={`/admin/productos/${p.id}`} className="font-medium text-gray-800 dark:text-white hover:text-[#3498db] transition-colors line-clamp-2">
                          {p.nombre}
                        </Link>
                        {p.destacado && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">★ Destacado</span>
                        )}
                      </td>
                      {/* Referencia */}
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{p.referencia ?? "—"}</td>
                      {/* Categoría */}
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{p.Categoria?.nombre ?? "—"}</td>
                      {/* Precio */}
                      <td className="px-3 py-2.5 text-right">
                        {p.precioOferta ? (
                          <div>
                            <span className="text-red-500 font-semibold">{p.precioOferta.toFixed(2)} €</span>
                            <span className="block text-xs text-gray-400 line-through">{p.precio.toFixed(2)} €</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-800 dark:text-white">{p.precio.toFixed(2)} €</span>
                        )}
                      </td>
                      {/* Stock */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-semibold text-sm ${p.stock === 0 ? "text-red-500" : p.stock < 5 ? "text-orange-500" : "text-gray-700 dark:text-gray-200"}`}>
                          {p.stock}
                        </span>
                      </td>
                      {/* Variantes */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold
                          ${p.numVariantes === 0
                            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
                          {p.numVariantes}
                        </span>
                      </td>
                      {/* Estado */}
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => toggleActivo(p)} title={p.activo ? "Desactivar" : "Activar"}>
                          {p.activo
                            ? <CheckCircle2 className="w-5 h-5 text-green-500 hover:text-green-700 transition-colors" />
                            : <XCircle      className="w-5 h-5 text-red-400   hover:text-red-600   transition-colors" />}
                        </button>
                      </td>
                      {/* Acciones */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/productos/${p.slug || p.id}`}  target="_blank" title="Ver"
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link href={`/admin/productos/${p.id}`} title="Editar"
                            className="p-1.5 rounded-md text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button onClick={() => duplicarProducto(p.id)} title="Duplicar"
                            className="p-1.5 rounded-md text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => confirmarBorrar(p)} title="Eliminar"
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Paginación ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex-wrap gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {Math.min((pagina - 1) * porPagina + 1, total)}–{Math.min(pagina * porPagina, total)} de {total} resultados
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={pagina === 1}
              className="px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              «
            </button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              className="px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {/* Números de página */}
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              const start = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
              const num   = start + i;
              if (num > totalPaginas) return null;
              return (
                <button key={num} onClick={() => setPagina(num)}
                  className={`w-8 h-8 text-xs rounded-md border transition-colors
                    ${pagina === num
                      ? "bg-[#3498db] border-[#3498db] text-white font-semibold"
                      : "border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                    }`}>
                  {num}
                </button>
              );
            })}
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
              className="px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas}
              className="px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              »
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal confirmar borrado ── */}
      {showDeleteModal && productoABorrar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Eliminar producto</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              ¿Seguro que quieres eliminar <strong>{productoABorrar.nombre}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
              <button onClick={borrarProducto}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}