"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Save, RefreshCw, Send } from "lucide-react";
import { getDefaultEmailSettings, normalizeEmailSettings, type EmailSettingsConfig } from "@/lib/emailConfig";

export default function ConfiguracionGeneralCorreosPage() {
  const [config, setConfig] = useState<EmailSettingsConfig>(getDefaultEmailSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/correos/configuracion", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setConfig(normalizeEmailSettings(data.config));
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

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/correos/configuracion", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se ha podido guardar");
      setConfig(normalizeEmailSettings(data.config));
      toast.success("Configuración guardada");
    } catch (error: any) {
      toast.error(error.message || "Error guardando la configuración");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    const email = testEmail.trim();
    if (!email) {
      toast.error("Introduce una dirección de correo para la prueba");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/correos/enviar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: `✅ Correo de prueba — ${config.brandName}`,
          html: `<p>Este es un correo de prueba enviado desde el panel de administración de <strong>${config.brandName}</strong>.</p><p>Si lo estás leyendo, la configuración SMTP funciona correctamente.</p>`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const detail = [data.error, data.response, data.code].filter(Boolean).join(" — ");
        throw new Error(detail || "Error desconocido");
      }
      toast.success(`Email de prueba enviado a ${email}`);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-gray-500 dark:text-gray-400">Cargando configuración...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <Link href="/admin/personalizar/correos" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver a Configuración de Correos
          </Link>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Configuración general de correos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Datos globales del remitente para todos los correos automáticos.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfig(getDefaultEmailSettings())}
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

      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre remitente" value={config.senderName} onChange={(value) => setConfig((prev) => ({ ...prev, senderName: value }))} />
          <Field label="Email remitente" value={config.senderEmail} onChange={(value) => setConfig((prev) => ({ ...prev, senderEmail: value }))} />
          <Field label="Reply-to" value={config.replyToEmail} onChange={(value) => setConfig((prev) => ({ ...prev, replyToEmail: value }))} />
          <Field label="Email soporte" value={config.supportEmail} onChange={(value) => setConfig((prev) => ({ ...prev, supportEmail: value }))} />
          <Field label="Nombre de marca" value={config.brandName} onChange={(value) => setConfig((prev) => ({ ...prev, brandName: value }))} />
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Notificaciones internas</p>
          <Field
            label="Email del administrador (recibe aviso de cada nuevo pedido)"
            value={config.adminEmail}
            onChange={(value) => setConfig((prev) => ({ ...prev, adminEmail: value }))}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Enviar correo de prueba</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Verifica que el servidor SMTP está bien configurado enviando un correo de prueba.
        </p>
        <div className="flex gap-3 items-end">
          <label className="block text-sm flex-1">
            <span className="block mb-1 text-gray-500">Dirección de destino</span>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3"
            />
          </label>
          <button
            onClick={sendTest}
            disabled={sending}
            className="rounded-lg bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60 shrink-0"
          >
            <Send className="w-4 h-4" />
            {sending ? "Enviando..." : "Enviar prueba"}
          </button>
        </div>
      </div>
    </div>
  );
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
