"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Save, Plus, Trash2, ArrowLeft, Pencil, X, Check } from "lucide-react";
import Link from "next/link";

interface ConfigPedidos {
  "pedidos.montoMinimo": string;
  "pedidos.pedidoExpresoInvitado": string;
  "pedidos.terminosServicio": string;
  "pedidos.terminosPaginaSlug": string;
  "pedidos.resumenFinal": string;
  "pedidos.envioAplazado": string;
  "pedidos.volverAPedir": string;
  "pedidos.recalcularEnvio": string;
  "pedidos.enviarRegalo": string;
  "pedidos.precioEmbalaje": string;
  "pedidos.embalajeReciclado": string;
}

interface RefSettings {
  prefijo: string;
  separador: string;
  padding: number;
  incluirAno: boolean;
  ultimoNumero: number | null;
}

interface RefInfo {
  settings: RefSettings;
  maxSecuencia: number;
  proximoNumero: number;
  preview: string;
  year: number;
}

interface EstadoPedido {
  id: number;
  clave: string;
  nombre: string;
  color: string;
  icono?: string | null;
  orden: number;
  activo: boolean;
  enviarEmail: boolean;
  plantillaEmail?: string | null;
  esEntrega: boolean;
  esFactura: boolean;
  considerarValidado: boolean;
  permitirFacturaPDF: boolean;
  ocultarEstado: boolean;
  adjuntarFacturaPDF: boolean;
  adjuntarAlbaranPDF: boolean;
  establecerEnviado: boolean;
  establecerPagado: boolean;
}

const CORE_CLAVES = ["PENDIENTE", "PROCESANDO", "ENVIADO", "ENTREGADO", "CANCELADO", "DEVUELTO"];

const DEFAULT_CONFIG: ConfigPedidos = {
  "pedidos.montoMinimo": "0",
  "pedidos.pedidoExpresoInvitado": "true",
  "pedidos.terminosServicio": "false",
  "pedidos.terminosPaginaSlug": "",
  "pedidos.resumenFinal": "false",
  "pedidos.envioAplazado": "false",
  "pedidos.volverAPedir": "true",
  "pedidos.recalcularEnvio": "true",
  "pedidos.enviarRegalo": "false",
  "pedidos.precioEmbalaje": "0",
  "pedidos.embalajeReciclado": "false",
};

const EMPTY_ESTADO: EstadoPedido = {
  id: 0,
  clave: "",
  nombre: "",
  color: "#6b7280",
  icono: null,
  orden: 99,
  activo: true,
  enviarEmail: false,
  plantillaEmail: null,
  esEntrega: false,
  esFactura: false,
  considerarValidado: false,
  permitirFacturaPDF: false,
  ocultarEstado: false,
  adjuntarFacturaPDF: false,
  adjuntarAlbaranPDF: false,
  establecerEnviado: false,
  establecerPagado: false,
};

export default function ConfiguracionPedidosPage() {
  const [tab, setTab] = useState<"config" | "estados" | "numeracion">("config");
  const [config, setConfig] = useState<ConfigPedidos>(DEFAULT_CONFIG);
  const [estados, setEstados] = useState<EstadoPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEstado, setEditingEstado] = useState<EstadoPedido | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Numeración
  const [refInfo, setRefInfo] = useState<RefInfo | null>(null);
  const [refDraft, setRefDraft] = useState<RefSettings & { ultimoNumeroDraft: string }>({
    prefijo: "PED", separador: "-", padding: 4, incluirAno: true, ultimoNumero: null, ultimoNumeroDraft: "",
  });
  const [refSaving, setRefSaving] = useState(false);
  const [refError, setRefError] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [configRes, estadosRes, refRes] = await Promise.all([
        fetch("/api/admin/configuracion/pedidos"),
        fetch("/api/admin/pedidos/estados"),
        fetch("/api/admin/pedidos/referencia"),
      ]);
      const configData = await configRes.json();
      const estadosData = await estadosRes.json();
      const refData = await refRes.json();
      setConfig({ ...DEFAULT_CONFIG, ...configData.config });
      setEstados(estadosData.estados ?? []);
      if (refData.settings) {
        setRefInfo(refData);
        setRefDraft({
          ...refData.settings,
          ultimoNumeroDraft: refData.settings.ultimoNumero != null ? String(refData.settings.ultimoNumero) : "",
        });
      }
    } catch {
      toast.error("Error cargando configuración");
    } finally {
      setLoading(false);
    }
  }

  async function saveRef() {
    setRefSaving(true);
    setRefError("");
    try {
      const body: Record<string, unknown> = {
        prefijo:    refDraft.prefijo,
        separador:  refDraft.separador,
        padding:    refDraft.padding,
        incluirAno: refDraft.incluirAno,
      };
      // Solo enviamos ultimoNumero si el campo tiene valor
      if (refDraft.ultimoNumeroDraft.trim() !== "") {
        body.ultimoNumero = parseInt(refDraft.ultimoNumeroDraft);
      } else {
        body.ultimoNumero = null;
      }

      const res = await fetch("/api/admin/pedidos/referencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error guardando");
      setRefInfo(data);
      setRefDraft({
        ...data.settings,
        ultimoNumeroDraft: data.settings.ultimoNumero != null ? String(data.settings.ultimoNumero) : "",
      });
      toast.success("Configuración de numeración guardada");
    } catch (e: any) {
      setRefError(e.message);
    } finally {
      setRefSaving(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/configuracion/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error guardando");
      toast.success("Configuración guardada");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEstado() {
    if (!editingEstado) return;

    if (!editingEstado.nombre?.trim()) {
      toast.error("El nombre del estado es obligatorio");
      return;
    }
    if (!editingEstado.clave?.trim()) {
      toast.error("La clave interna es obligatoria");
      return;
    }

    setSaving(true);
    try {
      const url = isNew
        ? "/api/admin/pedidos/estados"
        : `/api/admin/pedidos/estados/${editingEstado.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEstado),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      if (!data.ok) throw new Error(data.error ?? "Error guardando");
      toast.success("Estado guardado");
      setEditingEstado(null);
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEstado(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("¿Eliminar este estado?")) return;
    try {
      const res = await fetch(`/api/admin/pedidos/estados/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error eliminando");
      toast.success("Estado eliminado");
      loadAll();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const bool = (key: keyof ConfigPedidos) => config[key] === "true";
  const setB = (key: keyof ConfigPedidos, v: boolean) =>
    setConfig((prev) => ({ ...prev, [key]: v ? "true" : "false" }));

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <Link
            href="/admin/pedidos"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a pedidos
          </Link>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Configuración de pedidos
          </h1>
        </div>

        <div className="flex gap-2">
          {tab === "config" && (
            <button
              onClick={saveConfig}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar"}
            </button>
          )}
          {tab === "numeracion" && (
            <button
              onClick={saveRef}
              disabled={refSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {refSaving ? "Guardando..." : "Guardar"}
            </button>
          )}
          {tab === "estados" && !editingEstado && (
            <button
              onClick={() => {
                setIsNew(true);
                setEditingEstado({ ...EMPTY_ESTADO });
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Añadir estado
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {(
          [
            { id: "config",     label: "Configuración de Pedidos" },
            { id: "numeracion", label: "Numeración" },
            { id: "estados",    label: "Estados" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setEditingEstado(null);
            }}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Configuración ── */}
      {tab === "config" && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Configuración</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Ajustes generales del proceso de compra.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle
                label="Habilitar resumen final en el checkout"
                checked={bool("pedidos.resumenFinal")}
                onChange={(v) => setB("pedidos.resumenFinal", v)}
              />
              <Toggle
                label="Pedido express para cuentas de invitado"
                checked={bool("pedidos.pedidoExpresoInvitado")}
                onChange={(v) => setB("pedidos.pedidoExpresoInvitado", v)}
              />
              <Toggle
                label="Activar opción «Volver a pedir»"
                checked={bool("pedidos.volverAPedir")}
                onChange={(v) => setB("pedidos.volverAPedir", v)}
              />
              <Toggle
                label="Recalcular envío al modificar pedido"
                checked={bool("pedidos.recalcularEnvio")}
                onChange={(v) => setB("pedidos.recalcularEnvio", v)}
              />
              <Toggle
                label="Envío aplazado"
                checked={bool("pedidos.envioAplazado")}
                onChange={(v) => setB("pedidos.envioAplazado", v)}
              />
              <Toggle
                label="Términos del servicio obligatorios"
                checked={bool("pedidos.terminosServicio")}
                onChange={(v) => setB("pedidos.terminosServicio", v)}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Cantidad mínima de compra (€, 0 = sin mínimo)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config["pedidos.montoMinimo"]}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, "pedidos.montoMinimo": e.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
                />
              </div>
              {bool("pedidos.terminosServicio") && (
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Slug de la página de términos (CMS)
                  </label>
                  <input
                    type="text"
                    placeholder="terminos-y-condiciones"
                    value={config["pedidos.terminosPaginaSlug"]}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        "pedidos.terminosPaginaSlug": e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              Opciones de regalo
            </h2>
            <div className="grid gap-3 md:grid-cols-2 mb-4">
              <Toggle
                label="Permitir envolver como regalo"
                checked={bool("pedidos.enviarRegalo")}
                onChange={(v) => setB("pedidos.enviarRegalo", v)}
              />
              <Toggle
                label="Proponer embalaje reciclado"
                checked={bool("pedidos.embalajeReciclado")}
                onChange={(v) => setB("pedidos.embalajeReciclado", v)}
              />
            </div>
            {bool("pedidos.enviarRegalo") && (
              <div className="max-w-xs">
                <label className="block text-sm text-gray-500 mb-1">
                  Precio del embalaje de regalo (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config["pedidos.precioEmbalaje"]}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, "pedidos.precioEmbalaje": e.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
                />
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Tab: Numeración ── */}
      {tab === "numeracion" && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Formato de la referencia</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Define cómo se genera automáticamente el número de pedido. Ejemplo: <strong>PED-2026-0042</strong>
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Prefijo</label>
                <input
                  type="text"
                  value={refDraft.prefijo}
                  onChange={(e) => setRefDraft((p) => ({ ...p, prefijo: e.target.value.toUpperCase().replace(/\s/g,"") }))}
                  placeholder="PED"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Separador</label>
                <input
                  type="text"
                  value={refDraft.separador}
                  onChange={(e) => setRefDraft((p) => ({ ...p, separador: e.target.value.slice(0,3) }))}
                  placeholder="-"
                  maxLength={3}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Dígitos del número</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={refDraft.padding}
                  onChange={(e) => setRefDraft((p) => ({ ...p, padding: Math.max(1, parseInt(e.target.value) || 4) }))}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Ceros a la izquierda (ej: 4 → 0042)</p>
              </div>
              <div className="flex items-center">
                <Toggle
                  label="Incluir año"
                  checked={refDraft.incluirAno}
                  onChange={(v) => setRefDraft((p) => ({ ...p, incluirAno: v }))}
                />
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-5 py-4 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vista previa del próximo pedido</p>
              <p className="font-mono text-xl font-bold text-primary">
                {refDraft.prefijo || "PED"}
                {refDraft.separador}
                {refDraft.incluirAno ? `${new Date().getFullYear()}${refDraft.separador}` : ""}
                {String(Math.max((refInfo?.maxSecuencia ?? 0) + 1, (refDraft.ultimoNumero ?? 0) + 1)).padStart(refDraft.padding, "0")}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Contador de secuencia</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              El sistema detecta automáticamente el último número utilizado. Puedes ajustarlo manualmente si, por ejemplo, has eliminado un pedido y quieres reutilizar su número.
            </p>

            <div className="flex flex-wrap items-start gap-6 mb-4">
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-5 py-4">
                <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">Último número detectado</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{refInfo?.maxSecuencia ?? "—"}</p>
                <p className="text-xs text-blue-400 mt-1">Año {refInfo?.year ?? new Date().getFullYear()}</p>
              </div>
              <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 px-5 py-4">
                <p className="text-xs text-green-500 font-semibold uppercase tracking-wide mb-1">Próximo pedido</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {Math.max((refInfo?.maxSecuencia ?? 0) + 1, (refDraft.ultimoNumero ?? 0) + 1)}
                </p>
                <p className="text-xs text-green-400 mt-1">Número de secuencia</p>
              </div>
            </div>

            <div className="max-w-xs">
              <label className="block text-sm text-gray-500 mb-1">
                Establecer último número manualmente
              </label>
              <input
                type="number"
                min={refInfo?.maxSecuencia ?? 0}
                value={refDraft.ultimoNumeroDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  setRefDraft((p) => ({
                    ...p,
                    ultimoNumeroDraft: v,
                    ultimoNumero: v.trim() !== "" ? parseInt(v) : null,
                  }));
                }}
                placeholder={`Mínimo: ${refInfo?.maxSecuencia ?? 0}`}
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                Dejar en blanco para usar la detección automática.
                {refInfo && refInfo.maxSecuencia > 0 && (
                  <> El mínimo permitido es <strong>{refInfo.maxSecuencia}</strong> (último pedido existente).</>
                )}
              </p>
            </div>

            {refError && (
              <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {refError}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Tab: Estados ── */}
      {tab === "estados" && (
        <div className="space-y-4">
          {editingEstado ? (
            <EstadoForm
              estado={editingEstado}
              isNew={isNew}
              saving={saving}
              onChange={setEditingEstado}
              onSave={saveEstado}
              onCancel={() => setEditingEstado(null)}
            />
          ) : (
            <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Estados &mdash; {estados.length}
                </span>
                <p className="text-xs text-gray-400">
                  Los estados marcados con candado son del sistema y no se pueden eliminar.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-white/5">
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Nombre</th>
                      <th className="px-4 py-3 font-medium">Clave</th>
                      <th className="px-4 py-3 font-medium text-center">Email</th>
                      <th className="px-4 py-3 font-medium text-center">Entrega</th>
                      <th className="px-4 py-3 font-medium text-center">Factura PDF</th>
                      <th className="px-4 py-3 font-medium text-center">Pagado</th>
                      <th className="px-4 py-3 font-medium text-center">Activo</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {estados.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => {
                          setIsNew(false);
                          setEditingEstado(e);
                        }}
                      >
                        <td className="px-4 py-3 text-gray-400 text-xs">{e.id}</td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                            style={{ backgroundColor: e.color }}
                          >
                            {e.nombre}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{e.clave}</td>
                        <td className="px-4 py-3 text-center">
                          {e.enviarEmail ? (
                            <Check className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.esEntrega ? (
                            <Check className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.permitirFacturaPDF ? (
                            <Check className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.establecerPagado ? (
                            <Check className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.activo ? (
                            <Check className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            <button
                              title="Editar"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setIsNew(false);
                                setEditingEstado(e);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {!CORE_CLAVES.includes(e.clave) && (
                              <button
                                title="Eliminar"
                                onClick={(ev) => deleteEstado(e.id, ev)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Estado form ──────────────────────────────────────────────────────────────

function EstadoForm({
  estado,
  isNew,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  estado: EstadoPedido;
  isNew: boolean;
  saving: boolean;
  onChange: (e: EstadoPedido) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof EstadoPedido>(key: K, value: EstadoPedido[K]) =>
    onChange({ ...estado, [key]: value });
  const isCore = CORE_CLAVES.includes(estado.clave);

  // Auto-generar clave del nombre cuando cambia
  const handleNombreChange = (nombre: string) => {
    set("nombre", nombre);
    if (isNew && !isCore) {
      const generatedClave = nombre
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .substring(0, 50);
      if (generatedClave && !estado.clave) {
        set("clave", generatedClave);
      }
    }
  };

  const canSave = estado.nombre?.trim() && estado.clave?.trim();

  return (
    <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
      {/* Form header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {isNew ? "Nuevo estado" : `Editar estado: ${estado.nombre}`}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 inline-flex items-center gap-1.5"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving || !canSave}
            title={canSave ? "Guardar cambios" : "Rellena nombre y clave"}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {/* Identity */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Estado del pedido
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Nombre del estado *</label>
            <input
              type="text"
              value={estado.nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              className={`w-full rounded-2xl border px-4 py-3 text-sm ${
                estado.nombre?.trim()
                  ? "border-green-300 dark:border-green-700 bg-white dark:bg-gray-950"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950"
              }`}
              placeholder="Ej: En espera de pago"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Clave interna{isCore ? " (sistema)" : ""}{!isNew ? " (no editable)" : ""} *
            </label>
            <input
              type="text"
              value={estado.clave}
              onChange={(e) =>
                set("clave", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))
              }
              disabled={isCore || !isNew}
              className={`w-full rounded-2xl border px-4 py-3 text-sm font-mono disabled:opacity-50 ${
                estado.clave?.trim()
                  ? "border-green-300 dark:border-green-700 bg-white dark:bg-gray-950"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950"
              }`}
              placeholder="AUTO_GENERADA"
            />
            {isNew && !isCore && (
              <p className="text-xs text-gray-400 mt-1">Se genera automáticamente del nombre</p>
            )}
            {!isNew && (
              <p className="text-xs text-gray-400 mt-1">La clave no se puede cambiar después de crear el estado</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={estado.color}
                onChange={(e) => set("color", e.target.value)}
                className="w-11 h-11 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5 flex-shrink-0"
              />
              <input
                type="text"
                value={estado.color}
                onChange={(e) => set("color", e.target.value)}
                className="flex-1 min-w-0 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-3 text-sm font-mono"
                placeholder="#6b7280"
              />
              <span
                className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white whitespace-nowrap"
                style={{ backgroundColor: estado.color }}
              >
                {estado.nombre || "Vista previa"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Orden</label>
            <input
              type="number"
              min="0"
              value={estado.orden}
              onChange={(e) => set("orden", parseInt(e.target.value) || 0)}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Plantilla de correo electrónico
            </label>
            <input
              type="text"
              value={estado.plantillaEmail ?? ""}
              onChange={(e) => set("plantillaEmail", e.target.value || null)}
              placeholder="ej: payment, shipped, order_canceled…"
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Opciones</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <OptionCheck
            label="Considerar el pedido como validado"
            checked={estado.considerarValidado}
            onChange={(v) => set("considerarValidado", v)}
          />
          <OptionCheck
            label="Enviar un correo al cliente al cambiar estado"
            checked={estado.enviarEmail}
            onChange={(v) => set("enviarEmail", v)}
          />
          <OptionCheck
            label="Permitir factura PDF al cliente"
            checked={estado.permitirFacturaPDF}
            onChange={(v) => set("permitirFacturaPDF", v)}
          />
          <OptionCheck
            label="Ocultar este estado en el historial del cliente"
            checked={estado.ocultarEstado}
            onChange={(v) => set("ocultarEstado", v)}
          />
          <OptionCheck
            label="Adjuntar factura PDF al correo"
            checked={estado.adjuntarFacturaPDF}
            onChange={(v) => set("adjuntarFacturaPDF", v)}
          />
          <OptionCheck
            label="Adjuntar albarán PDF al correo"
            checked={estado.adjuntarAlbaranPDF}
            onChange={(v) => set("adjuntarAlbaranPDF", v)}
          />
          <OptionCheck
            label="Establecer el pedido como enviado"
            checked={estado.establecerEnviado}
            onChange={(v) => set("establecerEnviado", v)}
          />
          <OptionCheck
            label="Establecer el pedido como pagado"
            checked={estado.establecerPagado}
            onChange={(v) => set("establecerPagado", v)}
          />
          <OptionCheck
            label="Marcar como entregado (esEntrega)"
            checked={estado.esEntrega}
            onChange={(v) => set("esEntrega", v)}
          />
          <OptionCheck
            label="Relacionado con facturación"
            checked={estado.esFactura}
            onChange={(v) => set("esFactura", v)}
          />
          <OptionCheck
            label="Estado activo"
            checked={estado.activo}
            onChange={(v) => set("activo", v)}
          />
        </div>
      </div>
    </section>
  );
}

// ── Shared components ────────────────────────────────────────────────────────

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer select-none">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      <div className="relative inline-flex items-center flex-shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors ${
            checked ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
          }`}
        />
        <div
          className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </div>
    </label>
  );
}

function OptionCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded accent-primary flex-shrink-0"
      />
      <span className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{label}</span>
    </label>
  );
}
