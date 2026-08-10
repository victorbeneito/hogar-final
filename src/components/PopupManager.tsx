"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { normalizarPopup, popupAplicaARuta, type Popup } from "@/lib/popups";

type EstadoVisitante = { veces: number; ultima: number };

/** Clave por navegador. Incluye resetToken para poder reiniciar el contador desde el admin. */
function claveEstado(popup: Popup) {
  return `popup:${popup.id}:${popup.resetToken}`;
}

function leerEstado(popup: Popup): EstadoVisitante {
  try {
    const raw = localStorage.getItem(claveEstado(popup));
    if (!raw) return { veces: 0, ultima: 0 };
    const parsed = JSON.parse(raw);
    return {
      veces: Number(parsed?.veces) || 0,
      ultima: Number(parsed?.ultima) || 0,
    };
  } catch {
    return { veces: 0, ultima: 0 };
  }
}

function guardarEstado(popup: Popup, estado: EstadoVisitante) {
  try {
    localStorage.setItem(claveEstado(popup), JSON.stringify(estado));
  } catch {
    /* localStorage lleno o bloqueado: el pop-up seguirá funcionando, solo no recuerda las veces */
  }
}

function puedeMostrarse(popup: Popup): boolean {
  const { veces, ultima } = leerEstado(popup);
  if (popup.repeticiones > 0 && veces >= popup.repeticiones) return false;
  if (popup.intervaloMinutos > 0 && ultima > 0) {
    if (Date.now() - ultima < popup.intervaloMinutos * 60_000) return false;
  }
  return true;
}

export default function PopupManager() {
  const pathname = usePathname();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [visible, setVisible] = useState<Popup | null>(null);
  const temporizadores = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // Los pop-ups se cargan una sola vez por navegación completa.
  useEffect(() => {
    let activo = true;

    fetch("/api/popups/activos", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!activo) return;
        const lista = Array.isArray(data?.popups) ? data.popups.map(normalizarPopup) : [];
        setPopups(lista);
      })
      .catch(() => {
        /* si falla, la tienda sigue funcionando sin pop-ups */
      });

    return () => {
      activo = false;
    };
  }, []);

  // En cada cambio de página se reevalúa qué pop-up toca mostrar.
  useEffect(() => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current = [];
    setVisible(null);

    if (!pathname || popups.length === 0) return;

    const candidato = popups.find((popup) => popupAplicaARuta(popup, pathname) && puedeMostrarse(popup));
    if (!candidato) return;

    const abrir = setTimeout(() => {
      const estado = leerEstado(candidato);
      guardarEstado(candidato, { veces: estado.veces + 1, ultima: Date.now() });
      setVisible(candidato);

      if (candidato.duracionSegundos > 0) {
        const cerrar = setTimeout(() => setVisible(null), candidato.duracionSegundos * 1000);
        temporizadores.current.push(cerrar);
      }
    }, Math.max(0, candidato.delaySegundos) * 1000);

    temporizadores.current.push(abrir);

    return () => {
      temporizadores.current.forEach(clearTimeout);
      temporizadores.current = [];
    };
  }, [pathname, popups]);

  // Cerrar con la tecla Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!visible) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(null);
    };
    const overflowPrevio = document.body.style.overflow;

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowPrevio;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={visible.nombre}
      onClick={() => {
        if (visible.cerrarConFondo) setVisible(null);
      }}
    >
      <div
        className="relative w-full max-h-[90vh] overflow-auto rounded-2xl bg-white dark:bg-darkNavBg shadow-2xl"
        style={{ maxWidth: `${visible.anchoMaximo || 800}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {visible.mostrarBotonCerrar && (
          <button
            type="button"
            onClick={() => setVisible(null)}
            aria-label="Cerrar"
            className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div
          className="popup-contenido [&_img]:w-full [&_img]:h-auto [&_img]:block"
          dangerouslySetInnerHTML={{ __html: visible.html }}
        />
      </div>
    </div>
  );
}
