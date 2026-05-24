"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Cookie, ChevronDown, ChevronUp, Shield, BarChart2, Settings2 } from "lucide-react";

type ConsentPreferences = {
  necesarias: true;
  analiticas: boolean;
  personalizacion: boolean;
  timestamp: number;
};

const STORAGE_KEY = "cookie_consent";
const CONSENT_DURATION_DAYS = 365;

function isConsentValid(stored: ConsentPreferences): boolean {
  const expiresAt = stored.timestamp + CONSENT_DURATION_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() < expiresAt;
}

function loadConsent(): ConsentPreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentPreferences;
    if (!isConsentValid(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(prefs: Omit<ConsentPreferences, "necesarias" | "timestamp">) {
  const consent: ConsentPreferences = {
    necesarias: true,
    ...prefs,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: consent }));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [analiticas, setAnaliticas] = useState(false);
  const [personalizacion, setPersonalizacion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = loadConsent();
    if (!stored) {
      setVisible(true);
    }

    const handleOpen = () => {
      const stored = loadConsent();
      if (stored) {
        setAnaliticas(stored.analiticas);
        setPersonalizacion(stored.personalizacion);
      }
      setShowConfig(true);
      setVisible(true);
    };
    window.addEventListener("openCookieSettings", handleOpen);
    return () => window.removeEventListener("openCookieSettings", handleOpen);
  }, []);

  if (!mounted || !visible) return null;

  const handleAcceptAll = () => {
    saveConsent({ analiticas: true, personalizacion: true });
    setVisible(false);
    setShowConfig(false);
  };

  const handleRejectAll = () => {
    saveConsent({ analiticas: false, personalizacion: false });
    setVisible(false);
    setShowConfig(false);
  };

  const handleSaveConfig = () => {
    saveConsent({ analiticas, personalizacion });
    setVisible(false);
    setShowConfig(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-3 md:p-4"
      role="dialog"
      aria-label="Aviso de cookies"
    >
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Banner principal */}
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-3 mb-4">
            <Cookie className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 dark:text-white text-base">
                Usamos cookies
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Utilizamos cookies propias y de terceros para mejorar tu experiencia, analizar el tráfico y personalizar contenido. Puedes aceptar todas, rechazar las opcionales o configurarlas a tu medida.{" "}
                <Link href="/account/cookies" className="text-primary hover:underline font-medium">
                  Política de cookies
                </Link>
              </p>
            </div>
          </div>

          {/* Panel de configuración expandible */}
          {showConfig && (
            <div className="mb-4 space-y-3 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
              {/* Necesarias */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Necesarias</p>
                    <p className="text-xs text-gray-400">Sesión, carrito, seguridad. Siempre activas.</p>
                  </div>
                </div>
                <div className="w-10 h-5 bg-green-500 rounded-full flex items-center justify-end px-1 cursor-not-allowed opacity-70">
                  <div className="w-3.5 h-3.5 bg-white rounded-full" />
                </div>
              </div>

              {/* Analíticas */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Analíticas</p>
                    <p className="text-xs text-gray-400">Estadísticas de uso para mejorar la web.</p>
                  </div>
                </div>
                <button
                  onClick={() => setAnaliticas((v) => !v)}
                  className={`w-10 h-5 rounded-full flex items-center transition-colors duration-200 px-1 ${
                    analiticas ? "bg-primary justify-end" : "bg-gray-300 dark:bg-gray-600 justify-start"
                  }`}
                  aria-checked={analiticas}
                  role="switch"
                  aria-label="Cookies analíticas"
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow" />
                </button>
              </div>

              {/* Personalización */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Personalización</p>
                    <p className="text-xs text-gray-400">Idioma, modo oscuro, preferencias.</p>
                  </div>
                </div>
                <button
                  onClick={() => setPersonalizacion((v) => !v)}
                  className={`w-10 h-5 rounded-full flex items-center transition-colors duration-200 px-1 ${
                    personalizacion ? "bg-primary justify-end" : "bg-gray-300 dark:bg-gray-600 justify-start"
                  }`}
                  aria-checked={personalizacion}
                  role="switch"
                  aria-label="Cookies de personalización"
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow" />
                </button>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAcceptAll}
              className="flex-1 min-w-[130px] bg-primary text-white font-semibold text-sm py-2.5 px-4 rounded-xl hover:opacity-90 transition"
            >
              Aceptar todo
            </button>
            <button
              onClick={handleRejectAll}
              className="flex-1 min-w-[130px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm py-2.5 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Solo necesarias
            </button>
            {showConfig ? (
              <button
                onClick={handleSaveConfig}
                className="flex-1 min-w-[130px] border border-primary text-primary font-semibold text-sm py-2.5 px-4 rounded-xl hover:bg-primary/5 transition"
              >
                Guardar selección
              </button>
            ) : (
              <button
                onClick={() => setShowConfig(true)}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition font-medium px-2"
              >
                Configurar
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
