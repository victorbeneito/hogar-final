/**
 * Consent Mode v2 de Google: el puente entre el aviso de cookies y las etiquetas.
 *
 * Qué problema resuelve
 * ---------------------
 * El banner de CookieConsent.tsx guardaba la respuesta del visitante en localStorage y no
 * hacía nada más con ella: GA4 y las etiquetas de Google Ads se disparaban igual aceptara o
 * rechazara. Aquí se traduce esa respuesta al lenguaje que entiende Google y se le comunica.
 *
 * Cómo funciona, en dos tiempos
 * -----------------------------
 *  1. **Antes** de que cargue nada de Google se declara el estado por defecto
 *     (`SCRIPT_CONSENTIMIENTO_POR_DEFECTO`, que va incrustado en el layout raíz). Esto es
 *     obligatorio: si el estado llega después de que las etiquetas hayan arrancado, Google lo
 *     ignora y da el consentimiento por ausente.
 *  2. **Cuando** el visitante pulsa un botón del banner se manda una actualización con
 *     `aplicarConsentimiento()`. Las etiquetas que estaban esperando se activan en ese momento.
 *
 * Qué significa "denegado"
 * ------------------------
 * No es que las etiquetas dejen de existir: siguen cargando, pero sin escribir cookies y
 * enviando señales anónimas que Google usa para modelar. Es el "modo avanzado" del Consent
 * Mode, y es lo que permite que Ads siga aprendiendo algo de quien no acepta. Aun así, lo
 * medido baja respecto a las ventas reales del panel: es el comportamiento correcto y esperado.
 *
 * Las cuatro señales que exige la v2 son `ad_storage`, `ad_user_data`, `ad_personalization` y
 * `analytics_storage`. Las tres primeras van juntas bajo la categoría "publicidad" del banner:
 * separarlas daría al visitante una decisión que no sabría tomar y a nosotros una combinación
 * que no sabríamos respetar.
 */

export const CLAVE_CONSENTIMIENTO = "cookie_consent";
export const DURACION_CONSENTIMIENTO_DIAS = 365;

/**
 * Versión del consentimiento. Subirla invalida las respuestas guardadas y vuelve a mostrar el
 * banner a todo el mundo.
 *
 * Se subió a 2 al añadir la categoría de publicidad: quien aceptó con la versión 1 nunca fue
 * preguntado por las cookies publicitarias, así que su "sí" no las cubre y no se le puede dar
 * por consentidas. Es la razón por la que el aviso reaparece tras este cambio.
 */
export const VERSION_CONSENTIMIENTO = 2;

export type PreferenciasConsentimiento = {
  necesarias: true;
  analiticas: boolean;
  publicidad: boolean;
  personalizacion: boolean;
  version: number;
  timestamp: number;
};

type EstadoSenal = "granted" | "denied";

/** Traduce la respuesta del banner a las señales de Google. */
export function senalesDesdePreferencias(
  prefs: Pick<PreferenciasConsentimiento, "analiticas" | "publicidad" | "personalizacion">
): Record<string, EstadoSenal> {
  const si = (valor: boolean): EstadoSenal => (valor ? "granted" : "denied");

  return {
    ad_storage: si(prefs.publicidad),
    ad_user_data: si(prefs.publicidad),
    ad_personalization: si(prefs.publicidad),
    analytics_storage: si(prefs.analiticas),
    functionality_storage: si(prefs.personalizacion),
    personalization_storage: si(prefs.personalizacion),
    // Nunca se pide: cubre lo imprescindible para que el sitio funcione de forma segura
    // (sesión, carrito, antifraude). Denegarlo rompería la tienda y la ley no lo exige.
    security_storage: "granted",
  };
}

/** Lee la respuesta guardada, o null si no hay, caducó o es de una versión anterior. */
export function leerConsentimiento(): PreferenciasConsentimiento | null {
  if (typeof window === "undefined") return null;

  try {
    const crudo = localStorage.getItem(CLAVE_CONSENTIMIENTO);
    if (!crudo) return null;

    const guardado = JSON.parse(crudo) as PreferenciasConsentimiento;
    const caduca = guardado.timestamp + DURACION_CONSENTIMIENTO_DIAS * 24 * 60 * 60 * 1000;

    if (guardado.version !== VERSION_CONSENTIMIENTO || Date.now() >= caduca) {
      localStorage.removeItem(CLAVE_CONSENTIMIENTO);
      return null;
    }

    return guardado;
  } catch {
    return null;
  }
}

/**
 * Guarda la respuesta y se la comunica a Google en el mismo acto.
 *
 * Van juntas a propósito: si se guardara sin avisar a las etiquetas, el visitante habría
 * aceptado y nadie se habría enterado hasta la siguiente página.
 */
export function guardarConsentimiento(
  prefs: Pick<PreferenciasConsentimiento, "analiticas" | "publicidad" | "personalizacion">
): PreferenciasConsentimiento {
  const consentimiento: PreferenciasConsentimiento = {
    necesarias: true,
    ...prefs,
    version: VERSION_CONSENTIMIENTO,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(CLAVE_CONSENTIMIENTO, JSON.stringify(consentimiento));
  } catch {
    // Sin localStorage la decisión no sobrevive a la recarga, pero sí vale para esta visita.
  }

  aplicarConsentimiento(consentimiento);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: consentimiento }));
  }

  return consentimiento;
}

/** Comunica a Google un cambio de consentimiento. */
export function aplicarConsentimiento(
  prefs: Pick<PreferenciasConsentimiento, "analiticas" | "publicidad" | "personalizacion">
) {
  if (typeof window === "undefined") return;

  try {
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];

    // Los comandos de consentimiento viajan como el objeto `arguments`, no como un array
    // normal: es el formato que espera gtag.js, y por eso esto es una función clásica y no
    // una flecha (las flechas no tienen `arguments`). El tipo se declara aparte para que
    // TypeScript acepte las llamadas con argumentos mientras el cuerpo los lee así.
    const gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    } as (...args: unknown[]) => void;

    gtag("consent", "update", senalesDesdePreferencias(prefs));
    // Sin publicidad consentida, Google recorta los identificadores de los datos que recibe.
    gtag("set", "ads_data_redaction", !prefs.publicidad);
  } catch {
    // Que falle la analítica nunca debe impedir navegar por la tienda.
  }
}

/**
 * Script que declara el estado por defecto. Se incrusta tal cual en el layout raíz, **antes**
 * que el contenedor de Tag Manager.
 *
 * Es JavaScript plano y no un componente porque tiene que ejecutarse mientras el navegador
 * está leyendo el HTML, antes de que React hidrate: para cuando un efecto de React pudiera
 * anunciarlo, las etiquetas de Google ya habrían arrancado sin saber nada.
 *
 * Lee además la respuesta ya guardada, para que quien visitó antes y aceptó no pase por un
 * instante en "denegado" al entrar: su decisión se aplica desde la primera línea.
 */
export const SCRIPT_CONSENTIMIENTO_POR_DEFECTO = `
(function(){
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }

  var estado = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted'
  };

  try {
    var crudo = localStorage.getItem(${JSON.stringify(CLAVE_CONSENTIMIENTO)});
    if (crudo) {
      var p = JSON.parse(crudo);
      var vigente = p
        && p.version === ${VERSION_CONSENTIMIENTO}
        && (Date.now() - p.timestamp) < ${DURACION_CONSENTIMIENTO_DIAS} * 86400000;
      if (vigente) {
        var si = function(v){ return v ? 'granted' : 'denied'; };
        estado.analytics_storage = si(p.analiticas);
        estado.ad_storage = si(p.publicidad);
        estado.ad_user_data = si(p.publicidad);
        estado.ad_personalization = si(p.publicidad);
        estado.functionality_storage = si(p.personalizacion);
        estado.personalization_storage = si(p.personalizacion);
      }
    }
  } catch (e) {}

  gtag('consent', 'default', estado);
  gtag('set', 'ads_data_redaction', estado.ad_storage !== 'granted');
  // Conserva el gclid de las campañas entre páginas cuando no hay cookies de publicidad,
  // para que una compra siga pudiendo atribuirse al anuncio que la trajo.
  gtag('set', 'url_passthrough', true);
})();
`;
