"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowRight, RefreshCw, Mail, Settings, Send, Loader2 } from "lucide-react";
import { EMAIL_TEMPLATES, getDefaultEmailSettings, normalizeEmailSettings, type EmailSettingsConfig, type EmailTemplateSlug } from "@/lib/emailConfig";

const SAMPLE_VARIABLES: Record<EmailTemplateSlug, Record<string, string>> = {
  "account-created": {
    nombre: "Cliente Prueba",
    email: "cliente@ejemplo.com",
    loginUrl: "#",
  },
  "password-reset": {
    nombre: "Cliente Prueba",
    email: "cliente@ejemplo.com",
    resetUrl: "#",
    minutosValidez: "60",
  },
  "order-placed": {
    nombre: "Cliente Prueba",
    numeroPedido: "PED-2026-0001",
    total: "49.95 €",
    pedidoUrl: "#",
  },
  "order-shipped": {
    nombre: "Cliente Prueba",
    numeroPedido: "PED-2026-0001",
    trackingNumber: "ONT-123456789",
    trackingUrl: "#",
  },
  "order-cancelled": {
    nombre: "Cliente Prueba",
    numeroPedido: "PED-2026-0001",
    motivo: "Solicitud del cliente",
  },
  "order-return": {
    nombre: "Cliente Prueba",
    numeroPedido: "PED-2026-0001",
    estado: "Devolución aprobada",
  },
};

export default function ConfiguracionCorreosPage() {
  const [config, setConfig] = useState<EmailSettingsConfig>(getDefaultEmailSettings());
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [sendingSlug, setSendingSlug] = useState<EmailTemplateSlug | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/correos/configuracion", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setConfig(normalizeEmailSettings(data.config));
      } catch (error: any) {
        toast.error(error.message || "No se han podido cargar los correos");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const enabledCount = useMemo(() => Object.values(config.templates).filter((template) => template.enabled).length, [config]);

  async function sendTest(slug: EmailTemplateSlug) {
    const email = testEmail.trim();
    if (!email) {
      toast.error("Introduce una dirección de correo de prueba");
      return;
    }
    setSendingSlug(slug);
    try {
      const res = await fetch("/api/correos/enviar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          templateSlug: slug,
          variables: SAMPLE_VARIABLES[slug] ?? {},
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const detail = [data.error, data.response, data.code].filter(Boolean).join(" — ");
        throw new Error(detail || "Error desconocido");
      }
      toast.success(`Correo de prueba enviado a ${email}`);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setSendingSlug(null);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">Cargando correos...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Configuración de Correos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {enabledCount} plantillas activas · remitente {config.senderEmail}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/personalizar/correos/configuracion"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center gap-2"
          >
            <Settings className="w-4 h-4" /> Configuración general
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4 mb-6">
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Remitente actual</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Estos datos se usarán en todos los correos automáticos.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoBox label="Nombre remitente" value={config.senderName} />
            <InfoBox label="Email remitente" value={config.senderEmail} />
            <InfoBox label="Reply-to" value={config.replyToEmail} />
            <InfoBox label="Email soporte" value={config.supportEmail} />
          </div>
        </div>

        <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Correo de prueba</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Introduce un email y pulsa el botón de prueba en cada plantilla para verificar que se envía correctamente.
          </p>
          <label className="block text-sm">
            <span className="block mb-1 text-gray-500 dark:text-gray-400">Dirección de destino</span>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
            />
          </label>
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            Se enviarán datos de ejemplo (nombre, número de pedido ficticio, etc.)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EMAIL_TEMPLATES.map((template) => {
          const templateState = config.templates[template.slug];
          const isSending = sendingSlug === template.slug;
          return (
            <article
              key={template.slug}
              className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{template.name}</h3>
                    <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {template.category}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        templateState.enabled
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {templateState.enabled ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
                </div>
                <Link
                  href={template.route}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary shrink-0"
                >
                  Configurar <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 truncate">{templateState.subject}</p>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => sendTest(template.slug)}
                  disabled={isSending}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSending ? "Enviando..." : "Enviar prueba"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="text-xs uppercase tracking-wider text-gray-400">{label}</div>
      <div className="mt-2 font-semibold text-gray-900 dark:text-white break-all">{value}</div>
    </div>
  );
}
