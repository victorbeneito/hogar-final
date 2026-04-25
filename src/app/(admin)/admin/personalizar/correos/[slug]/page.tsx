"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import {
  EMAIL_TEMPLATES,
  getDefaultEmailSettings,
  getEmailTemplateDefinition,
  normalizeEmailSettings,
  type EmailSettingsConfig,
  type EmailTemplateConfig,
} from "@/lib/emailConfig";

export default function CorreoPlantillaPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const templateDef = slug ? getEmailTemplateDefinition(slug) : null;
  const [config, setConfig] = useState<EmailSettingsConfig>(getDefaultEmailSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/correos/configuracion", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setConfig(normalizeEmailSettings(data.config));
      } catch (error: any) {
        toast.error(error.message || "No se ha podido cargar la plantilla");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [slug]);

  const templateState = useMemo(() => {
    if (!templateDef) return null;
    return config.templates[templateDef.slug] ?? templateDef.defaults;
  }, [config, templateDef]);

  if (!templateDef) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-gray-500 dark:text-gray-400">Plantilla no encontrada.</div>;
  }
  const currentTemplate = templateState ?? templateDef.defaults;

  async function save() {
    setSaving(true);
    try {
      const nextConfig = {
        ...config,
        templates: {
          ...config.templates,
          [templateDef.slug]: currentTemplate,
        },
      };

      const res = await fetch("/api/correos/configuracion", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: nextConfig }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se ha podido guardar");
      setConfig(normalizeEmailSettings(data.config));
      toast.success("Plantilla guardada");
    } catch (error: any) {
      toast.error(error.message || "Error guardando la plantilla");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    const templateDefaults = EMAIL_TEMPLATES.find((item) => item.slug === templateDef.slug)?.defaults ?? templateDef.defaults;
    const nextConfig = {
      ...config,
      templates: {
        ...config.templates,
        [templateDef.slug]: templateDefaults,
      },
    };

    const res = await fetch("/api/correos/configuracion", {
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

    setConfig(normalizeEmailSettings(data.config));
    toast.success("Plantilla restaurada");
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-gray-500 dark:text-gray-400">Cargando plantilla...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <Link href="/admin/personalizar/correos" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver a Configuración de Correos
          </Link>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{templateDef.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{templateDef.description}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Toggle label="Activo" checked={Boolean(currentTemplate.enabled)} onChange={(checked) => setTemplate((value) => ({ ...value, enabled: checked }))} />
            <Field label="Asunto" value={currentTemplate.subject} onChange={(value) => setTemplate((current) => ({ ...current, subject: value }))} />
            <Field label="Preheader" value={currentTemplate.preheader} onChange={(value) => setTemplate((current) => ({ ...current, preheader: value }))} />
          </div>

          <label className="block text-sm">
            <span className="block mb-1 text-gray-500">HTML del correo</span>
            <textarea
              value={currentTemplate.html}
              onChange={(e) => setTemplate((current) => ({ ...current, html: e.target.value }))}
              className="w-full min-h-[320px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 font-mono text-sm"
            />
          </label>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Variables</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Usa estas marcas dentro del asunto o el HTML.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {templateDef.variables.map((variable) => (
                <span key={variable} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {variable}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Consejo</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Mantén un estilo simple, con saludo personalizado, logo, resumen y un botón de acción.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  function setTemplate(update: (value: EmailTemplateConfig) => EmailTemplateConfig) {
    if (!templateDef) return;
    setConfig((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [templateDef.slug]: update(prev.templates[templateDef.slug] ?? templateDef.defaults),
      },
    }));
  }
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-gray-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
    </label>
  );
}
