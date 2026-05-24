"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { getDefaultModulesConfig, getModuleDefinition, type ModuleDefinition } from "@/lib/moduleRegistry";

export default function ModuleDetailPage() {
  const params = useParams<{ slug: string }>();
  const moduleDef = getModuleDefinition(params.slug);
  const [config, setConfig] = useState<Record<string, any>>(getDefaultModulesConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/modulos/configuracion", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setConfig(data.config ?? getDefaultModulesConfig());
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
  }, [params.slug]);

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

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">Cargando módulo...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:py-8">
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

      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduleDef.fields.map((field) => (
            <FieldEditor
              key={field.key}
              field={field}
              value={moduleState?.[field.key]}
              onChange={(value) => setConfig((prev) => ({ ...prev, [moduleDef.slug]: { ...(prev[moduleDef.slug] ?? {}), [field.key]: value } }))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: ModuleDefinition["fields"][number];
  value: any;
  onChange: (value: any) => void;
}) {
  const label = <span className="block mb-1 text-gray-500 text-sm">{field.label}</span>;

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block">
        {label}
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
        >
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      {label}
      <input
        type={field.type === "number" ? "number" : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
      />
    </label>
  );
}
