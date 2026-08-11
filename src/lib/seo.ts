/**
 * Utilidades de SEO compartidas.
 *
 * El dominio NO se escribe aquí: vive en src/lib/urls.ts, que es la fuente única.
 */

/** Nombre de la marca, tal y como aparece en la plantilla de títulos del layout raíz. */
export const SITE_NAME = "El Hogar de tus Sueños";

/**
 * Datos de contacto públicos de la tienda.
 *
 * Se escriben aquí y NO se leen de `facturas_configuracion`, aunque allí haya campos
 * parecidos, por dos motivos:
 *
 * 1. Aquella configuración contiene los datos **fiscales** del titular (NIF, dirección
 *    del domicilio). Son datos personales y no deben acabar en el HTML público.
 * 2. Sus campos `email` y `web` apuntan hoy a `elhogardetussuenos.com`, con doble "s",
 *    un dominio que no existe. Publicarlo en los datos estructurados le diría a Google
 *    que la tienda tiene un correo que no recibe.
 *
 * Los teléfonos coinciden con los de `BannerContacto.tsx` y el pie de página.
 */
export const CONTACTO = {
  email: "info@elhogardetusuenos.com",
  telefonos: ["+34961154226", "+34684004525"],
  localidad: "Ontinyent",
  provincia: "Valencia",
  pais: "ES",
  logo: "/img/logo-hogar-claro.jpg",
} as const;

/**
 * Perfiles en redes sociales, para la propiedad `sameAs` de `Organization`.
 *
 * Vacío a propósito: no hay ninguna URL de redes en el código ni en la configuración,
 * y `sameAs` con direcciones inventadas es peor que no ponerlo. Cuando se tengan las
 * reales (Facebook, Instagram...), se añaden aquí y aparecen solas en el JSON-LD.
 */
export const REDES_SOCIALES: string[] = [];

/**
 * Quita la marca del final de un título.
 *
 * `src/app/layout.tsx` define `template: "%s | El Hogar de tus Sueños"`, así que Next
 * añade la marca a TODO título que no la traiga ya. Cuando el título de origen
 * (el metaTitle guardado en /admin/cms, o el sufijo del blog) también la incluye,
 * sale dos veces y el `<title>` se pasa de largo: Google lo corta hacia los 60
 * caracteres y lo que se pierde es el titular real, no la marca.
 *
 * Se aplica sobre valores que escribe el administrador a mano, por eso tolera
 * mayúsculas/minúsculas distintas, espacios de más y los separadores habituales
 * (| - – —). Si al quitarla no queda nada, se devuelve el título original: es
 * preferible una marca repetida a un <title> vacío.
 */
/**
 * JSON-LD de `Organization` para el layout raíz.
 *
 * Es lo que le dice a Google —y a ChatGPT, Perplexity y demás— quién está detrás de la
 * tienda. Sin esto la portada no tenía ni una etiqueta de datos estructurados.
 *
 * No incluye la dirección postal: la que hay en la configuración de facturas es el
 * domicilio fiscal del titular, y publicarlo en datos estructurados es una decisión
 * distinta de imprimirlo en una factura. Si algún día hay una dirección comercial que
 * se quiera hacer pública, se añade aquí un bloque `address` de tipo `PostalAddress`
 * y el tipo puede pasar a `LocalBusiness`.
 */
export function organizationJsonLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organizacion`,
    name: SITE_NAME,
    url: baseUrl,
    logo: `${baseUrl}${CONTACTO.logo}`,
    email: CONTACTO.email,
    telephone: CONTACTO.telefonos,
    areaServed: CONTACTO.pais,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: CONTACTO.telefonos[0],
      email: CONTACTO.email,
      availableLanguage: ["es"],
    },
    ...(REDES_SOCIALES.length > 0 && { sameAs: REDES_SOCIALES }),
  };
}

/** Quita etiquetas HTML y normaliza espacios y las entidades más comunes. */
function aTextoPlano(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Construye el JSON-LD `FAQPage` a partir del HTML de la página de preguntas frecuentes.
 *
 * Habilita el desplegable de preguntas en los resultados de Google, que ocupa bastante
 * más espacio que un resultado normal.
 *
 * El contenido se edita desde /admin/cms, así que el análisis es defensivo:
 *
 * - Toma cada `<h3>` como pregunta y todo lo que va detrás, hasta el siguiente `<h3>`,
 *   como respuesta. Es la estructura que tiene hoy la página.
 * - **Sólo acepta encabezados que contengan `?` o `¿`.** La página mezcla preguntas de
 *   verdad con encabezados que no lo son, y marcar "PRODUCTOS" como pregunta sería
 *   marcado incorrecto.
 * - Descarta los pares sin respuesta.
 * - Si no encuentra ninguno, devuelve `null` y la página no emite marcado. Un FAQPage
 *   vacío o mal formado es peor que ninguno: Google penaliza el marcado que no se
 *   corresponde con lo que ve el usuario.
 */
type ParFaq = {
  "@type": "Question";
  name: string;
  acceptedAnswer: { "@type": "Answer"; text: string };
};

function crearPar(pregunta: string, respuesta: string): ParFaq | null {
  if (!pregunta || !respuesta) return null;
  if (!/[?¿]/.test(pregunta)) return null;
  return {
    "@type": "Question",
    name: pregunta,
    acceptedAnswer: { "@type": "Answer", text: respuesta },
  };
}

/** Estrategia A: `<h3>pregunta</h3>` y todo lo que sigue hasta el próximo `<h3>`. */
function paresPorEncabezados(html: string): ParFaq[] {
  return html
    .split(/<h3[^>]*>/i)
    .slice(1)
    .map((bloque) => {
      const cierre = bloque.search(/<\/h3>/i);
      if (cierre === -1) return null;
      return crearPar(aTextoPlano(bloque.slice(0, cierre)), aTextoPlano(bloque.slice(cierre + 5)));
    })
    .filter((p): p is ParFaq => p !== null);
}

/**
 * Estrategia B: párrafos cuyo texto va **entero** en negrita son la pregunta, y los
 * párrafos siguientes (los que no van en negrita) son la respuesta.
 *
 * Es el formato que traía el contenido importado de PrestaShop:
 * `<p><span><b>¿Pregunta?</b></span></p><p><span>Respuesta</span></p>`
 */
function paresPorNegritas(html: string): ParFaq[] {
  const parrafos = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);

  const pares: ParFaq[] = [];
  let pregunta: string | null = null;
  let respuesta: string[] = [];

  const esPreguntaEnNegrita = (p: string) => {
    const negritas = [...p.matchAll(/<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi)]
      .map((m) => aTextoPlano(m[1]))
      .join(" ");
    const texto = aTextoPlano(p);
    // Todo el párrafo está en negrita (no sólo un fragmento suelto dentro del texto).
    return negritas.length > 0 && texto.length > 0 && negritas === texto;
  };

  const cerrar = () => {
    if (pregunta) {
      const par = crearPar(pregunta, respuesta.join(" ").trim());
      if (par) pares.push(par);
    }
    pregunta = null;
    respuesta = [];
  };

  for (const p of parrafos) {
    if (esPreguntaEnNegrita(p)) {
      cerrar();
      pregunta = aTextoPlano(p);
    } else if (pregunta) {
      const texto = aTextoPlano(p);
      if (texto) respuesta.push(texto);
    }
  }
  cerrar();

  return pares;
}

export function faqPageJsonLd(contenidoHtml: string, url: string) {
  if (!contenidoHtml) return null;

  // Se prueba primero por encabezados, que es el formato actual de la página. Si no
  // sale nada, se intenta el formato antiguo de negritas. Así el marcado sobrevive a
  // que alguien reescriba el contenido con el otro estilo.
  let preguntas = paresPorEncabezados(contenidoHtml);
  if (preguntas.length === 0) preguntas = paresPorNegritas(contenidoHtml);

  if (preguntas.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": url,
    mainEntity: preguntas,
  };
}

export function quitarMarcaDelTitulo(titulo: string): string {
  if (!titulo) return titulo;

  const marca = SITE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const limpio = titulo.replace(new RegExp(`\\s*[|\\-–—]\\s*${marca}\\s*$`, "i"), "").trim();

  return limpio.length > 0 ? limpio : titulo;
}
