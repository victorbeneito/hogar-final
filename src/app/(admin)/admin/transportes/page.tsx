"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock, Globe, MapPin, Plus, RefreshCw, Save, Shield, Trash2, Truck } from "lucide-react";
import {
  createDefaultCarrierConfig,
  createDefaultTransportConfig,
  normalizeShippingConfig,
  type ShippingCarrierConfig,
  type ShippingConfig,
  type ShippingZoneConfig,
} from "@/lib/transportes";

export default function AdminTransportesPage() {
  const [config, setConfig] = useState<ShippingConfig>(createDefaultTransportConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      try {
        const res = await fetch("/api/transportes/configuracion", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;

        if (res.ok && data.ok) {
          setConfig(normalizeShippingConfig(data.config));
          setMessage(data.updatedAt ? "Configuración cargada" : "Usando configuración por defecto");
        } else {
          setMessage("Usando configuración por defecto");
        }
      } catch {
        if (active) setMessage("Usando configuración por defecto");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadConfig();

    return () => {
      active = false;
    };
  }, []);

  const activeCarriers = useMemo(
    () => config.carriers.filter((carrier) => carrier.active).length,
    [config.carriers]
  );

  function updatePickup(field: keyof Pick<ShippingConfig, "pickupEnabled" | "pickupName" | "pickupDescription" | "pickupImage">, value: string | boolean) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  function loadImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });
  }

  async function handlePickupImageFile(file: File | null) {
    if (!file) return;
    const image = await loadImageFile(file);
    updatePickup("pickupImage", image);
  }

  async function handleCarrierImageFile(carrierId: string, file: File | null) {
    if (!file) return;
    const image = await loadImageFile(file);
    updateCarrier(carrierId, { image });
  }

  function updateCarrier(carrierId: string, patch: Partial<ShippingCarrierConfig>) {
    setConfig((prev) => ({
      ...prev,
      carriers: prev.carriers.map((carrier) => (carrier.id === carrierId ? { ...carrier, ...patch } : carrier)),
    }));
  }

  function updateCarrierZone(carrierId: string, zoneId: ShippingZoneConfig["id"], patch: Partial<ShippingZoneConfig>) {
    setConfig((prev) => ({
      ...prev,
      carriers: prev.carriers.map((carrier) => {
        if (carrier.id !== carrierId) return carrier;
        return {
          ...carrier,
          zones: carrier.zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone)),
        };
      }),
    }));
  }

  function addCarrier() {
    const nextIndex = config.carriers.length + 1;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `carrier-${Date.now()}`;

    setConfig((prev) => ({
      ...prev,
      carriers: [
        ...prev.carriers,
        createDefaultCarrierConfig({
          id,
          name: `Transportista ${nextIndex}`,
          image: "",
          freeShippingAmount: 59.95,
        }),
      ],
    }));
  }

  function removeCarrier(carrierId: string) {
    setConfig((prev) => ({
      ...prev,
      carriers: prev.carriers.length > 1 ? prev.carriers.filter((carrier) => carrier.id !== carrierId) : prev.carriers,
    }));
  }

  async function saveConfig() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/transportes/configuracion", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo guardar la configuración");
      }

      setConfig(normalizeShippingConfig(data.config));
      setMessage(data.adminEmail ? `Guardado para ${data.adminEmail}` : "Configuración guardada");
    } catch (saveError: any) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    setConfig(createDefaultTransportConfig());
    setMessage("Configuración restaurada a valores por defecto");
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Cargando transportes...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-8 px-4 lg:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold text-[#4A4A4A] flex items-center gap-3">
              <Truck className="w-9 h-9 text-[#6BAEC9]" /> Transportes
            </h1>
            <p className="text-sm text-gray-500 mt-2 max-w-3xl">
              Crea varios transportistas, asigna imagen, precio por zona y umbral de envío gratis. Las zonas predefinidas son Península, Baleares, Canarias, Portugal e Italia.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
            >
              <RefreshCw className="w-4 h-4" /> Restablecer
            </button>
            <button
              type="button"
              onClick={addCarrier}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
            >
              <Plus className="w-4 h-4" /> Añadir transportista
            </button>
            <button
              type="button"
              onClick={saveConfig}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] hover:opacity-90 shadow transition disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6 xl:gap-8">
          <div className="min-w-0 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-[#6BAEC9]/10 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#6BAEC9]" />
                <div>
                  <h2 className="text-lg font-bold text-[#4A4A4A]">Recogida en tienda</h2>
                  <p className="text-xs text-gray-500">Método independiente de los transportistas.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Recogida activa">
                  <ToggleButton
                    checked={config.pickupEnabled}
                    onChange={(checked) => updatePickup("pickupEnabled", checked)}
                    label={config.pickupEnabled ? "Sí" : "No"}
                  />
                </Field>
                <Field label="Imagen de recogida">
                  <div className="space-y-3">
                    <input
                      value={config.pickupImage}
                      onChange={(e) => updatePickup("pickupImage", e.target.value)}
                      placeholder="/img/recogida.png o URL"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handlePickupImageFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-[#6BAEC9] file:px-4 file:py-2 file:text-white file:font-semibold hover:file:opacity-90"
                    />
                    {config.pickupImage && (
                      <div className="w-24 h-24 rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                        <img src={config.pickupImage} alt="Recogida" className="w-full h-full object-contain p-2" />
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Texto recogida">
                  <input
                    value={config.pickupName}
                    onChange={(e) => updatePickup("pickupName", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                  />
                </Field>
                <Field label="Descripción recogida">
                  <input
                    value={config.pickupDescription}
                    onChange={(e) => updatePickup("pickupDescription", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                  />
                </Field>
              </div>
            </div>

            {config.carriers.map((carrier, index) => (
              <div key={carrier.id} className="bg-white rounded-2xl shadow-lg border border-[#6BAEC9]/10 p-6 space-y-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-[#6BAEC9]" />
                      <h2 className="text-lg font-bold text-[#4A4A4A]">Transportista {index + 1}</h2>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cada transportista puede tener su propia imagen, tarifas y zonas.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${carrier.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {carrier.active ? "Activo" : "Inactivo"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCarrier(carrier.id)}
                      disabled={config.carriers.length <= 1}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Activo">
                    <ToggleButton
                      checked={carrier.active}
                      onChange={(checked) => updateCarrier(carrier.id, { active: checked })}
                      label={carrier.active ? "Sí" : "No"}
                    />
                  </Field>
                  <Field label="Imagen del transportista">
                    <div className="space-y-3">
                      <input
                        value={carrier.image}
                        onChange={(e) => updateCarrier(carrier.id, { image: e.target.value })}
                        placeholder="/img/ontime.png o URL"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleCarrierImageFile(carrier.id, e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-[#6BAEC9] file:px-4 file:py-2 file:text-white file:font-semibold hover:file:opacity-90"
                      />
                      {carrier.image && (
                        <div className="w-28 h-20 rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                          <img src={carrier.image} alt={carrier.name} className="w-full h-full object-contain p-2" />
                        </div>
                      )}
                    </div>
                  </Field>
                  <Field label="Nombre del transportista">
                    <input
                      value={carrier.name}
                      onChange={(e) => updateCarrier(carrier.id, { name: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                    />
                  </Field>
                  <Field label="Tiempo de tránsito">
                    <input
                      value={carrier.transitTime}
                      onChange={(e) => updateCarrier(carrier.id, { transitTime: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                    />
                  </Field>
                  <Field label="URL de seguimiento">
                    <input
                      value={carrier.trackingUrl}
                      onChange={(e) => updateCarrier(carrier.id, { trackingUrl: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                    />
                  </Field>
                  <Field label="Velocidad">
                    <input
                      type="number"
                      min={0}
                      value={carrier.speed}
                      onChange={(e) => updateCarrier(carrier.id, { speed: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                    />
                  </Field>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-4">
                  <div className="flex items-center gap-3 text-emerald-800">
                    <Globe className="w-5 h-5" />
                    <div>
                      <p className="font-semibold">Envío gratis para este transportista</p>
                      <p className="text-xs text-emerald-700">Cada transportista puede usar umbral y modo propio.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Activo">
                      <ToggleButton
                        checked={carrier.freeShippingEnabled}
                        onChange={(checked) => updateCarrier(carrier.id, { freeShippingEnabled: checked })}
                        label={carrier.freeShippingEnabled ? "Sí" : "No"}
                      />
                    </Field>
                    <Field label="Condición">
                      <select
                        value={carrier.freeShippingMode}
                        onChange={(e) => updateCarrier(carrier.id, { freeShippingMode: e.target.value as ShippingCarrierConfig["freeShippingMode"] })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                      >
                        <option value="above">Gratis a partir de</option>
                        <option value="below">Gratis hasta</option>
                      </select>
                    </Field>
                    <Field label="Importe">
                      <input
                        type="number"
                        step="0.01"
                        value={carrier.freeShippingAmount}
                        onChange={(e) => updateCarrier(carrier.id, { freeShippingAmount: Number(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                      />
                    </Field>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left">Zona</th>
                        <th className="px-4 py-3 text-left">Cobertura</th>
                        <th className="px-4 py-3 text-left">Activa</th>
                        <th className="px-4 py-3 text-left">Importe</th>
                        <th className="px-4 py-3 text-left">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {carrier.zones.map((zone) => (
                        <tr key={zone.id} className="align-top">
                          <td className="px-4 py-3 font-semibold text-gray-800">{zone.name}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            <div className="space-y-1">
                              <p>{zone.countries.length ? `Países: ${zone.countries.join(", ")}` : "Países: todos"}</p>
                              <p>{zone.provinces.length ? `Provincias: ${zone.provinces.slice(0, 4).join(", ")}${zone.provinces.length > 4 ? "..." : ""}` : "Provincias: todas"}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={zone.active}
                              onChange={(e) => updateCarrierZone(carrier.id, zone.id, { active: e.target.checked })}
                              className="h-4 w-4 rounded border-gray-300 text-[#6BAEC9] focus:ring-[#6BAEC9]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={zone.price}
                              onChange={(e) => updateCarrierZone(carrier.id, zone.id, { price: Number(e.target.value) || 0 })}
                              className="w-28 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={zone.note}
                              onChange={(e) => updateCarrierZone(carrier.id, zone.id, { note: e.target.value })}
                              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div className="min-w-0 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-[#6BAEC9]/10 p-6 space-y-4 sticky top-6">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-[#6BAEC9]" />
                <div>
                  <h2 className="text-lg font-bold text-[#4A4A4A]">Resumen</h2>
                  <p className="text-xs text-gray-500">{activeCarriers} transportistas activos</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-[#F8F8F5] p-4 space-y-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-800">Recogida: {config.pickupEnabled ? "Activa" : "Inactiva"}</p>
                <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#6BAEC9]" /> {config.pickupName}</p>
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#6BAEC9]" /> Zonas: Península, Baleares, Canarias, Portugal, Italia</p>
              </div>

              <div className="space-y-3">
                {config.carriers.map((carrier) => (
                  <div key={carrier.id} className={`rounded-xl border p-4 ${carrier.active ? "border-emerald-100 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                        {carrier.image ? (
                          <img src={carrier.image} alt={carrier.name} className="w-full h-full object-contain p-2" />
                        ) : (
                          <span className="text-[10px] text-gray-400 text-center px-1">Sin imagen</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-800">{carrier.name}</p>
                            <p className="text-xs text-gray-500 truncate">{carrier.transitTime}</p>
                          </div>
                          <span className={`text-sm font-bold ${carrier.active ? "text-emerald-700" : "text-gray-400"}`}>
                            {carrier.active ? `${carrier.freeShippingAmount.toFixed(2)} €` : "Inactivo"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {carrier.zones.filter((zone) => zone.active).length} zonas activas · {carrier.zones.map((zone) => zone.name).join(" · ")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function ToggleButton({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${checked ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600"}`}
    >
      {label}
    </button>
  );
}
