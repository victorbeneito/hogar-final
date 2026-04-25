"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TabKey = "datos" | "direcciones" | "pedidos";

interface Direccion {
  id: number;
  alias: string;
  nombre: string;
  apellidos?: string | null;
  empresa?: string | null;
  nif?: string | null;
  telefono?: string | null;
  direccion: string;
  complemento?: string | null;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  predeterminada: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Pedido {
  id: number;
  numeroPedido: string;
  totalFinal: number;
  estado: string;
  fechaPedido: string;
  pagoMetodo?: string;
  envioMetodo?: string;
}

interface Cliente {
  id: number;
  nombre: string;
  apellidos?: string | null;
  email: string;
  telefono?: string | null;
  empresa?: string | null;
  nif?: string | null;
  activo?: boolean;
  aceptaMarketing?: boolean;
  role?: string;
  updatedAt?: string;
  direccionPrincipal?: {
    alias: string;
    empresa: string;
    direccion: string;
    direccionComplementaria: string;
    codigoPostal: string;
    ciudad: string;
    provincia: string;
    pais: string;
    telefono: string;
    nif: string;
    predeterminada: boolean;
  };
}

interface DireccionForm {
  alias: string;
  nombre: string;
  apellidos: string;
  empresa: string;
  nif: string;
  telefono: string;
  direccion: string;
  direccionComplementaria: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  predeterminada: boolean;
}

interface ClienteFormState {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  empresa: string;
  nif: string;
  password: string;
}

const EMPTY_DIRECCION: DireccionForm = {
  alias: "Principal",
  nombre: "",
  apellidos: "",
  empresa: "",
  nif: "",
  telefono: "",
  direccion: "",
  direccionComplementaria: "",
  codigoPostal: "",
  ciudad: "",
  provincia: "",
  pais: "España",
  predeterminada: true,
};

export default function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCliente, setSavingCliente] = useState(false);
  const [savingDireccion, setSavingDireccion] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("datos");
  const [editingDireccionId, setEditingDireccionId] = useState<number | null>(null);
  const [clienteForm, setClienteForm] = useState<ClienteFormState>({
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    empresa: "",
    nif: "",
    password: "",
  });
  const [direccionForm, setDireccionForm] = useState<DireccionForm>(EMPTY_DIRECCION);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const token = localStorage.getItem("adminToken") || "";
        const res = await fetch(`/api/clientes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al cargar cliente");

        setCliente(data.cliente);
        setDirecciones(data.direcciones || []);
        setPedidos(data.pedidos || []);
        setClienteForm({
          nombre: data.cliente?.nombre || "",
          apellidos: data.cliente?.apellidos || "",
          email: data.cliente?.email || "",
          telefono: data.cliente?.telefono || "",
          empresa: data.cliente?.empresa || "",
          nif: data.cliente?.nif || "",
          password: "",
        });
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDatos();
  }, [id]);

  const handleClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClienteForm((prev) => ({ ...prev, [name as keyof ClienteFormState]: value }));
  };

  const handleDireccionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const field = name as keyof DireccionForm;
    setDireccionForm((prev) => ({
      ...prev,
      [field]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveCliente = async () => {
    try {
      setSavingCliente(true);
      const token = localStorage.getItem("adminToken") || "";
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(clienteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar cliente");

      setCliente(data.cliente);
      alert("Cliente actualizado correctamente");
    } catch (error: any) {
      alert(error.message || "Error al guardar cliente");
    } finally {
      setSavingCliente(false);
    }
  };

  const resetDireccionForm = () => {
    setDireccionForm(EMPTY_DIRECCION);
    setEditingDireccionId(null);
  };

  const editarDireccion = (direccion: Direccion) => {
    setEditingDireccionId(direccion.id);
    setDireccionForm({
      alias: direccion.alias || "Principal",
      nombre: direccion.nombre || "",
      apellidos: direccion.apellidos || "",
      empresa: direccion.empresa || "",
      nif: direccion.nif || "",
      telefono: direccion.telefono || "",
      direccion: direccion.direccion || "",
      direccionComplementaria: direccion.complemento || "",
      codigoPostal: direccion.codigoPostal || "",
      ciudad: direccion.ciudad || "",
      provincia: direccion.provincia || "",
      pais: direccion.pais || "España",
      predeterminada: direccion.predeterminada,
    });
    setActiveTab("direcciones");
  };

  const recargarDatos = async () => {
    const token = localStorage.getItem("adminToken") || "";
    const res = await fetch(`/api/clientes/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al recargar");
    setCliente(data.cliente);
    setDirecciones(data.direcciones || []);
    setPedidos(data.pedidos || []);
    setClienteForm({
      nombre: data.cliente?.nombre || "",
      apellidos: data.cliente?.apellidos || "",
      email: data.cliente?.email || "",
      telefono: data.cliente?.telefono || "",
      empresa: data.cliente?.empresa || "",
      nif: data.cliente?.nif || "",
      password: "",
    });
  };

  const handleSaveDireccion = async () => {
    try {
      setSavingDireccion(true);
      const token = localStorage.getItem("adminToken") || "";
      const isEdit = editingDireccionId !== null;
      const url = isEdit
        ? `/api/clientes/${id}/direcciones?direccionId=${editingDireccionId}`
        : `/api/clientes/${id}/direcciones`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(direccionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar dirección");

      await recargarDatos();
      resetDireccionForm();
      alert(isEdit ? "Dirección actualizada correctamente" : "Dirección creada correctamente");
    } catch (error: any) {
      alert(error.message || "Error al guardar dirección");
    } finally {
      setSavingDireccion(false);
    }
  };

  const handleDeleteDireccion = async (direccionId: number) => {
    if (!confirm("¿Eliminar esta dirección?")) return;
    const token = localStorage.getItem("adminToken") || "";
    const res = await fetch(`/api/clientes/${id}/direcciones?direccionId=${direccionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Error al eliminar dirección");
      return;
    }
    await recargarDatos();
  };

  const handleSetDefaultDireccion = async (direccionId: number) => {
    const token = localStorage.getItem("adminToken") || "";
    const res = await fetch(`/api/clientes/${id}/direcciones?direccionId=${direccionId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Error al marcar como predeterminada");
      return;
    }
    await recargarDatos();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-ES");
  };

  const pedidosTotal = pedidos.reduce((sum, pedido) => sum + Number(pedido.totalFinal || 0), 0);
  const pedidosPendientes = pedidos.filter((pedido) => pedido.estado === "PENDIENTE").length;
  const pedidosEntregados = pedidos.filter((pedido) => pedido.estado === "ENTREGADO").length;
  const direccionesPrincipales = direcciones.filter((direccion) => direccion.predeterminada).length;
  const direccionPrincipal = direcciones.find((direccion) => direccion.predeterminada) || direcciones[0];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  }

  if (!cliente) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cliente no encontrado.</div>;
  }

  const primarySave = activeTab === "datos" ? handleSaveCliente : handleSaveDireccion;
  const primarySaving = activeTab === "datos" ? savingCliente : savingDireccion;
  const primaryLabel =
    activeTab === "datos"
      ? savingCliente
        ? "Guardando..."
        : "💾 Guardar cliente"
      : savingDireccion
        ? "Guardando..."
        : editingDireccionId
          ? "💾 Guardar dirección"
          : "➕ Crear dirección";

  return (
    <div className="min-h-screen bg-[#F8F8F5] px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-[#6BAEC9]/10 px-3 py-1 font-semibold text-[#6BAEC9]">
                ID {cliente.id}
              </span>
              <span className={`rounded-full px-3 py-1 font-semibold ${cliente.activo === false ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                {cliente.activo === false ? "Inactivo" : "Activo"}
              </span>
              {cliente.role && (
                <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-600">
                  {cliente.role}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#4A4A4A] sm:text-4xl">
                {cliente.nombre} {cliente.apellidos || ""}
              </h1>
              <p className="mt-1 text-sm text-gray-500 sm:text-base">
                {cliente.email}
                {cliente.updatedAt ? ` · Actualizado ${new Date(cliente.updatedAt).toLocaleDateString("es-ES")}` : ""}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[560px]">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Pedidos</div>
                <div className="mt-1 text-2xl font-bold text-gray-800">{pedidos.length}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Gastado</div>
                <div className="mt-1 text-2xl font-bold text-[#F7A38B]">{pedidosTotal.toFixed(2)} €</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Direcciones</div>
                <div className="mt-1 text-2xl font-bold text-[#6BAEC9]">{direcciones.length}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Principal</div>
                <div className="mt-1 truncate text-base font-bold text-gray-800">{direccionPrincipal?.alias || "—"}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/admin/clientes")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-500 px-5 py-3 font-semibold text-white transition hover:bg-gray-600"
            >
              ← Volver a clientes
            </button>
            {activeTab !== "pedidos" && (
              <button
                type="button"
                onClick={primarySave}
                disabled={primarySaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6BAEC9] px-5 py-3 font-semibold text-white transition hover:bg-[#5FA0B3] disabled:opacity-50"
              >
                {primaryLabel}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
          <div className="border-b border-gray-200 px-3 sm:px-6">
            <nav className="flex gap-1 overflow-x-auto py-2">
              {[
                { id: "datos", label: "Datos", hint: "Perfil y acceso" },
                { id: "direcciones", label: "Direcciones", hint: "Libreta y principal" },
                { id: "pedidos", label: "Pedidos", hint: "Historial" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabKey)}
                  className={`min-w-[140px] whitespace-nowrap rounded-t-xl border-b-2 px-4 py-3 text-left transition ${
                    activeTab === tab.id
                      ? "border-[#6BAEC9] bg-[#6BAEC9]/5 text-[#6BAEC9]"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  <div className="text-sm font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-70">{tab.hint}</div>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {activeTab === "datos" && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-gray-800">Datos del cliente</h2>
                    <p className="text-sm text-gray-500">Nombre, acceso y datos de facturación básicos.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-600">Nombre</label>
                      <input name="nombre" value={clienteForm.nombre} onChange={handleClienteChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-600">Apellidos</label>
                      <input name="apellidos" value={clienteForm.apellidos} onChange={handleClienteChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-600">Email</label>
                      <input name="email" value={clienteForm.email} onChange={handleClienteChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-600">Teléfono</label>
                      <input name="telefono" value={clienteForm.telefono} onChange={handleClienteChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-600">Empresa</label>
                      <input name="empresa" value={clienteForm.empresa} onChange={handleClienteChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-600">NIF</label>
                      <input name="nif" value={clienteForm.nif} onChange={handleClienteChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-gray-600">Contraseña nueva</label>
                      <input
                        type="password"
                        name="password"
                        value={clienteForm.password}
                        onChange={handleClienteChange}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
                        placeholder="Dejar en blanco para no cambiarla"
                      />
                    </div>
                  </div>
                </section>

                <aside className="space-y-6">
                  <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                    <h3 className="mb-4 text-lg font-bold text-gray-800">Resumen</h3>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Email</span>
                        <span className="text-right font-medium text-gray-700">{cliente.email}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Teléfono</span>
                        <span className="text-right font-medium text-gray-700">{cliente.telefono || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Empresa</span>
                        <span className="text-right font-medium text-gray-700">{cliente.empresa || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">NIF</span>
                        <span className="text-right font-medium text-gray-700">{cliente.nif || "—"}</span>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                    <h3 className="mb-4 text-lg font-bold text-gray-800">Dirección principal</h3>
                    {cliente.direccionPrincipal ? (
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="font-semibold text-gray-800">{cliente.direccionPrincipal.alias}</div>
                        <div>{cliente.direccionPrincipal.direccion}</div>
                        <div>
                          {cliente.direccionPrincipal.codigoPostal} · {cliente.direccionPrincipal.ciudad}
                        </div>
                        <div>
                          {cliente.direccionPrincipal.provincia} · {cliente.direccionPrincipal.pais}
                        </div>
                        <div>{cliente.direccionPrincipal.telefono || "—"}</div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No hay una dirección principal guardada.</p>
                    )}
                  </section>
                </aside>
              </div>
            )}

            {activeTab === "direcciones" && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Libreta de direcciones</h2>
                      <p className="text-sm text-gray-500">Añade varias direcciones y marca una como principal.</p>
                    </div>
                    <button
                      onClick={resetDireccionForm}
                      className="rounded-xl bg-[#6BAEC9]/10 px-4 py-2 font-semibold text-[#6BAEC9] transition hover:bg-[#6BAEC9]/20"
                    >
                      + Nueva dirección
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Total</div>
                      <div className="mt-1 text-2xl font-bold text-gray-800">{direcciones.length}</div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Principal</div>
                      <div className="mt-1 text-lg font-bold text-[#6BAEC9]">{direccionPrincipal?.alias || "—"}</div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Marcadas</div>
                      <div className="mt-1 text-2xl font-bold text-green-600">{direccionesPrincipales}</div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Última</div>
                      <div className="mt-1 text-sm font-bold text-gray-800">{direccionPrincipal?.updatedAt ? formatDate(direccionPrincipal.updatedAt) : "—"}</div>
                    </div>
                  </div>

                  {direcciones.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                      <p className="text-gray-500">Este cliente aún no tiene direcciones guardadas.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {direcciones.map((direccion) => (
                        <article key={direccion.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-gray-800">{direccion.alias}</h3>
                                {direccion.predeterminada && (
                                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">Principal</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{direccion.nombre} {direccion.apellidos || ""}</p>
                            </div>
                            <button
                              onClick={() => editarDireccion(direccion)}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                            >
                              Editar
                            </button>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <p>{direccion.direccion}</p>
                            <p>{direccion.complemento || "—"}</p>
                            <p>
                              {direccion.codigoPostal} · {direccion.ciudad}
                            </p>
                            <p>
                              {direccion.provincia} · {direccion.pais}
                            </p>
                            <p>{direccion.telefono || "—"}</p>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3 text-sm">
                            {!direccion.predeterminada && (
                              <button onClick={() => handleSetDefaultDireccion(direccion.id)} className="font-semibold text-emerald-600 hover:text-emerald-800">
                                Hacer principal
                              </button>
                            )}
                            <button onClick={() => handleDeleteDireccion(direccion.id)} className="font-semibold text-red-600 hover:text-red-800">
                              Borrar
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">
                        {editingDireccionId ? "Editar dirección" : "Nueva dirección"}
                      </h3>
                      <p className="text-sm text-gray-500">Formulario adaptable para móvil y tablet.</p>
                    </div>
                    {editingDireccionId && (
                      <button onClick={resetDireccionForm} className="text-sm font-semibold text-gray-500 hover:text-gray-700">
                        Cancelar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-600">Alias</label>
                      <input name="alias" value={direccionForm.alias} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-600">Nombre</label>
                        <input name="nombre" value={direccionForm.nombre} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-600">Apellidos</label>
                        <input name="apellidos" value={direccionForm.apellidos} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-600">Empresa</label>
                        <input name="empresa" value={direccionForm.empresa} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-600">NIF</label>
                        <input name="nif" value={direccionForm.nif} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-600">Teléfono</label>
                        <input name="telefono" value={direccionForm.telefono} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-600">Código postal</label>
                        <input name="codigoPostal" value={direccionForm.codigoPostal} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-600">Dirección</label>
                      <input name="direccion" value={direccionForm.direccion} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-600">Dirección 2</label>
                      <input name="direccionComplementaria" value={direccionForm.direccionComplementaria} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-600">Ciudad</label>
                        <input name="ciudad" value={direccionForm.ciudad} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-600">Provincia</label>
                        <input name="provincia" value={direccionForm.provincia} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-600">País</label>
                      <input name="pais" value={direccionForm.pais} onChange={handleDireccionChange} className="w-full rounded-xl border border-gray-300 px-3 py-2.5" />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        name="predeterminada"
                        checked={direccionForm.predeterminada}
                        onChange={handleDireccionChange}
                      />
                      Marcar como predeterminada
                    </label>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "pedidos" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Pedidos del cliente</h2>
                  <p className="text-sm text-gray-500">Historial de compras y estado actual.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-gray-400">Pedidos</div>
                    <div className="mt-1 text-2xl font-bold text-gray-800">{pedidos.length}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-gray-400">Pendientes</div>
                    <div className="mt-1 text-2xl font-bold text-yellow-600">{pedidosPendientes}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-gray-400">Entregados</div>
                    <div className="mt-1 text-2xl font-bold text-green-600">{pedidosEntregados}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-gray-400">Total</div>
                    <div className="mt-1 text-lg font-bold text-[#F7A38B]">{pedidosTotal.toFixed(2)} €</div>
                  </div>
                </div>

                {pedidos.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                    <p className="text-gray-500">No hay pedidos registrados para este cliente.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:hidden">
                      {pedidos.map((pedido) => (
                        <button
                          key={pedido.id}
                          onClick={() => router.push(`/admin/pedidos/${pedido.id}`)}
                          className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-mono text-sm text-[#6BAEC9]">{pedido.numeroPedido}</p>
                              <p className="text-sm text-gray-500">{formatDate(pedido.fechaPedido)}</p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                              pedido.estado === "ENTREGADO"
                                ? "bg-green-100 text-green-700"
                                : pedido.estado === "PENDIENTE"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}>
                              {pedido.estado}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-gray-500">Total</span>
                            <span className="font-semibold text-[#F7A38B]">{Number(pedido.totalFinal || 0).toFixed(2)} €</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full text-sm">
                        <thead className="bg-[#F8F8F5]">
                          <tr>
                            <th className="px-4 py-3 text-left">Pedido</th>
                            <th className="px-4 py-3 text-center">Fecha</th>
                            <th className="px-4 py-3 text-center">Total (€)</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pedidos.map((pedido) => (
                            <tr
                              key={pedido.id}
                              className="cursor-pointer border-t hover:bg-[#F8F8F5]"
                              onClick={() => router.push(`/admin/pedidos/${pedido.id}`)}
                            >
                              <td className="px-4 py-3 font-mono text-[#6BAEC9]">{pedido.numeroPedido}</td>
                              <td className="px-4 py-3 text-center">{formatDate(pedido.fechaPedido)}</td>
                              <td className="px-4 py-3 text-center font-semibold text-[#F7A38B]">{Number(pedido.totalFinal || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                                  pedido.estado === "ENTREGADO"
                                    ? "bg-green-100 text-green-700"
                                    : pedido.estado === "PENDIENTE"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-gray-100 text-gray-700"
                                }`}>
                                  {pedido.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
