"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw, Save, Upload, Trash2, ChevronLeft, ChevronRight, Eye, EyeOff, Check, AlertCircle, Clock } from "lucide-react";
import { getDefaultModulesConfig, getModuleDefinition, type ModuleDefinition } from "@/lib/moduleRegistry";

type Tab = "cuenta" | "invitaciones" | "resenas" | "sincronizacion" | "mapeos";

export default function ReviModulePage() {
  const moduleDef = getModuleDefinition("revi");
  const [config, setConfig] = useState<Record<string, any>>(getDefaultModulesConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("cuenta");
  const [showApiKey, setShowApiKey] = useState(false);

  const [importing, setImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [mapeos, setMapeos] = useState<any[]>([]);
  const [mapeoLoading, setMapeoLoading] = useState(false);
  const [mapeoPage, setMapeoPage] = useState(1);
  const [mapeoTotal, setMapeoTotal] = useState(0);
  const [mapeoPages, setMapeoPages] = useState(0);
  const mapeoLimit = 25;

  const [syncStats, setSyncStats] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [estadosDisponibles, setEstadosDisponibles] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [configRes, estadosRes] = await Promise.all([
          fetch("/api/modulos/configuracion", { cache: "no-store" }),
          fetch("/api/admin/revi/estados", { cache: "no-store" })
        ]);

        const configData = await configRes.json();
        const estadosData = await estadosRes.json();

        if (!active) return;
        setConfig(configData.config ?? getDefaultModulesConfig());
        if (estadosData.ok) {
          setEstadosDisponibles(estadosData.estados);
        }
      } catch (error: any) {
        toast.error(error.message || "No se ha podido cargar el módulo");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab === "mapeos") {
      loadMapeos(1);
    }
    if (activeTab === "sincronizacion") {
      loadSyncStats();
    }
  }, [activeTab]);

  async function loadMapeos(page: number) {
    setMapeoLoading(true);
    try {
      const res = await fetch(`/api/admin/revi/mapeo?page=${page}&limit=${mapeoLimit}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setMapeos(data.mapeos);
        setMapeoTotal(data.pagination.total);
        setMapeoPages(data.pagination.pages);
        setMapeoPage(page);
      }
    } catch (error: any) {
      toast.error("Error cargando mapeos");
    } finally {
      setMapeoLoading(false);
    }
  }

  async function loadSyncStats() {
    try {
      const res = await fetch("/api/admin/revi/sincronizacion", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setSyncStats(data);
      }
    } catch (error: any) {
      console.error("Error loading sync stats:", error);
    }
  }

  const moduleState = useMemo(() => {
    if (!moduleDef) return null;
    return config[moduleDef.slug] ?? moduleDef.defaults;
  }, [config, moduleDef]);

  if (!moduleDef) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">Módulo no encontrado.</div>;
  }

  async function save() {
    setSaving(true);
    try {
      if (!moduleDef) {
        toast.error("Módulo no disponible");
        setSaving(false);
        return;
      }
      const nextConfig = { ...config, [moduleDef.slug]: moduleState };
      const res = await fetch("/api/modulos/configuracion", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: nextConfig }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se ha podido guardar");
      setConfig(data.config ?? nextConfig);
      toast.success("Módulo guardado");
    } catch (error: any) {
      toast.error(error.message || "Error guardando módulo");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!moduleDef) {
      toast.error("Módulo no disponible");
      return;
    }
    const nextConfig = { ...config, [moduleDef.slug]: moduleDef.defaults };
    setConfig(nextConfig);
    const res = await fetch("/api/modulos/configuracion", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: nextConfig }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      toast.error(data.error || "No se ha podido reinicializar");
      return;
    }
    toast.success("Configuración restaurada");
  }

  async function importMapeo() {
    if (!csvFile) {
      toast.error("Selecciona un archivo CSV");
      return;
    }

    setImporting(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      const mapeos = lines
        .slice(1)
        .map(line => {
          const [idPrestashopStr, referencia] = line.split(/[,;]/).map(s => s.trim());
          const idPrestashop = parseInt(idPrestashopStr, 10);
          return { idPrestashop, referencia };
        })
        .filter(m => !isNaN(m.idPrestashop) && m.referencia && m.referencia.length > 0);

      if (mapeos.length === 0) {
        toast.error("No se encontraron mapeos válidos en el CSV");
        return;
      }

      const res = await fetch("/api/admin/revi/mapeo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapeos })
      });

      const data = await res.json();

      if (data.ok) {
        toast.success(`✅ Importados ${data.importedCount} mapeos`);
        setCsvFile(null);
        await loadMapeos(1);
      } else {
        toast.error(data.error || "Error importando CSV");
      }
    } catch (error: any) {
      toast.error("Error procesando CSV: " + error.message);
    } finally {
      setImporting(false);
    }
  }

  async function deleteMapeo(id: number) {
    if (!confirm("¿Eliminar este mapeo?")) return;

    try {
      const res = await fetch(`/api/admin/revi/mapeo?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success("Mapeo eliminado");
        await loadMapeos(mapeoPage);
      } else {
        toast.error(data.error || "Error eliminando mapeo");
      }
    } catch (error: any) {
      toast.error("Error eliminando mapeo: " + error.message);
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/revi/sincronizacion", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast.success(`✅ Sincronizados ${data.enviados} pedidos`);
        await loadSyncStats();
      } else {
        toast.error(data.error || "Error sincronizando");
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">Cargando módulo...</div>;
  }

  const apiKeySet = moduleState?.apiKey && moduleState.apiKey.length > 0;
  const isConnected = apiKeySet && moduleState?.shopId && moduleState.shopId.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <Link href="/admin/personalizar/modulos" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver a módulos
          </Link>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{moduleDef.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{moduleDef.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Reinicializar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {/* Panel de estado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-lg border p-4 ${isConnected ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            {isConnected ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
            <span className={`font-semibold ${isConnected ? 'text-green-900 dark:text-green-300' : 'text-gray-700 dark:text-gray-400'}`}>Conectado</span>
          </div>
          <p className={`text-sm ${isConnected ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-500'}`}>
            {isConnected ? 'API REVI verificada' : 'Configure API Key'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="font-semibold text-gray-900 dark:text-gray-300">Invitaciones activas</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{moduleState?.triggerStates?.length || 1} estado(s) configurado(s)</p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-gray-300">Sincronización</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{syncStats?.pedidosPendientes || 0} pedidos pendientes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-t-3xl border border-b-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg">
        <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
          {([
            { id: "cuenta", label: "Cuenta" },
            { id: "invitaciones", label: "Invitaciones" },
            { id: "resenas", label: "Reseñas" },
            { id: "sincronizacion", label: "Sincronización" },
            { id: "mapeos", label: "Mapeos" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary dark:border-primary dark:text-primary"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Cuenta */}
          {activeTab === "cuenta" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">API Key</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={moduleState?.apiKey ?? ""}
                      onChange={(e) => setConfig((prev) => ({
                        ...prev,
                        [moduleDef.slug]: { ...(prev[moduleDef.slug] ?? {}), apiKey: e.target.value }
                      }))}
                      className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
                      placeholder="sk_live_..."
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {apiKeySet && <p className="text-xs text-green-600 dark:text-green-400 mt-2">✓ API KEY GUARDADA</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Shop ID</label>
                <input
                  type="text"
                  value={moduleState?.shopId ?? ""}
                  onChange={(e) => setConfig((prev) => ({
                    ...prev,
                    [moduleDef.slug]: { ...(prev[moduleDef.slug] ?? {}), shopId: e.target.value }
                  }))}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
                  placeholder="tu_shop_id"
                />
              </div>

              <div>
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                  <input
                    type="checkbox"
                    checked={Boolean(moduleState?.activa)}
                    onChange={(e) => setConfig((prev) => ({
                      ...prev,
                      [moduleDef.slug]: { ...(prev[moduleDef.slug] ?? {}), activa: e.target.checked }
                    }))}
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Módulo activo</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                  <input
                    type="checkbox"
                    checked={Boolean(moduleState?.autoInvite)}
                    onChange={(e) => setConfig((prev) => ({
                      ...prev,
                      [moduleDef.slug]: { ...(prev[moduleDef.slug] ?? {}), autoInvite: e.target.checked }
                    }))}
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Invitación automática</span>
                </label>
              </div>
            </div>
          )}

          {/* Invitaciones */}
          {activeTab === "invitaciones" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">CUÁNDO PEDIR LA RESEÑA</h3>

                <div className="mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Estados que disparan la invitación</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {(moduleState?.triggerStates || ["CUESTIONARIO"]).map((state: string) => (
                      <span key={state} className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 text-sm font-medium flex items-center gap-2">
                        {state}
                        <button
                          onClick={() => setConfig((prev) => ({
                            ...prev,
                            [moduleDef.slug]: {
                              ...(prev[moduleDef.slug] ?? {}),
                              triggerStates: (prev[moduleDef.slug]?.triggerStates || []).filter((s: string) => s !== state)
                            }
                          }))}
                          className="text-green-600 dark:text-green-400 hover:font-bold"
                          title="Eliminar"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value && !moduleState?.triggerStates?.includes(value)) {
                        setConfig((prev) => ({
                          ...prev,
                          [moduleDef.slug]: {
                            ...(prev[moduleDef.slug] ?? {}),
                            triggerStates: [...(prev[moduleDef.slug]?.triggerStates || []), value]
                          }
                        }));
                        e.target.value = "";
                      }
                    }}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  >
                    <option value="">+ Añadir estado...</option>
                    {estadosDisponibles.map((state) => (
                      <option key={state} value={state} disabled={moduleState?.triggerStates?.includes(state)}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Estados que nunca la disparan</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {(moduleState?.excludedStates || ["CANCELADO", "DEVUELTO"]).map((state: string) => (
                      <span key={state} className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 text-sm font-medium flex items-center gap-2">
                        {state}
                        <button
                          onClick={() => setConfig((prev) => ({
                            ...prev,
                            [moduleDef.slug]: {
                              ...(prev[moduleDef.slug] ?? {}),
                              excludedStates: (prev[moduleDef.slug]?.excludedStates || []).filter((s: string) => s !== state)
                            }
                          }))}
                          className="text-red-600 dark:text-red-400 hover:font-bold"
                          title="Eliminar"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value && !moduleState?.excludedStates?.includes(value)) {
                        setConfig((prev) => ({
                          ...prev,
                          [moduleDef.slug]: {
                            ...(prev[moduleDef.slug] ?? {}),
                            excludedStates: [...(prev[moduleDef.slug]?.excludedStates || []), value]
                          }
                        }));
                        e.target.value = "";
                      }
                    }}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  >
                    <option value="">+ Añadir estado...</option>
                    {estadosDisponibles.map((state) => (
                      <option key={state} value={state} disabled={moduleState?.excludedStates?.includes(state)}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Reseñas */}
          {activeTab === "resenas" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">DÓNDE SE VEN LAS RESEÑAS</h3>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                    <input
                      type="checkbox"
                      checked={Boolean(moduleState?.showOnProduct)}
                      onChange={(e) => setConfig((prev) => ({
                        ...prev,
                        [moduleDef.slug]: { ...(prev[moduleDef.slug] ?? {}), showOnProduct: e.target.checked }
                      }))}
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Ficha de producto</span>
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                    <input
                      type="checkbox"
                      checked={Boolean(moduleState?.showOnListings)}
                      onChange={(e) => setConfig((prev) => ({
                        ...prev,
                        [moduleDef.slug]: { ...(prev[moduleDef.slug] ?? {}), showOnListings: e.target.checked }
                      }))}
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Listados (categorías, búsqueda)</span>
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                    <input
                      type="checkbox"
                      checked={Boolean(moduleState?.showOnEmpty)}
                      onChange={(e) => setConfig((prev) => ({
                        ...prev,
                        [moduleDef.slug]: { ...(prev[moduleDef.slug] ?? {}), showOnEmpty: e.target.checked }
                      }))}
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Mostrar en productos sin reseñas</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Sincronización */}
          {activeTab === "sincronizacion" && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Estado de sincronización</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Pedidos pendientes: <strong>{syncStats?.pedidosPendientes || 0}</strong>
                </p>
              </div>

              <button
                onClick={syncNow}
                disabled={syncing || !isConnected}
                className="rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 px-6 py-3 text-sm font-semibold text-white inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> {syncing ? "Sincronizando..." : "Lanzar ahora"}
              </button>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Sincronización automática</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Ejecuta este comando cada 24h para sincronizar automáticamente:
                </p>
                <code className="block text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto whitespace-nowrap">
                  curl -X POST {process.env.NEXT_PUBLIC_APP_URL}/api/admin/revi/sincronizacion
                </code>
              </div>
            </div>
          )}

          {/* Mapeos */}
          {activeTab === "mapeos" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Importar Mapeo PrestaShop</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  CSV con columnas: <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">IdPrestashop,Referencia</code>
                </p>

                <div className="space-y-4 mb-6">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900"
                  />

                  <div className="flex gap-3 items-center">
                    <button
                      onClick={importMapeo}
                      disabled={importing || !csvFile}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white"
                    >
                      <Upload className="w-4 h-4" /> {importing ? "Importando..." : "Importar CSV"}
                    </button>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Total: <strong>{mapeoTotal}</strong> mapeos
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Gestión de Mapeos</h3>

                {mapeoLoading && <p className="text-gray-500 dark:text-gray-400">Cargando...</p>}

                {!mapeoLoading && mapeos.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400">No hay mapeos importados aún.</p>
                )}

                {!mapeoLoading && mapeos.length > 0 && (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">ID Prestashop</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Referencia</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Producto Vinculado</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mapeos.map((mapeo) => (
                            <tr key={mapeo.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                              <td className="py-3 px-4 text-gray-700 dark:text-gray-300 font-mono">{mapeo.idPrestashop}</td>
                              <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{mapeo.referencia}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                {mapeo.producto ? (
                                  <span className="text-green-700 dark:text-green-400">✓ {mapeo.producto.nombre}</span>
                                ) : (
                                  <span className="text-gray-400 italic">Sin vincular</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => deleteMapeo(mapeo.id)}
                                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {mapeoPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                          onClick={() => loadMapeos(mapeoPage - 1)}
                          disabled={mapeoPage === 1}
                          className="p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Página <strong>{mapeoPage}</strong> de <strong>{mapeoPages}</strong>
                        </div>
                        <button
                          onClick={() => loadMapeos(mapeoPage + 1)}
                          disabled={mapeoPage === mapeoPages}
                          className="p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 border-t-0 rounded-b-3xl p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">ℹ️ Información de Integración</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>Cuando actives el módulo, los pedidos en estado CUESTIONARIO enviarán solicitudes de valoración a REVI</li>
          <li>El mapeo vincula productos PrestaShop con las referencias para mantener reseñas históricas</li>
          <li>Obtén API Key y Shop ID de <a href="https://developers.revi.io" target="_blank" rel="noopener noreferrer" className="underline">developers.revi.io</a></li>
        </ul>
      </div>
    </div>
  );
}
