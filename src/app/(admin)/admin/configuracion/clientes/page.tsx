"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ConfigClientes {
  "clientes.mostrarCarritoAlSesionar": string;
  "clientes.enviarEmailRegistro": string;
  "clientes.retardoRestablecimiento": string;
  "clientes.modoB2B": string;
  "clientes.solicitarFechaNacimiento": string;
  "clientes.activarOfertasAsociados": string;
}

const DEFAULT_CONFIG: ConfigClientes = {
  "clientes.mostrarCarritoAlSesionar": "false",
  "clientes.enviarEmailRegistro": "true",
  "clientes.retardoRestablecimiento": "360",
  "clientes.modoB2B": "false",
  "clientes.solicitarFechaNacimiento": "true",
  "clientes.activarOfertasAsociados": "true",
};

export default function ConfiguracionClientesPage() {
  const [config, setConfig] = useState<ConfigClientes>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/configuracion/clientes");
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
      const res = await fetch("/api/admin/configuracion/clientes", {
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

  const bool = (key: keyof ConfigClientes) => config[key] === "true";
  const setB = (key: keyof ConfigClientes, v: boolean) =>
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
            href="/admin/clientes"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a clientes
          </Link>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Ajustes sobre clientes
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
        {/* Carrito Section */}
        <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Carrito de compras
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configuración del comportamiento del carrito al iniciar sesión.
          </p>
          <div className="space-y-4">
            <Toggle
              label="Volver a mostrar el carrito al iniciar sesión"
              checked={bool("clientes.mostrarCarritoAlSesionar")}
              onChange={(v) => setB("clientes.mostrarCarritoAlSesionar", v)}
            />
          </div>
        </section>

        {/* Email Section */}
        <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Correo electrónico
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configuración de notificaciones por correo.
          </p>
          <div className="space-y-4">
            <Toggle
              label="Enviar un mensaje de correo electrónico después de registrarse"
              checked={bool("clientes.enviarEmailRegistro")}
              onChange={(v) => setB("clientes.enviarEmailRegistro", v)}
            />
          </div>
        </section>

        {/* Password Recovery Section */}
        <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Recuperación de contraseña
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Tiempo máximo para usar el enlace de restablecimiento de contraseña.
          </p>
          <div className="max-w-xs">
            <label className="block text-sm text-gray-500 mb-1">
              Retardo de restablecimiento de contraseña
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={config["clientes.retardoRestablecimiento"]}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    "clientes.retardoRestablecimiento": e.target.value,
                  }))
                }
                className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
              />
              <div className="flex items-center px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300">
                minutos
              </div>
            </div>
          </div>
        </section>

        {/* B2B and Profile Section */}
        <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Perfil del cliente
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Opciones adicionales de perfil de cliente.
          </p>
          <div className="space-y-4">
            <Toggle
              label="Activar modo B2B"
              checked={bool("clientes.modoB2B")}
              onChange={(v) => setB("clientes.modoB2B", v)}
            />
            <Toggle
              label="Solicitar fecha de nacimiento"
              checked={bool("clientes.solicitarFechaNacimiento")}
              onChange={(v) => setB("clientes.solicitarFechaNacimiento", v)}
            />
          </div>
        </section>

        {/* Promotions Section */}
        <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Promociones y ofertas
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configuración de promociones y comunicaciones comerciales.
          </p>
          <div className="space-y-4">
            <Toggle
              label="Activar ofertas de asociados"
              checked={bool("clientes.activarOfertasAsociados")}
              onChange={(v) => setB("clientes.activarOfertasAsociados", v)}
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
