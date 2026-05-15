"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ConfigProductos {
  "productos.permitirFueraStock": string;
  "productos.etiquetaFueraStock": string;
  "productos.porPagina": string;
  "productos.ordenarPor": string;
  "productos.ordenDireccion": string;
  "productos.diasNovedad": string;
}

const DEFAULT_CONFIG: ConfigProductos = {
  "productos.permitirFueraStock": "false",
  "productos.etiquetaFueraStock": "Fuera de stock",
  "productos.porPagina": "12",
  "productos.ordenarPor": "createdAt",
  "productos.ordenDireccion": "desc",
  "productos.diasNovedad": "20",
};

export default function ConfiguracionProductosPage() {
  const [config, setConfig] = useState<ConfigProductos>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/configuracion/productos");
      const data = await res.json();
      setConfig({ ...DEFAULT_CONFIG, ...data.config });
    } catch {
      toast.error("Error cargando configuración");
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/configuracion/productos", {
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

  const bool = (key: keyof ConfigProductos) => config[key] === "true";
  const setB = (key: keyof ConfigProductos, v: boolean) =>
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
            href="/admin/productos"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a productos
          </Link>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Configuración de productos
          </h1>
        </div>

        <button
          onClick={saveConfig}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60"
        >
          <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* Stock Section */}
        <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Stock</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configuración de disponibilidad y comportamiento del stock.
          </p>
          <div className="space-y-4">
            <Toggle
              label="Permitir ventas de productos fuera de stock"
              checked={bool("productos.permitirFueraStock")}
              onChange={(v) => setB("productos.permitirFueraStock", v)}
            />
            {!bool("productos.permitirFueraStock") && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Etiqueta para productos sin stock
                </label>
                <input
                  type="text"
                  value={config["productos.etiquetaFueraStock"]}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      "productos.etiquetaFueraStock": e.target.value,
                    }))
                  }
                  placeholder="Ej: Fuera de stock"
                  className="w-full md:w-1/2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
                />
              </div>
            )}
          </div>
        </section>

        {/* Pagination & Sorting Section */}
        <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Paginación y ordenamiento
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Cómo se muestran los productos en el catálogo.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Productos por página</label>
              <select
                value={config["productos.porPagina"]}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, "productos.porPagina": e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
              >
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="36">36</option>
                <option value="48">48</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Ordenar por</label>
              <select
                value={config["productos.ordenarPor"]}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, "productos.ordenarPor": e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
              >
                <option value="createdAt">Más nuevos</option>
                <option value="precio">Precio</option>
                <option value="nombre">Nombre</option>
                <option value="destacado">Destacados</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Dirección del ordenamiento</label>
              <select
                value={config["productos.ordenDireccion"]}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, "productos.ordenDireccion": e.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </div>
          </div>
        </section>

        {/* Novedades Section */}
        <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Novedades</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Marcar productos como nuevos durante ciertos días desde su creación.
          </p>
          <div className="max-w-xs">
            <label className="block text-sm text-gray-500 mb-1">
              Días para considerar un producto como novedad (mínimo 1)
            </label>
            <input
              type="number"
              min="1"
              value={config["productos.diasNovedad"]}
              onChange={(e) =>
                setConfig((p) => ({ ...p, "productos.diasNovedad": e.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
            />
          </div>
        </section>
      </div>
    </div>
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
