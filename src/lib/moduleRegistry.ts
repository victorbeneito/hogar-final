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
    description: "Metadatos, indexación y utilidades de buscadores.",
    category: "Marketing",
    route: "/admin/personalizar/modulos/seo",
    icon: "Search",
    defaults: {
      activa: true,
      proveedor: "interno",
      sitemap: true,
      robotsTxt: true,
    },
    fields: [
      { key: "activa", label: "Activo", type: "boolean" },
      { key: "proveedor", label: "Proveedor", type: "text" },
      { key: "sitemap", label: "Generar sitemap", type: "boolean" },
      { key: "robotsTxt", label: "Generar robots.txt", type: "boolean" },
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
