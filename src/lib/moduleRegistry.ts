export type ModuleSlug = "redsys" | "paypal" | "revi" | "seo" | "cookies";

export type ModuleDefinition = {
  slug: ModuleSlug;
  name: string;
  description: string;
  category: string;
  route: string;
  icon: string;
  defaults: Record<string, any>;
  fields: Array<{ key: string; label: string; type: "text" | "number" | "boolean" | "select" | "multiselect"; options?: string[] }>;
};

export const MODULES: ModuleDefinition[] = [
  {
    slug: "redsys",
    name: "Redsys",
    description: "TPV virtual para pagos con tarjeta.",
    category: "Pago",
    route: "/admin/personalizar/modulos/redsys",
    icon: "Shield",
    defaults: {
      activa: false,
      merchantCode: "",
      terminal: "",
      entorno: "sandbox",
      secretKey: "",
      orderState: "PAGADO",
      allowRetry: true,
      logRequests: true,
    },
    fields: [
      { key: "activa", label: "Activo", type: "boolean" },
      { key: "merchantCode", label: "Código comercio", type: "text" },
      { key: "terminal", label: "Terminal", type: "text" },
      { key: "entorno", label: "Entorno", type: "select", options: ["sandbox", "produccion"] },
      { key: "secretKey", label: "Clave secreta SHA-256", type: "text" },
      { key: "orderState", label: "Estado tras pago", type: "text" },
      { key: "allowRetry", label: "Permitir reintentar", type: "boolean" },
      { key: "logRequests", label: "Registrar logs", type: "boolean" },
    ],
  },
  {
    slug: "paypal",
    name: "PayPal",
    description: "Pasarela PayPal con credenciales y entorno.",
    category: "Pago",
    route: "/admin/personalizar/modulos/paypal",
    icon: "Star",
    defaults: {
      activa: false,
      clientId: "",
      clientSecret: "",
      entorno: "sandbox",
      currency: "EUR",
    },
    fields: [
      { key: "activa", label: "Activo", type: "boolean" },
      { key: "clientId", label: "Client ID", type: "text" },
      { key: "clientSecret", label: "Client Secret", type: "text" },
      { key: "entorno", label: "Entorno", type: "select", options: ["sandbox", "produccion"] },
      { key: "currency", label: "Moneda", type: "text" },
    ],
  },
  {
    slug: "revi",
    name: "Revi",
    description: "Módulo de valoraciones y reseñas.",
    category: "Marketing",
    route: "/admin/personalizar/modulos/revi",
    icon: "CheckCircle2",
    defaults: {
      activa: false,
      apiKey: "",
      shopId: "",
      autoInvite: true,
      triggerStates: ["CUESTIONARIO"],
      excludedStates: ["CANCELADO", "DEVUELTO"],
      showOnProduct: true,
      showOnListings: true,
      showOnEmpty: true,
    },
    fields: [
      { key: "activa", label: "Activo", type: "boolean" },
      { key: "apiKey", label: "API key", type: "text" },
      { key: "shopId", label: "Shop ID", type: "text" },
      { key: "autoInvite", label: "Invitación automática", type: "boolean" },
      { key: "triggerStates", label: "Estados que disparan", type: "multiselect", options: ["CUESTIONARIO"] },
      { key: "excludedStates", label: "Estados excluidos", type: "multiselect", options: ["CANCELADO", "DEVUELTO"] },
      { key: "showOnProduct", label: "Mostrar en ficha de producto", type: "boolean" },
      { key: "showOnListings", label: "Mostrar en listados", type: "boolean" },
      { key: "showOnEmpty", label: "Mostrar en productos sin reseñas", type: "boolean" },
    ],
  },
  {
    slug: "seo",
    name: "SEO",
    description: "Metadatos, indexación, datos estructurados y verificación en buscadores.",
    category: "Marketing",
    route: "/admin/personalizar/modulos/seo",
    icon: "Search",
    defaults: {
      activa: true,
      // Sitemap y robots
      sitemap: true,
      robotsTxt: true,
      // Verificación buscadores
      googleVerification: "",
      bingVerification: "",
      // Datos estructurados JSON-LD
      jsonLdProducto: true,
      jsonLdCategoria: true,
      jsonLdOrganizacion: true,
      // Páginas de categoría
      mostrarDescripcionCat: true,
      posicionDescripcion: "top",
      mostrarTextoSeoCat: true,
      // Open Graph
      opengraph: true,
    },
    fields: [
      { key: "activa", label: "Módulo activo", type: "boolean" },
      { key: "sitemap", label: "Generar sitemap.xml", type: "boolean" },
      { key: "robotsTxt", label: "Generar robots.txt", type: "boolean" },
      { key: "googleVerification", label: "Código verificación Google Search Console", type: "text" },
      { key: "bingVerification", label: "Código verificación Bing Webmaster", type: "text" },
      { key: "jsonLdProducto", label: "JSON-LD en páginas de producto (Product schema)", type: "boolean" },
      { key: "jsonLdCategoria", label: "JSON-LD en páginas de categoría (CollectionPage)", type: "boolean" },
      { key: "jsonLdOrganizacion", label: "JSON-LD de organización en layout global", type: "boolean" },
      { key: "mostrarDescripcionCat", label: "Mostrar descripción en páginas de categoría", type: "boolean" },
      { key: "posicionDescripcion", label: "Posición descripción en categoría", type: "select", options: ["top", "bottom"] },
      { key: "mostrarTextoSeoCat", label: "Mostrar texto SEO al pie de categorías", type: "boolean" },
      { key: "opengraph", label: "Open Graph (vista previa en redes sociales)", type: "boolean" },
    ],
  },
  {
    slug: "cookies",
    name: "Cookies",
    description: "Banner y preferencias de consentimiento.",
    category: "Legal",
    route: "/admin/personalizar/modulos/cookies",
    icon: "Cookie",
    defaults: {
      activa: true,
      banner: true,
      policyUrl: "/politica-cookies",
    },
    fields: [
      { key: "activa", label: "Activo", type: "boolean" },
      { key: "banner", label: "Banner visible", type: "boolean" },
      { key: "policyUrl", label: "URL de política", type: "text" },
    ],
  },
];

export function getModuleDefinition(slug: string) {
  return MODULES.find((item) => item.slug === slug) ?? null;
}

export function getDefaultModulesConfig() {
  return Object.fromEntries(MODULES.map((module) => [module.slug, module.defaults]));
}
