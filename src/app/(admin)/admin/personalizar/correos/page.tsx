"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowRight, RefreshCw, Mail, Settings } from "lucide-react";
import { EMAIL_TEMPLATES, getDefaultEmailSettings, normalizeEmailSettings, type EmailSettingsConfig } from "@/lib/emailConfig";

export default function ConfiguracionCorreosPage() {
  const [config, setConfig] = useState<EmailSettingsConfig>(getDefaultEmailSettings());
  const [loading, setLoading] = useState(true);

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
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Formato recomendado</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Te recomiendo usar un diseño limpio con logo, saludo personalizado y enlaces de acceso al pedido o la cuenta.
          </p>
          <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-600 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">Variables disponibles</p>
            <p>{EMAIL_TEMPLATES.flatMap((template) => template.variables).slice(0, 8).join(" · ")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EMAIL_TEMPLATES.map((template) => {
          const templateState = config.templates[template.slug];
          return (
            <article
              key={template.slug}
              className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5 md:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
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
                  className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary"
                >
                  Configurar <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="mt-4 text-xs text-gray-400">{templateState.subject}</p>
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
