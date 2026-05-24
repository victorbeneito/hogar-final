"use client";

import { useEffect, useState, useRef } from "react";
import { FaGlobe } from "react-icons/fa";

const IDIOMAS = [
  { codigo: "es", etiqueta: "Español", bandera: "🇪🇸" },
  { codigo: "en", etiqueta: "English", bandera: "🇬🇧" },
  { codigo: "pt", etiqueta: "Português", bandera: "🇵🇹" },
  { codigo: "de", etiqueta: "Deutsch", bandera: "🇩🇪" },
  { codigo: "fr", etiqueta: "Français", bandera: "🇫🇷" },
  { codigo: "nl", etiqueta: "Nederlands", bandera: "🇳🇱" },
  { codigo: "it", etiqueta: "Italiano", bandera: "🇮🇹" },
];

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: { translate: { TranslateElement: new (opts: object, id: string) => void } };
  }
}

export default function GoogleTranslate() {
  const [isOpen, setIsOpen] = useState(false);
  const [idiomaActual, setIdiomaActual] = useState("es");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        { pageLanguage: "es", autoDisplay: false },
        "google_translate_element"
      );
    };

    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.head.appendChild(script);
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cambiarIdioma = (codigo: string) => {
    if (codigo === "es") {
      // Limpiar cookie de Google Translate y recargar para restaurar original
      const expires = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
      document.cookie = `googtrans=; ${expires}; path=/`;
      document.cookie = `googtrans=; ${expires}; path=/; domain=.${window.location.hostname}`;
      setIdiomaActual("es");
      setIsOpen(false);
      window.location.reload();
      return;
    }

    const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (select) {
      select.value = codigo;
      select.dispatchEvent(new Event("change"));
    }
    setIdiomaActual(codigo);
    setIsOpen(false);
  };

  const idiomaActualObj = IDIOMAS.find((i) => i.codigo === idiomaActual) ?? IDIOMAS[0];

  return (
    <>
      <div id="google_translate_element" className="hidden" />

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full p-2 transition-transform hover:scale-110 flex items-center gap-1"
          aria-label="Cambiar idioma"
          title="Cambiar idioma"
        >
          <FaGlobe />
          <span className="text-xs hidden sm:inline">{idiomaActualObj.bandera}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-[100] min-w-40">
            {IDIOMAS.map((idioma) => (
              <button
                key={idioma.codigo}
                onClick={() => cambiarIdioma(idioma.codigo)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors ${
                  idiomaActual === idioma.codigo
                    ? "text-primary font-semibold bg-blue-50 dark:bg-blue-900/20"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                <span className="text-base">{idioma.bandera}</span>
                <span>{idioma.etiqueta}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
