"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowRight, RefreshCw, Save, FileText, Eye } from "lucide-react";
import { CMS_PAGE_DEFINITIONS, getDefaultCmsSettings, normalizeCmsSettings, type CmsPageSlug, type CmsSettingsConfig } from "@/lib/cmsConfig";

export default function CmsAdminPage() {
  const [config, setConfig] = useState<CmsSettingsConfig>(getDefaultCmsSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<CmsPageSlug>(CMS_PAGE_DEFINITIONS[0].slug);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/cms/configuracion", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setConfig(normalizeCmsSettings(data.config));
      } catch (error: any) {
        toast.error(error.message || "No se han podido cargar las páginas CMS");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const selectedDefinition = useMemo(
    () => CMS_PAGE_DEFINITIONS.find((definition) => definition.slug === selectedSlug) ?? CMS_PAGE_DEFINITIONS[0],
    [selectedSlug]
  );

  const selectedPage = config.pages[selectedSlug];

  function updatePage(patch: Partial<(typeof selectedPage)>) {
    setConfig((prev) => ({
      ...prev,
      pages: {
        ...prev.pages,
        [selectedSlug]: {
          ...prev.pages[selectedSlug],
          ...patch,
        },
      },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/cms/configuracion", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se ha podido guardar");
      setConfig(normalizeCmsSettings(data.config));
      toast.success("Páginas CMS guardadas");
    } catch (error: any) {
      toast.error(error.message || "Error guardando las páginas CMS");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">Cargando CMS...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">CMS / Páginas legales</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configura aquí las páginas del footer como aviso legal, condiciones, privacidad y contacto.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfig(getDefaultCmsSettings())}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Reset
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

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
        <aside className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
            <FileText className="w-4 h-4 text-primary" /> Páginas
          </div>

          {CMS_PAGE_DEFINITIONS.map((definition) => {
            const page = config.pages[definition.slug];
            const isSelected = selectedSlug === definition.slug;

            return (
              <button
                key={definition.slug}
                type="button"
                onClick={() => setSelectedSlug(definition.slug)}
                className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{definition.label}</div>
                    <div className="text-xs text-gray-400 mt-1">/{definition.slug}</div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {definition.description}
                    </div>
                  </div>
                  <span className={`mt-0.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${page.active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                    {page.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </button>
            );
          })}
        </aside>

        <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                {selectedDefinition.label}
              </div>
              <h2 className="mt-3 text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{selectedPage.title}</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{selectedDefinition.description}</p>
            </div>

            <Link
              href={selectedDefinition.route}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary"
            >
              Ver página <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Título" value={selectedPage.title} onChange={(value) => updatePage({ title: value })} />
                <Field label="Meta título" value={selectedPage.metaTitle} onChange={(value) => updatePage({ metaTitle: value })} />
              </div>

              <Field
                label="Resumen corto"
                value={selectedPage.excerpt}
                onChange={(value) => updatePage({ excerpt: value })}
                textarea
                rows={3}
              />

              <Field
                label="Meta descripción"
                value={selectedPage.metaDescription}
                onChange={(value) => updatePage({ metaDescription: value })}
                textarea
                rows={3}
              />

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Estado</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Activa o desactiva la página pública.</p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPage.active}
                    onChange={(e) => updatePage({ active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Visible</span>
                </label>
              </div>

              <Field
                label="Contenido HTML"
                value={selectedPage.contentHtml}
                onChange={(value) => updatePage({ contentHtml: value })}
                textarea
                rows={18}
                className="font-mono text-[13px] leading-6 min-h-[420px]"
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <Eye className="w-4 h-4 text-primary" /> Vista previa
                </div>
                <div className="mt-4 rounded-xl bg-white dark:bg-darkNavBg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{selectedPage.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{selectedPage.excerpt}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Slug</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">/cms/{selectedPage.slug}</div>
                <div className="mt-3 text-xs text-gray-400">
                  El slug se mantiene fijo para que los enlaces del footer no se rompan.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
  rows = 4,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  rows?: number;
  className?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className={`w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${className}`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        />
      )}
    </label>
  );
}
