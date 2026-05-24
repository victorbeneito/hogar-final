"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { CreditCard, RefreshCw, Save, Shield, Smartphone, Building2, Package } from "lucide-react";
import { DEFAULT_PAYMENT_CONFIG, normalizePaymentConfig, type PaymentCheckoutConfig, type PaymentMethodRow } from "@/lib/paymentSettings";

const TABS = [
  { key: "metodos", label: "Formas activas" },
  { key: "bizum", label: "Bizum" },
  { key: "transferencia", label: "Transferencia" },
  { key: "contrareembolso", label: "Contrareembolso" },
  { key: "pasarelas", label: "Pasarelas" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function FormasPagoPage() {
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [config, setConfig] = useState<PaymentCheckoutConfig>(DEFAULT_PAYMENT_CONFIG);
  const [tab, setTab] = useState<TabKey>("metodos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [methodsRes, configRes] = await Promise.all([
          fetch("/api/formas-pago", { cache: "no-store" }),
          fetch("/api/formas-pago/configuracion", { cache: "no-store" }),
        ]);

        const methodsData = await methodsRes.json();
        const configData = await configRes.json();
        if (!active) return;

        setMethods(methodsData.formasPago || []);
        setConfig(normalizePaymentConfig(configData.config));
      } catch (error: any) {
        toast.error(error.message || "No se han podido cargar las formas de pago");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const activeCount = useMemo(() => methods.filter((m) => m.activa).length, [methods]);

  function updateMethod(id: number, patch: Partial<PaymentMethodRow>) {
    setMethods((prev) => prev.map((method) => (method.id === id ? { ...method, ...patch } : method)));
  }

  function updateConfig(path: string, value: string | number | boolean) {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const segments = path.split(".");
      let cursor: any = next;
      for (let i = 0; i < segments.length - 1; i += 1) {
        cursor = cursor[segments[i]];
      }
      cursor[segments[segments.length - 1]] = value;
      return next;
    });
  }

  async function saveAll() {
    setSaving(true);
    try {
      const [methodsRes, configRes] = await Promise.all([
        fetch("/api/formas-pago", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formasPago: methods }),
        }),
        fetch("/api/formas-pago/configuracion", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        }),
      ]);

      const methodsData = await methodsRes.json();
      const configData = await configRes.json();

      if (!methodsRes.ok || !methodsData.ok) throw new Error(methodsData.error || "Error guardando métodos");
      if (!configRes.ok || !configData.ok) throw new Error(configData.error || "Error guardando configuración");

      toast.success("Formas de pago guardadas");
      setMethods(methodsData.formasPago || methods);
      setConfig(normalizePaymentConfig(configData.config));
    } catch (error: any) {
      toast.error(error.message || "No se han podido guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  function restoreDefaults() {
    setConfig(DEFAULT_PAYMENT_CONFIG);
    toast("Se han restaurado los valores por defecto");
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">Cargando formas de pago...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Formas de pago</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeCount} activas · configuración de Bizum, transferencia, contrareembolso y pasarelas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/personalizar/modulos"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200"
          >
            Ir a módulos
          </Link>
          <button
            onClick={restoreDefaults}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === item.key ? "bg-primary text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {tab === "metodos" && (
            <div className="space-y-4">
              {methods.map((method) => (
                <div key={method.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 md:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">{method.nombre}</h3>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{method.descripcion || "Sin descripción"}</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={method.activa}
                        onChange={(e) => updateMethod(method.id, { activa: e.target.checked })}
                      />
                      Activa
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="text-sm">
                      <span className="block mb-1 text-gray-500">Descripción</span>
                      <input
                        value={method.descripcion ?? ""}
                        onChange={(e) => updateMethod(method.id, { descripcion: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2.5"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="block mb-1 text-gray-500">Recargo %</span>
                      <input
                        type="number"
                        step="0.01"
                        value={method.recargo}
                        onChange={(e) => updateMethod(method.id, { recargo: Number(e.target.value) })}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2.5"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="block mb-1 text-gray-500">Orden</span>
                      <input
                        type="number"
                        value={method.orden}
                        onChange={(e) => updateMethod(method.id, { orden: Number(e.target.value) })}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2.5"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "bizum" && (
            <SectionCard
              icon={<Smartphone className="w-5 h-5 text-teal-500" />}
              title="Bizum"
              subtitle="Datos visibles en checkout/pago/bizum"
            >
              <PaymentFields
                fields={[
                  ["bizum.telefono", "Teléfono", config.bizum.telefono],
                  ["bizum.nombre", "Titular / marca", config.bizum.nombre],
                  ["bizum.conceptoPrefix", "Prefijo de concepto", config.bizum.conceptoPrefix],
                ]}
                onChange={updateConfig}
              />
              <label className="block text-sm mt-4">
                <span className="block mb-1 text-gray-500">Instrucciones</span>
                <textarea
                  value={config.bizum.instrucciones}
                  onChange={(e) => updateConfig("bizum.instrucciones", e.target.value)}
                  className="w-full min-h-28 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
                />
              </label>
            </SectionCard>
          )}

          {tab === "transferencia" && (
            <SectionCard
              icon={<Building2 className="w-5 h-5 text-blue-500" />}
              title="Transferencia"
              subtitle="Datos visibles en checkout/pago/transferencia"
            >
              <PaymentFields
                fields={[
                  ["transferencia.banco", "Banco", config.transferencia.banco],
                  ["transferencia.iban", "IBAN", config.transferencia.iban],
                  ["transferencia.titular", "Titular", config.transferencia.titular],
                ]}
                onChange={updateConfig}
              />
              <label className="block text-sm mt-4">
                <span className="block mb-1 text-gray-500">Instrucciones</span>
                <textarea
                  value={config.transferencia.instrucciones}
                  onChange={(e) => updateConfig("transferencia.instrucciones", e.target.value)}
                  className="w-full min-h-28 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
                />
              </label>
            </SectionCard>
          )}

          {tab === "contrareembolso" && (
            <SectionCard
              icon={<Package className="w-5 h-5 text-amber-500" />}
              title="Contrareembolso"
              subtitle="Comisión fija, porcentaje y mínimo"
            >
              <PaymentFields
                fields={[
                  ["contrareembolso.comisionFija", "Comisión fija (€)", config.contrareembolso.comisionFija],
                  ["contrareembolso.porcentaje", "Porcentaje (%)", config.contrareembolso.porcentaje],
                  ["contrareembolso.minimoVariable", "Mínimo variable (€)", config.contrareembolso.minimoVariable],
                ]}
                onChange={updateConfig}
              />
              <label className="block text-sm mt-4">
                <span className="block mb-1 text-gray-500">Instrucciones</span>
                <textarea
                  value={config.contrareembolso.instrucciones}
                  onChange={(e) => updateConfig("contrareembolso.instrucciones", e.target.value)}
                  className="w-full min-h-28 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
                />
              </label>
            </SectionCard>
          )}

          {tab === "pasarelas" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <SectionCard icon={<Shield className="w-5 h-5 text-red-500" />} title="Redsys" subtitle="Integración técnica del TPV">
                <ToggleRow label="Activa" checked={config.gateways.redsys.activa} onChange={(checked) => updateConfig("gateways.redsys.activa", checked)} />
                <PaymentFields
                  fields={[
                    ["gateways.redsys.merchantCode", "FUC / Código comercio", config.gateways.redsys.merchantCode],
                    ["gateways.redsys.terminal", "Número de terminal", config.gateways.redsys.terminal],
                    ["gateways.redsys.merchantName", "Nombre del comercio", config.gateways.redsys.merchantName],
                  ]}
                  onChange={updateConfig}
                />
                <RedsysSecretKeyField
                  value={config.gateways.redsys.secretKey}
                  onChange={(val) => updateConfig("gateways.redsys.secretKey", val)}
                />
                <label className="block text-sm mt-4">
                  <span className="block mb-1 text-gray-500">Entorno</span>
                  <select
                    value={config.gateways.redsys.entorno}
                    onChange={(e) => updateConfig("gateways.redsys.entorno", e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
                  >
                    <option value="sandbox">Sandbox (pruebas)</option>
                    <option value="produccion">Producción (real)</option>
                  </select>
                </label>
                <div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <p className="font-semibold">URLs a configurar en el panel de Redsys / tu banco:</p>
                  <p><span className="font-medium">Notificación:</span> {typeof window !== "undefined" ? window.location.origin : ""}/api/redsys/notificacion</p>
                  <p><span className="font-medium">URL OK:</span> {typeof window !== "undefined" ? window.location.origin : ""}/checkout/redsys/ok</p>
                  <p><span className="font-medium">URL KO:</span> {typeof window !== "undefined" ? window.location.origin : ""}/checkout/redsys/ko</p>
                </div>
              </SectionCard>

              <SectionCard icon={<CreditCard className="w-5 h-5 text-blue-600" />} title="PayPal" subtitle="Integración técnica de la cuenta">
                <ToggleRow label="Activa" checked={config.gateways.paypal.activa} onChange={(checked) => updateConfig("gateways.paypal.activa", checked)} />
                <PaymentFields
                  fields={[["gateways.paypal.clientId", "Client ID", config.gateways.paypal.clientId]]}
                  onChange={updateConfig}
                />
                <label className="block text-sm mt-4">
                  <span className="block mb-1 text-gray-500">Entorno</span>
                  <select
                    value={config.gateways.paypal.entorno}
                    onChange={(e) => updateConfig("gateways.paypal.entorno", e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="produccion">Producción</option>
                  </select>
                </label>
              </SectionCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 md:p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function PaymentFields({
  fields,
  onChange,
}: {
  fields: Array<[string, string, string | number]>;
  onChange: (path: string, value: string | number | boolean) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {fields.map(([path, label, value]) => (
        <label key={path} className="block text-sm">
          <span className="block mb-1 text-gray-500">{label}</span>
          <input
            value={value}
            onChange={(e) => onChange(path, e.target.value)}
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
          />
        </label>
      ))}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function RedsysSecretKeyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <label className="block text-sm mt-4">
      <span className="block mb-1 text-gray-500">Clave secreta SHA-256</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Introduce la clave secreta de Redsys"
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 pr-24 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-semibold px-2 py-1 rounded"
        >
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Esta clave la proporciona tu banco/Redsys. No la compartas nunca.
      </p>
    </label>
  );
}
