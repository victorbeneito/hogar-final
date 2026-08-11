"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  Code2,
  Copy,
  Eye,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { getDefaultModulesConfig } from "@/lib/moduleRegistry";
import {
  PAGINAS_PRESET,
  normalizarConfig,
  nuevoPopup,
  type Popup,
  type PopupsConfig,
} from "@/lib/popups";

const BlogRichTextEditor = dynamic(() => import("@/components/admin/BlogRichTextEditor"), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-gray-400">Cargando editor...</div>,
});

export default function PopupsModulePage() {
  const [configGlobal, setConfigGlobal] = useState<Record<string, any>>(getDefaultModulesConfig());
  const [popupsConfig, setPopupsConfig] = useState<PopupsConfig>({ activa: false, popups: [] });
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modoHtml, setModoHtml] = useState(false);
  const [previsualizar, setPrevisualizar] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  /** Copia de lo último que se guardó, para detectar cambios pendientes. */
  const [guardado, setGuardado] = useState<string>("");
  const inputArchivo = useRef<HTMLInputElement | null>(null);

  const hayCambios = useMemo(
    () => guardado !== "" && JSON.stringify(popupsConfig) !== guardado,
    [popupsConfig, guardado]
  );

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const res = await fetch("/api/modulos/configuracion", { cache: "no-store" });
        const data = await res.json();
        if (!activo) return;
        const global = data.config ?? getDefaultModulesConfig();
        const propia = normalizarConfig(global.popups);
        setConfigGlobal(global);
        setPopupsConfig(propia);
        setGuardado(JSON.stringify(propia));
        setSeleccionado(propia.popups[0]?.id ?? null);
      } catch (error: any) {
        toast.error(error.message || "No se ha podido cargar el módulo");
      } finally {
        if (activo) setLoading(false);
      }
    }

    cargar();
    return () => {
      activo = false;
    };
  }, []);

  // Evita perder la configuración por cerrar la pestaña sin guardar.
  useEffect(() => {
    if (!hayCambios) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [hayCambios]);

  const popupActual = useMemo(
    () => popupsConfig.popups.find((p) => p.id === seleccionado) ?? null,
    [popupsConfig.popups, seleccionado]
  );

  function actualizarPopup(id: string, cambios: Partial<Popup>) {
    setPopupsConfig((prev) => ({
      ...prev,
      popups: prev.popups.map((p) => (p.id === id ? { ...p, ...cambios } : p)),
    }));
  }

  async function guardar(configAGuardar: PopupsConfig = popupsConfig) {
    setSaving(true);
    try {
      const siguiente = { ...configGlobal, popups: configAGuardar };
      const res = await fetch("/api/modulos/configuracion", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: siguiente }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se ha podido guardar");
      setConfigGlobal(data.config ?? siguiente);
      setGuardado(JSON.stringify(configAGuardar));
      toast.success("Pop-ups guardados");
    } catch (error: any) {
      toast.error(error.message || "Error guardando el módulo");
    } finally {
      setSaving(false);
    }
  }

  function crearPopup() {
    const popup = nuevoPopup();
    setPopupsConfig((prev) => ({ ...prev, popups: [...prev.popups, popup] }));
    setSeleccionado(popup.id);
  }

  function duplicarPopup(popup: Popup) {
    const base = nuevoPopup();
    // Copia toda la configuración pero con id/contador nuevos y desactivada.
    const copia: Popup = {
      ...popup,
      id: base.id,
      resetToken: base.resetToken,
      nombre: `${popup.nombre} (copia)`,
      activo: false,
      paginas: [...popup.paginas],
    };
    setPopupsConfig((prev) => ({ ...prev, popups: [...prev.popups, copia] }));
    setSeleccionado(copia.id);
  }

  function borrarPopup(popup: Popup) {
    if (!window.confirm(`¿Eliminar el pop-up "${popup.nombre}"? Esta acción no se puede deshacer.`)) return;
    const restantes = popupsConfig.popups.filter((p) => p.id !== popup.id);
    setPopupsConfig((prev) => ({ ...prev, popups: prev.popups.filter((p) => p.id !== popup.id) }));
    setSeleccionado(restantes[0]?.id ?? null);
    toast.success("Pop-up eliminado (recuerda guardar)");
  }

  function alternarPagina(popup: Popup, patron: string) {
    const yaEsta = popup.paginas.includes(patron);
    actualizarPopup(popup.id, {
      paginas: yaEsta ? popup.paginas.filter((p) => p !== patron) : [...popup.paginas, patron],
    });
  }

  async function subirImagen(popup: Popup, file: File) {
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("carpeta", "popups");

      const res = await fetch("/api/admin/upload/imagen", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "No se ha podido subir la imagen");

      actualizarPopup(popup.id, {
        html: `${popup.html}<img src="${data.url}" alt="${popup.nombre}" style="width:100%;height:auto;display:block;" />`,
      });
      toast.success("Imagen añadida al pop-up");
    } catch (error: any) {
      toast.error(error.message || "Error subiendo la imagen");
    } finally {
      setSubiendo(false);
      if (inputArchivo.current) inputArchivo.current.value = "";
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">Cargando módulo...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <Link
            href="/admin/personalizar/modulos"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a módulos
          </Link>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Pop-ups</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ventanas emergentes con imagen o HTML. Elige en qué páginas aparecen, cuándo y cuántas veces.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={popupsConfig.activa}
              onChange={(e) => setPopupsConfig((prev) => ({ ...prev, activa: e.target.checked }))}
            />
            Módulo activo
          </label>
          <button
            onClick={crearPopup}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo pop-up
          </button>
          <button
            onClick={() => guardar()}
            disabled={saving}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60 ${
              hayCambios ? "bg-red-600 animate-pulse" : "bg-primary"
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : hayCambios ? "Guardar cambios" : "Guardar"}
          </button>
        </div>
      </div>

      {hayCambios && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="flex-1">
            <strong>Tienes cambios sin guardar.</strong> Hasta que pulses «Guardar cambios» no se aplican en la
            tienda.
          </span>
          <button
            onClick={() => guardar()}
            disabled={saving}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar ahora"}
          </button>
        </div>
      )}

      {!popupsConfig.activa && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          El módulo está desactivado: no se mostrará ningún pop-up en la tienda aunque estén marcados como activos.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* ===== Listado ===== */}
        <aside className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
            Pop-ups ({popupsConfig.popups.length})
          </h2>

          {popupsConfig.popups.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Todavía no hay ninguno. Pulsa <strong>Nuevo pop-up</strong> para crear el primero.
            </p>
          ) : (
            <ul className="space-y-2">
              {popupsConfig.popups.map((popup) => (
                <li key={popup.id}>
                  <button
                    type="button"
                    onClick={() => setSeleccionado(popup.id)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                      popup.id === seleccionado
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{popup.nombre}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          popup.activo
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {popup.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-xs truncate ${
                        popup.paginas.length ? "text-gray-500 dark:text-gray-400" : "text-red-600 font-semibold"
                      }`}
                    >
                      {popup.paginas.length ? describirPaginas(popup.paginas) : "⚠ Sin páginas: no se mostrará"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ===== Ficha ===== */}
        {popupActual ? (
          <section className="space-y-6">
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <label className="block flex-1">
                  <span className="block mb-1 text-gray-500 text-sm">Nombre interno</span>
                  <input
                    type="text"
                    value={popupActual.nombre}
                    onChange={(e) => actualizarPopup(popupActual.id, { nombre: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={popupActual.activo}
                      onChange={(e) => actualizarPopup(popupActual.id, { activo: e.target.checked })}
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Activo</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => duplicarPopup(popupActual)}
                    title="Duplicar"
                    className="rounded-2xl border border-gray-200 dark:border-gray-700 px-3 py-3 text-gray-600 dark:text-gray-300"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => borrarPopup(popupActual)}
                    title="Eliminar"
                    className="rounded-2xl border border-red-200 dark:border-red-800 px-3 py-3 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white">Contenido</h3>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={inputArchivo}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) subirImagen(popupActual, file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={subiendo}
                    onClick={() => inputArchivo.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4" /> {subiendo ? "Subiendo..." : "Subir imagen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoHtml((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200"
                  >
                    <Code2 className="w-4 h-4" /> {modoHtml ? "Editor visual" : "Ver HTML"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrevisualizar(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200"
                  >
                    <Eye className="w-4 h-4" /> Vista previa
                  </button>
                </div>
              </div>

              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                Sube la imagen (por ejemplo 800×605 px) y se insertará ajustada al ancho del pop-up.
              </p>

              {modoHtml ? (
                <textarea
                  value={popupActual.html}
                  onChange={(e) => actualizarPopup(popupActual.id, { html: e.target.value })}
                  spellCheck={false}
                  className="w-full h-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 font-mono text-xs"
                  placeholder='<img src="/img/popups/vacaciones.jpg" alt="Vacaciones" />'
                />
              ) : (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <BlogRichTextEditor
                    value={popupActual.html}
                    onChange={(val) => actualizarPopup(popupActual.id, { html: val })}
                    minHeight="220px"
                  />
                </div>
              )}
            </div>

            {/* Páginas */}
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">¿En qué páginas aparece?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Marca todas las que quieras. Puedes añadir rutas sueltas abajo; el asterisco vale como comodín
                (por ejemplo <code>/productos/*</code>).
              </p>

              {popupActual.paginas.length === 0 && (
                <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
                  No has marcado ninguna página: este pop-up no aparecerá en ningún sitio.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAGINAS_PRESET.map((preset) => (
                  <label
                    key={preset.patron}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={popupActual.paginas.includes(preset.patron)}
                      onChange={() => alternarPagina(popupActual, preset.patron)}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {preset.etiqueta} <span className="text-xs text-gray-400">{preset.patron}</span>
                    </span>
                  </label>
                ))}
              </div>

              <label className="block mt-4">
                <span className="block mb-1 text-gray-500 text-sm">Otras rutas (una por línea)</span>
                <textarea
                  value={popupActual.paginas.filter((p) => !PAGINAS_PRESET.some((x) => x.patron === p)).join("\n")}
                  onChange={(e) => {
                    const extra = e.target.value
                      .split("\n")
                      .map((linea) => linea.trim())
                      .filter(Boolean);
                    const presets = popupActual.paginas.filter((p) => PAGINAS_PRESET.some((x) => x.patron === p));
                    actualizarPopup(popupActual.id, { paginas: [...presets, ...extra] });
                  }}
                  className="w-full h-24 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 font-mono text-xs"
                  placeholder={"/medidas-personalizadas\n/cms/envios"}
                />
              </label>
            </div>

            {/* Tiempos y frecuencia */}
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Tiempos y frecuencia</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CampoNumero
                  label="Retardo antes de aparecer (segundos)"
                  ayuda="Tiempo que espera desde que carga la página."
                  value={popupActual.delaySegundos}
                  onChange={(v) => actualizarPopup(popupActual.id, { delaySegundos: v })}
                />
                <CampoNumero
                  label="Duración visible (segundos)"
                  ayuda="0 = se queda hasta que el cliente lo cierre."
                  value={popupActual.duracionSegundos}
                  onChange={(v) => actualizarPopup(popupActual.id, { duracionSegundos: v })}
                />
                <CampoNumero
                  label="Veces máximas por visitante"
                  ayuda="0 = sin límite, se muestra siempre que se cumpla el intervalo."
                  value={popupActual.repeticiones}
                  onChange={(v) => actualizarPopup(popupActual.id, { repeticiones: v })}
                />
                <CampoNumero
                  label="Minutos entre apariciones"
                  ayuda="Separación mínima entre una aparición y la siguiente."
                  value={popupActual.intervaloMinutos}
                  onChange={(v) => actualizarPopup(popupActual.id, { intervaloMinutos: v })}
                />
                <label className="block">
                  <span className="block mb-1 text-gray-500 text-sm">Desde el día (opcional)</span>
                  <input
                    type="date"
                    value={popupActual.fechaInicio}
                    onChange={(e) => actualizarPopup(popupActual.id, { fechaInicio: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
                  />
                </label>
                <label className="block">
                  <span className="block mb-1 text-gray-500 text-sm">Hasta el día (opcional)</span>
                  <input
                    type="date"
                    value={popupActual.fechaFin}
                    onChange={(e) => actualizarPopup(popupActual.id, { fechaFin: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  actualizarPopup(popupActual.id, { resetToken: Math.random().toString(36).slice(2, 8) });
                  toast.success("Contador reiniciado (recuerda guardar)");
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200"
              >
                <RotateCcw className="w-4 h-4" /> Reiniciar visualizaciones
              </button>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Vuelve a poner a cero el contador de todos los visitantes: el pop-up se les mostrará de nuevo desde
                la primera vez.
              </p>
            </div>

            {/* Apariencia */}
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Apariencia</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CampoNumero
                  label="Ancho máximo (píxeles)"
                  ayuda="Para una imagen de 800×605 px deja 800."
                  value={popupActual.anchoMaximo}
                  onChange={(v) => actualizarPopup(popupActual.id, { anchoMaximo: v })}
                />
                <div className="grid gap-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={popupActual.mostrarBotonCerrar}
                      onChange={(e) => actualizarPopup(popupActual.id, { mostrarBotonCerrar: e.target.checked })}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Mostrar botón de cerrar (X)</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={popupActual.cerrarConFondo}
                      onChange={(e) => actualizarPopup(popupActual.id, { cerrarConFondo: e.target.checked })}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Cerrar al clicar fuera</span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-darkNavBg p-10 text-center text-gray-500 dark:text-gray-400">
            Crea un pop-up para empezar a configurarlo.
          </section>
        )}
      </div>

      {/* ===== Vista previa ===== */}
      {previsualizar && popupActual && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPrevisualizar(false)}
        >
          <div
            className="relative w-full max-h-[90vh] overflow-auto rounded-2xl bg-white dark:bg-darkNavBg shadow-2xl"
            style={{ maxWidth: `${popupActual.anchoMaximo || 800}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPrevisualizar(false)}
              aria-label="Cerrar vista previa"
              className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
            <div
              className="[&_img]:w-full [&_img]:h-auto [&_img]:block"
              dangerouslySetInnerHTML={{ __html: popupActual.html || "<p style='padding:2rem'>Sin contenido</p>" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Convierte los patrones de ruta en texto entendible: "/productos/*" → "Fichas de producto". */
function describirPaginas(paginas: string[]) {
  return paginas
    .map((patron) => PAGINAS_PRESET.find((p) => p.patron === patron)?.etiqueta ?? patron)
    .join(", ");
}

function CampoNumero({
  label,
  ayuda,
  value,
  onChange,
}: {
  label: string;
  ayuda?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="block mb-1 text-gray-500 text-sm">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) && n >= 0 ? n : 0);
        }}
        className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
      />
      {ayuda && <span className="mt-1 block text-xs text-gray-400">{ayuda}</span>}
    </label>
  );
}
