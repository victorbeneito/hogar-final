"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Save, RefreshCw } from "lucide-react";
import {
  INVOICE_ORDER_STATUS_OPTIONS,
  buildInvoiceNumber,
  getDefaultInvoiceSettings,
  normalizeInvoiceSettings,
  type InvoiceSettingsConfig,
} from "@/lib/invoiceSettings";

export default function ConfiguracionFacturasPage() {
  const [config, setConfig] = useState<InvoiceSettingsConfig>(getDefaultInvoiceSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/facturas/configuracion", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setConfig(normalizeInvoiceSettings(data.config));
      } catch (error: any) {
        toast.error(error.message || "No se ha podido cargar la configuración");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const sampleInvoiceNumber = useMemo(() => buildInvoiceNumber(config, config.nextSequence, new Date()), [config]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/facturas/configuracion", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se ha podido guardar");
      setConfig(normalizeInvoiceSettings(data.config));
      toast.success("Configuración guardada");
    } catch (error: any) {
      toast.error(error.message || "Error guardando la configuración");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">Cargando configuración...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <Link href="/admin/facturas" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver a facturas
          </Link>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Configuración de facturas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Define cuándo emitirlas, cómo numerarlas y qué plantilla usar.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfig(getDefaultInvoiceSettings())}
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

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Emisión automática</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Elige en qué estados del pedido se genera la factura.</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INVOICE_ORDER_STATUS_OPTIONS.map((status) => (
                <label key={status.value} className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                  <input
                    type="checkbox"
                    checked={config.emitOnOrderStatuses.includes(status.value)}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        emitOnOrderStatuses: e.target.checked
                          ? [...prev.emitOnOrderStatuses, status.value]
                          : prev.emitOnOrderStatuses.filter((item) => item !== status.value),
                      }))
                    }
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{status.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Numeración</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Prefijo" value={config.prefix} onChange={(value) => setConfig((prev) => ({ ...prev, prefix: value }))} />
              <Field
                label="Siguiente número"
                type="number"
                value={String(config.nextSequence)}
                onChange={(value) => setConfig((prev) => ({ ...prev, nextSequence: Number(value || 1) }))}
              />
              <Field
                label="Dígitos"
                type="number"
                value={String(config.padding)}
                onChange={(value) => setConfig((prev) => ({ ...prev, padding: Math.max(4, Number(value || 4)) }))}
              />
              <SelectField
                label="Posición del año"
                value={config.yearPosition}
                onChange={(value) => setConfig((prev) => ({ ...prev, yearPosition: value === "before" ? "before" : "after" }))}
                options={[
                  { value: "after", label: "Después del número" },
                  { value: "before", label: "Antes del número" },
                ]}
              />
              <Field
                label="Separador año"
                value={config.yearSeparator}
                onChange={(value) => setConfig((prev) => ({ ...prev, yearSeparator: value }))}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle
                label="Incluir año"
                checked={config.includeYear}
                onChange={(checked) => setConfig((prev) => ({ ...prev, includeYear: checked }))}
              />
              <Toggle
                label="Reiniciar cada año"
                checked={config.resetAnnually}
                onChange={(checked) => setConfig((prev) => ({ ...prev, resetAnnually: checked }))}
              />
              <Toggle
                label="Mostrar desglose de impuestos"
                checked={config.showTaxBreakdown}
                onChange={(checked) => setConfig((prev) => ({ ...prev, showTaxBreakdown: checked }))}
              />
              <Toggle
                label="Mostrar imagen de producto"
                checked={config.showProductImage}
                onChange={(checked) => setConfig((prev) => ({ ...prev, showProductImage: checked }))}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Plantilla de factura</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Título"
                value={config.template.headerTitle}
                onChange={(value) => setConfig((prev) => ({ ...prev, template: { ...prev.template, headerTitle: value } }))}
              />
              <Field
                label="Nombre plantilla"
                value={config.template.name}
                onChange={(value) => setConfig((prev) => ({ ...prev, template: { ...prev.template, name: value } }))}
              />
              <Field
                label="Subtítulo"
                value={config.template.subtitle}
                onChange={(value) => setConfig((prev) => ({ ...prev, template: { ...prev.template, subtitle: value } }))}
              />
              <Field
                label="Texto pie"
                value={config.template.footerText}
                onChange={(value) => setConfig((prev) => ({ ...prev, template: { ...prev.template, footerText: value } }))}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4">
              <TextArea
                label="Texto legal"
                value={config.template.legalText}
                onChange={(value) => setConfig((prev) => ({ ...prev, template: { ...prev.template, legalText: value } }))}
              />
              <TextArea
                label="HTML plantilla"
                value={config.template.html}
                rows={8}
                onChange={(value) => setConfig((prev) => ({ ...prev, template: { ...prev.template, html: value } }))}
              />
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Vista previa</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ejemplo rápido de la numeración que usaría el sistema.</p>
            <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 p-4 text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">Número de factura</p>
              <p className="mt-1 text-gray-600 dark:text-gray-300">{sampleInvoiceNumber}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notas</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Esta pantalla deja preparada la numeración y la plantilla. Luego podemos enlazarla con la creación automática de facturas al cambiar el estado del pedido.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-gray-500">{label}</span>
      <textarea
        value={value}
        rows={rows}
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
