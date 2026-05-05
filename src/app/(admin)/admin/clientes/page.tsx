"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BadgeX,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

interface Cliente {
  id: number;
  nombre: string;
  apellidos?: string | null;
  email: string;
  telefono?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  empresa?: string | null;
  activo?: boolean;
}

type AppliedFilters = {
  nombre: string;
  contacto: string;
};

function getInitials(nombre: string, apellidos?: string | null) {
  const source = `${nombre} ${apellidos ?? ""}`.trim();
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  return initials || "CL";
}

export default function AdminClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(12);
  const [nombreFiltro, setNombreFiltro] = useState("");
  const [contactoFiltro, setContactoFiltro] = useState("");
  const [filtrosAplicados, setFiltrosAplicados] = useState<AppliedFilters>({ nombre: "", contacto: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const rangoInicio = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const rangoFin = Math.min(total, pagina * porPagina);
  const hayFiltros = Boolean(nombreFiltro.trim() || contactoFiltro.trim() || filtrosAplicados.nombre || filtrosAplicados.contacto);

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("adminToken") || "";
      const params = new URLSearchParams({
        page: String(pagina),
        limit: String(porPagina),
        ...(filtrosAplicados.nombre && { nombre: filtrosAplicados.nombre }),
        ...(filtrosAplicados.contacto && { contacto: filtrosAplicados.contacto }),
      });

      const res = await fetch(`/api/clientes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudieron cargar los clientes");
      }

      const totalRespuesta = Number(data.total ?? 0);
      const totalPaginasCalculadas = Math.ceil(totalRespuesta / porPagina);
      const totalPaginasRespuesta = Math.max(1, Number(data.totalPages ?? totalPaginasCalculadas));

      if (pagina > totalPaginasRespuesta && totalRespuesta > 0) {
        setPagina(totalPaginasRespuesta);
        return;
      }

      setClientes(data.clientes || []);
      setTotal(totalRespuesta);
    } catch (err: any) {
      setClientes([]);
      setTotal(0);
      setError(err.message || "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }, [pagina, porPagina, filtrosAplicados]);

  useEffect(() => {
    void fetchClientes();
  }, [fetchClientes]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPagina(1);
    setFiltrosAplicados({
      nombre: nombreFiltro.trim(),
      contacto: contactoFiltro.trim(),
    });
  };

  const handleClear = () => {
    setNombreFiltro("");
    setContactoFiltro("");
    setPagina(1);
    setFiltrosAplicados({ nombre: "", contacto: "" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este cliente? Esta acción borrará también sus pedidos.")) return;

    const token = localStorage.getItem("adminToken") || "";
    const res = await fetch(`/api/clientes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      alert(data.error || "Error al eliminar cliente");
      return;
    }

    if (clientes.length === 1 && pagina > 1) {
      setPagina((prev) => Math.max(1, prev - 1));
      return;
    }

    void fetchClientes();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F8F5] via-[#F8F8F5] to-[#EEF6FA] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#6BAEC9] shadow-sm ring-1 ring-[#DCEBF1]">
              <Users className="h-3.5 w-3.5" /> Gestión de clientes
            </div>
            <h1 className="mt-4 text-4xl font-bold text-[#4A4A4A]">Clientes</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">Busca por nombre o contacto, navega por páginas y entra a la ficha sin perder contexto.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-[#4A4A4A] bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Volver al panel
            </button>
            <Link
              href="/admin/clientes/nuevo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white bg-[#6BAEC9] hover:bg-[#5FA0B3] shadow-md transition-all"
            >
              <Plus className="h-4 w-4" /> Nuevo cliente
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-lg backdrop-blur-sm">
          <form onSubmit={handleSearch} className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_auto]">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Nombre</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={nombreFiltro}
                  onChange={(e) => setNombreFiltro(e.target.value)}
                  placeholder="Nombre o apellidos"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3.5 text-sm text-slate-700 outline-none transition focus:border-[#6BAEC9] focus:ring-4 focus:ring-[#A8D7E6]/40"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contacto</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={contactoFiltro}
                  onChange={(e) => setContactoFiltro(e.target.value)}
                  placeholder="Email, teléfono, empresa o NIF"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3.5 text-sm text-slate-700 outline-none transition focus:border-[#6BAEC9] focus:ring-4 focus:ring-[#A8D7E6]/40"
                />
              </div>
            </label>

            <div className="flex flex-wrap items-end gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] px-5 py-3.5 font-semibold text-white shadow-md transition hover:from-[#5FA0B3] hover:to-[#91C8D9]"
              >
                <Search className="h-4 w-4" /> Buscar
              </button>
              {hayFiltros && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <X className="h-4 w-4" /> Limpiar
                </button>
              )}
            </div>
          </form>

          {hayFiltros && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
              {filtrosAplicados.nombre && (
                <span className="inline-flex items-center rounded-full bg-[#EAF5F9] px-3 py-1 text-[#4F8FA6] ring-1 ring-[#D7EBF2]">
                  Nombre: {filtrosAplicados.nombre}
                </span>
              )}
              {filtrosAplicados.contacto && (
                <span className="inline-flex items-center rounded-full bg-[#EAF5F9] px-3 py-1 text-[#4F8FA6] ring-1 ring-[#D7EBF2]">
                  Contacto: {filtrosAplicados.contacto}
                </span>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <p>
              {total} cliente{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}
            </p>
            <label className="flex items-center gap-2">
              <span>Mostrar</span>
              <select
                value={porPagina}
                onChange={(e) => {
                  setPorPagina(Number(e.target.value));
                  setPagina(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#6BAEC9]"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
              <span>por página</span>
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-[#4A4A4A]">Listado de clientes</h2>
              <p className="text-sm text-slate-500">
                Mostrando {rangoInicio}-{rangoFin} de {total}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <button
                type="button"
                onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
                disabled={pagina <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-28 text-center font-medium">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
                disabled={pagina >= totalPaginas}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          ) : loading ? (
            <p className="text-center py-12 text-gray-500">Cargando clientes...</p>
          ) : clientes.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-500 mb-4">No se encontraron clientes con esos filtros.</p>
              <Link
                href="/admin/clientes/nuevo"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white bg-[#6BAEC9] hover:bg-[#5FA0B3] shadow-md transition-all"
              >
                <Plus className="h-4 w-4" /> Crear primer cliente
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {clientes.map((cliente) => {
                const nombreCompleto = `${cliente.nombre} ${cliente.apellidos || ""}`.trim();
                const initials = getInitials(cliente.nombre, cliente.apellidos);
                const activo = cliente.activo !== false;
                const ubicacion = [cliente.ciudad, cliente.provincia].filter(Boolean).join(", ");
                const metadata = [cliente.empresa, ubicacion].filter(Boolean).join(" · ");

                return (
                  <article
                    key={cliente.id}
                    onClick={() => router.push(`/admin/clientes/${cliente.id}`)}
                    className="group cursor-pointer rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#B9DDE9] hover:shadow-md"
                  >
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1.7fr)_auto_auto] xl:items-center">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6BAEC9] to-[#A8D7E6] text-sm font-bold text-white shadow-sm ring-1 ring-white/70">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-slate-900">{nombreCompleto}</p>
                            <p className="truncate text-xs font-medium text-slate-400">
                              ID {cliente.id}{metadata ? ` · ${metadata}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:min-w-[340px]">
                        <div className="flex min-w-0 items-center gap-2">
                          <Mail className="h-4 w-4 flex-shrink-0 text-[#6BAEC9]" />
                          <span className="truncate">{cliente.email}</span>
                        </div>
                        <div className="flex min-w-0 items-center gap-2">
                          <Phone className="h-4 w-4 flex-shrink-0 text-[#6BAEC9]" />
                          <span className="truncate">{cliente.telefono || "—"}</span>
                        </div>
                      </div>

                      <div className="flex xl:justify-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
                            activo
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-rose-50 text-rose-700 ring-rose-200"
                          }`}
                        >
                          {activo ? <BadgeCheck className="h-3.5 w-3.5" /> : <BadgeX className="h-3.5 w-3.5" />}
                          {activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50/90 p-1.5 xl:justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/clientes/${cliente.id}`);
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                        >
                          <Eye className="h-4 w-4" /> Ver ficha
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(cliente.id);
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
                        >
                          <Trash2 className="h-4 w-4" /> Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!error && !loading && clientes.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-slate-500">
                Mostrando {rangoInicio}-{rangoFin} de {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
                  disabled={pagina <= 1}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>
                <span className="rounded-2xl bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600">
                  Página {pagina} de {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
                  disabled={pagina >= totalPaginas}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
