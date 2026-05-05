export type CmsPageSlug =
  | "aviso-legal"
  | "terminos-y-condiciones"
  | "preguntas-frecuentes"
  | "politica-de-cookies"
  | "politica-privacidad"
  | "formulario-desistimiento"
  | "contacto";

export type CmsPageDefinition = {
  slug: CmsPageSlug;
  label: string;
  route: string;
  description: string;
  defaultTitle: string;
  defaultExcerpt: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  defaultContentHtml: string;
};

export type CmsPageConfig = {
  slug: CmsPageSlug;
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  contentHtml: string;
  active: boolean;
};

export type CmsSettingsConfig = {
  pages: Record<CmsPageSlug, CmsPageConfig>;
};

export const CMS_PAGE_DEFINITIONS: CmsPageDefinition[] = [
  {
    slug: "aviso-legal",
    label: "Aviso legal",
    route: "/cms/aviso-legal",
    description: "Texto legal principal con la identificación de la web y condiciones de uso.",
    defaultTitle: "Aviso legal",
    defaultExcerpt: "Información legal y titularidad del sitio web.",
    defaultMetaTitle: "Aviso legal | El Hogar de tus Sueños",
    defaultMetaDescription: "Consulta el aviso legal de El Hogar de tus Sueños.",
    defaultContentHtml:
      "<p>Completa aquí el contenido del aviso legal. Puedes pegar el HTML que ya tengas preparado.</p>",
  },
  {
    slug: "terminos-y-condiciones",
    label: "Términos y condiciones",
    route: "/cms/terminos-y-condiciones",
    description: "Condiciones generales de compra, uso de la tienda y contratación.",
    defaultTitle: "Términos y condiciones",
    defaultExcerpt: "Condiciones generales de contratación y compra.",
    defaultMetaTitle: "Términos y condiciones | El Hogar de tus Sueños",
    defaultMetaDescription: "Consulta los términos y condiciones de compra.",
    defaultContentHtml:
      "<p>Completa aquí los términos y condiciones de la tienda. Puedes pegar el texto HTML final en esta zona.</p>",
  },
  {
    slug: "preguntas-frecuentes",
    label: "Preguntas frecuentes",
    route: "/cms/preguntas-frecuentes",
    description: "Página de dudas frecuentes para ayudar antes y después de la compra.",
    defaultTitle: "Preguntas frecuentes",
    defaultExcerpt: "Respuestas a las dudas más habituales.",
    defaultMetaTitle: "Preguntas frecuentes | El Hogar de tus Sueños",
    defaultMetaDescription: "Resolvemos las preguntas más frecuentes de la tienda.",
    defaultContentHtml:
      "<p>Completa aquí las preguntas frecuentes. Puedes estructurarlas con títulos, párrafos y listas.</p>",
  },
  {
    slug: "politica-de-cookies",
    label: "Política de Cookies",
    route: "/cms/politica-de-cookies",
    description: "Información sobre el uso de cookies y preferencias del navegador.",
    defaultTitle: "Política de Cookies",
    defaultExcerpt: "Detalles sobre cookies técnicas y de preferencias.",
    defaultMetaTitle: "Política de Cookies | El Hogar de tus Sueños",
    defaultMetaDescription: "Consulta la política de cookies de la tienda.",
    defaultContentHtml:
      "<p>Completa aquí el contenido de la política de cookies. Puedes reutilizar el texto legal que tengas preparado.</p>",
  },
  {
    slug: "politica-privacidad",
    label: "Política privacidad",
    route: "/cms/politica-privacidad",
    description: "Tratamiento de datos personales, finalidades y derechos del usuario.",
    defaultTitle: "Política de privacidad",
    defaultExcerpt: "Cómo tratamos y protegemos tus datos.",
    defaultMetaTitle: "Política de privacidad | El Hogar de tus Sueños",
    defaultMetaDescription: "Consulta la política de privacidad de la tienda.",
    defaultContentHtml:
      "<p>Completa aquí la política de privacidad. Este contenido puede pegarse directamente en HTML.</p>",
  },
  {
    slug: "formulario-desistimiento",
    label: "Formulario de desistimiento",
    route: "/cms/formulario-desistimiento",
    description: "Modelo o instrucciones para ejercer el derecho de desistimiento.",
    defaultTitle: "Formulario de desistimiento",
    defaultExcerpt: "Información para tramitar desistimientos y devoluciones.",
    defaultMetaTitle: "Formulario de desistimiento | El Hogar de tus Sueños",
    defaultMetaDescription: "Consulta el formulario de desistimiento de la tienda.",
    defaultContentHtml:
      "<p>Completa aquí el formulario o las instrucciones de desistimiento.</p>",
  },
  {
    slug: "contacto",
    label: "Contacto con nosotros",
    route: "/cms/contacto",
    description: "Página de contacto con teléfonos, correo y horarios.",
    defaultTitle: "Contacto con nosotros",
    defaultExcerpt: "Datos de contacto y atención al cliente.",
    defaultMetaTitle: "Contacto con nosotros | El Hogar de tus Sueños",
    defaultMetaDescription: "Consulta los datos de contacto de la tienda.",
    defaultContentHtml:
      "<p>Completa aquí la página de contacto. Puedes incluir teléfonos, email, dirección y horarios.</p>",
  },
];

export function getCmsPageDefinition(slug: string) {
  return CMS_PAGE_DEFINITIONS.find((definition) => definition.slug === slug) ?? null;
}

export function getDefaultCmsSettings(): CmsSettingsConfig {
  return {
    pages: Object.fromEntries(
      CMS_PAGE_DEFINITIONS.map((definition) => [definition.slug, createDefaultPage(definition)])
    ) as Record<CmsPageSlug, CmsPageConfig>,
  };
}

export function normalizeCmsSettings(input: any): CmsSettingsConfig {
  const source = input && typeof input === "object" ? input : {};
  const sourcePages = source.pages && typeof source.pages === "object" ? source.pages : {};

  return {
    pages: Object.fromEntries(
      CMS_PAGE_DEFINITIONS.map((definition) => {
        const current = sourcePages[definition.slug] ?? {};
        return [
          definition.slug,
          {
            slug: definition.slug,
            title: String(current.title ?? definition.defaultTitle),
            excerpt: String(current.excerpt ?? definition.defaultExcerpt),
            metaTitle: String(current.metaTitle ?? definition.defaultMetaTitle),
            metaDescription: String(current.metaDescription ?? definition.defaultMetaDescription),
            contentHtml: String(current.contentHtml ?? definition.defaultContentHtml),
            active: current.active !== undefined ? Boolean(current.active) : true,
          },
        ];
      })
    ) as Record<CmsPageSlug, CmsPageConfig>,
  };
}

function createDefaultPage(definition: CmsPageDefinition): CmsPageConfig {
  return {
    slug: definition.slug,
    title: definition.defaultTitle,
    excerpt: definition.defaultExcerpt,
    metaTitle: definition.defaultMetaTitle,
    metaDescription: definition.defaultMetaDescription,
    contentHtml: definition.defaultContentHtml,
    active: true,
  };
}
