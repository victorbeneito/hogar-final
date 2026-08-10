/**
 * Módulo Pop-ups: tipos, valores por defecto y utilidades compartidas
 * entre el panel de administración, la API pública y el componente de tienda.
 *
 * La configuración vive dentro del JSON del módulo `popups`
 * (tabla `configuracion`, clave `modulos_integraciones`).
 */

export type Popup = {
  id: string;
  nombre: string;
  activo: boolean;
  /** Contenido HTML del pop-up (imagen, texto, enlaces...) */
  html: string;
  /** Rutas donde debe aparecer. Admite comodín final: "*", "/productos/*" */
  paginas: string[];
  /** Segundos que espera desde que carga la página antes de mostrarse */
  delaySegundos: number;
  /** Segundos que permanece visible. 0 = hasta que el cliente lo cierre */
  duracionSegundos: number;
  /** Veces máximas que se muestra a un mismo visitante. 0 = sin límite */
  repeticiones: number;
  /** Minutos mínimos entre una aparición y la siguiente */
  intervaloMinutos: number;
  /** Fechas de campaña en formato YYYY-MM-DD. Vacío = sin límite */
  fechaInicio: string;
  fechaFin: string;
  /** Ancho máximo de la ventana en píxeles */
  anchoMaximo: number;
  /** Cerrar al hacer clic fuera del pop-up */
  cerrarConFondo: boolean;
  /** Mostrar la X de cierre */
  mostrarBotonCerrar: boolean;
  /**
   * Cambiar este valor reinicia el contador de visualizaciones de todos los
   * visitantes (forma parte de la clave que se guarda en su navegador).
   */
  resetToken: string;
};

export type PopupsConfig = {
  activa: boolean;
  popups: Popup[];
};

export const POPUPS_DEFAULTS: PopupsConfig = {
  activa: false,
  popups: [],
};

/** Rutas más habituales de la tienda, para marcarlas con un clic en el admin. */
export const PAGINAS_PRESET: Array<{ patron: string; etiqueta: string }> = [
  { patron: "*", etiqueta: "Todas las páginas" },
  { patron: "/", etiqueta: "Inicio" },
  { patron: "/productos/*", etiqueta: "Fichas de producto" },
  { patron: "/categorias/*", etiqueta: "Categorías" },
  { patron: "/carrito", etiqueta: "Carrito" },
  { patron: "/checkout/*", etiqueta: "Checkout" },
  { patron: "/blog*", etiqueta: "Blog" },
  { patron: "/cms/*", etiqueta: "Páginas CMS" },
];

export function nuevoPopup(): Popup {
  return {
    id: `popup_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    nombre: "Nuevo pop-up",
    activo: false,
    html: "",
    paginas: ["/"],
    delaySegundos: 2,
    duracionSegundos: 0,
    repeticiones: 3,
    intervaloMinutos: 60,
    fechaInicio: "",
    fechaFin: "",
    anchoMaximo: 800,
    cerrarConFondo: true,
    mostrarBotonCerrar: true,
    resetToken: Math.random().toString(36).slice(2, 8),
  };
}

/** Rellena los campos que falten para que un pop-up guardado antiguo no rompa la UI. */
export function normalizarPopup(raw: any): Popup {
  const base = nuevoPopup();
  return {
    ...base,
    ...raw,
    id: String(raw?.id ?? base.id),
    nombre: String(raw?.nombre ?? base.nombre),
    activo: Boolean(raw?.activo),
    html: String(raw?.html ?? ""),
    paginas: Array.isArray(raw?.paginas) ? raw.paginas.map(String).filter(Boolean) : [],
    delaySegundos: numeroSeguro(raw?.delaySegundos, base.delaySegundos),
    duracionSegundos: numeroSeguro(raw?.duracionSegundos, base.duracionSegundos),
    repeticiones: numeroSeguro(raw?.repeticiones, base.repeticiones),
    intervaloMinutos: numeroSeguro(raw?.intervaloMinutos, base.intervaloMinutos),
    fechaInicio: String(raw?.fechaInicio ?? ""),
    fechaFin: String(raw?.fechaFin ?? ""),
    anchoMaximo: numeroSeguro(raw?.anchoMaximo, base.anchoMaximo),
    cerrarConFondo: raw?.cerrarConFondo !== false,
    mostrarBotonCerrar: raw?.mostrarBotonCerrar !== false,
    resetToken: String(raw?.resetToken ?? base.resetToken),
  };
}

function numeroSeguro(valor: any, porDefecto: number) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : porDefecto;
}

export function normalizarConfig(raw: any): PopupsConfig {
  return {
    activa: Boolean(raw?.activa),
    popups: Array.isArray(raw?.popups) ? raw.popups.map(normalizarPopup) : [],
  };
}

/**
 * ¿La ruta actual encaja con el patrón configurado?
 * - "*"            → todas las páginas
 * - "/carrito"     → coincidencia exacta
 * - "/productos/*" → esa ruta y todo lo que cuelga de ella
 * - "/blog*"       → cualquier ruta que empiece por /blog
 */
export function rutaCoincide(patron: string, ruta: string): boolean {
  const p = (patron || "").trim();
  if (!p) return false;
  if (p === "*" || p === "/*") return true;

  const limpia = (valor: string) => (valor.length > 1 ? valor.replace(/\/+$/, "") : valor);
  const rutaLimpia = limpia(ruta);

  if (p.endsWith("/*")) {
    const prefijo = limpia(p.slice(0, -2));
    return rutaLimpia === prefijo || rutaLimpia.startsWith(`${prefijo}/`);
  }

  if (p.endsWith("*")) {
    return rutaLimpia.startsWith(p.slice(0, -1));
  }

  return rutaLimpia === limpia(p);
}

export function popupAplicaARuta(popup: Popup, ruta: string): boolean {
  return popup.paginas.some((patron) => rutaCoincide(patron, ruta));
}

/** Comprueba el rango de fechas de campaña (inclusive en ambos extremos). */
export function popupEnFecha(popup: Popup, ahora = new Date()): boolean {
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(
    ahora.getDate()
  ).padStart(2, "0")}`;
  if (popup.fechaInicio && hoy < popup.fechaInicio) return false;
  if (popup.fechaFin && hoy > popup.fechaFin) return false;
  return true;
}
