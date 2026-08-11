export type InvoiceSettingsConfig = {
  active: boolean;
  emitOnOrderStatuses: string[];
  prefix: string;
  includeYear: boolean;
  yearPosition: "before" | "after";
  yearSeparator: string;
  resetAnnually: boolean;
  nextSequence: number;
  padding: number;
  showTaxBreakdown: boolean;
  showProductImage: boolean;
  porcentajeIva: number;
  seller: {
    nombre: string;
    nif: string;
    direccion: string;
    cp: string;
    ciudad: string;
    provincia: string;
    pais: string;
    telefono: string;
    email: string;
    web: string;
    logoPath: string;
  };
  template: {
    name: string;
    headerTitle: string;
    subtitle: string;
    legalText: string;
    footerText: string;
    html: string;
  };
};

export const INVOICE_ORDER_STATUS_OPTIONS = [
  { value: "PENDIENTE",   label: "Pendiente" },
  { value: "PROCESANDO",  label: "Procesando" },
  { value: "ENVIADO",     label: "Enviado" },
  { value: "ENTREGADO",   label: "Entregado" },
  { value: "CANCELADO",   label: "Cancelado" },
  { value: "DEVUELTO",    label: "Devuelto" },
];

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettingsConfig = {
  active: true,
  emitOnOrderStatuses: ["ENTREGADO"],
  prefix: "HSC",
  includeYear: true,
  yearPosition: "after",
  yearSeparator: "/",
  resetAnnually: true,
  nextSequence: 1,
  padding: 6,
  showTaxBreakdown: true,
  showProductImage: false,
  porcentajeIva: 21,
  seller: {
    nombre: "El Hogar de tus Sueños",
    nif: "",
    direccion: "",
    cp: "",
    ciudad: "",
    provincia: "",
    pais: "España",
    telefono: "961 154 226 - 684 004 525",
    // Ojo con la doble "s": aquí ponía "elhogardetussuenos.com", un dominio que no
    // existe (sin DNS ni MX), así que la web impresa en la factura no cargaba y los
    // correos que enviaran los clientes a esa dirección se perdían por el camino.
    email: "info@elhogardetusuenos.com",
    web: "elhogardetusuenos.com",
    logoPath: "/img/logo-hogar.jpg",
  },
  template: {
    name: "invoice",
    headerTitle: "FACTURA",
    subtitle: "Documento generado automáticamente",
    legalText: "El importe mostrado incluye los impuestos aplicables según normativa vigente.",
    footerText: "El Hogar de tus Sueños · Para obtener más ayuda, póngase en contacto con Soporte",
    html: "",
  },
};

export function getDefaultInvoiceSettings(): InvoiceSettingsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_INVOICE_SETTINGS)) as InvoiceSettingsConfig;
}

export function normalizeInvoiceSettings(input: any): InvoiceSettingsConfig {
  const s = input && typeof input === "object" ? input : {};
  const t = s.template && typeof s.template === "object" ? s.template : {};
  const sel = s.seller && typeof s.seller === "object" ? s.seller : {};
  const def = DEFAULT_INVOICE_SETTINGS;

  return {
    active: Boolean(s.active ?? def.active),
    emitOnOrderStatuses: Array.isArray(s.emitOnOrderStatuses)
      ? [...new Set(s.emitOnOrderStatuses.map((v: any) => String(v).toUpperCase()))]
      : def.emitOnOrderStatuses,
    prefix: String(s.prefix ?? def.prefix),
    includeYear: Boolean(s.includeYear ?? def.includeYear),
    yearPosition: s.yearPosition === "before" ? "before" : "after",
    yearSeparator: String(s.yearSeparator ?? def.yearSeparator),
    resetAnnually: Boolean(s.resetAnnually ?? def.resetAnnually),
    nextSequence: Math.max(1, Number(s.nextSequence ?? def.nextSequence) || def.nextSequence),
    padding: Math.max(4, Number(s.padding ?? def.padding) || 4),
    showTaxBreakdown: Boolean(s.showTaxBreakdown ?? def.showTaxBreakdown),
    showProductImage: Boolean(s.showProductImage ?? def.showProductImage),
    porcentajeIva: Math.max(0, Number(s.porcentajeIva ?? def.porcentajeIva) || def.porcentajeIva),
    seller: {
      nombre:    String(sel.nombre    ?? def.seller.nombre),
      nif:       String(sel.nif       ?? def.seller.nif),
      direccion: String(sel.direccion ?? def.seller.direccion),
      cp:        String(sel.cp        ?? def.seller.cp),
      ciudad:    String(sel.ciudad    ?? def.seller.ciudad),
      provincia: String(sel.provincia ?? def.seller.provincia),
      pais:      String(sel.pais      ?? def.seller.pais),
      telefono:  String(sel.telefono  ?? def.seller.telefono),
      email:     String(sel.email     ?? def.seller.email),
      web:       String(sel.web       ?? def.seller.web),
      logoPath:  String(sel.logoPath  ?? def.seller.logoPath),
    },
    template: {
      name:        String(t.name        ?? def.template.name),
      headerTitle: String(t.headerTitle ?? def.template.headerTitle),
      subtitle:    String(t.subtitle    ?? def.template.subtitle),
      legalText:   String(t.legalText   ?? def.template.legalText),
      footerText:  String(t.footerText  ?? def.template.footerText),
      html:        String(t.html        ?? def.template.html),
    },
  };
}

export function buildInvoiceNumber(
  settings: InvoiceSettingsConfig,
  sequence?: number,
  issuedAt?: Date | string | null,
): string {
  const seq = Number(sequence ?? settings.nextSequence ?? 1);
  const padded = String(seq).padStart(settings.padding, "0");
  const year = issuedAt ? new Date(issuedAt).getFullYear() : new Date().getFullYear();
  const prefix = settings.prefix.trim();
  if (!settings.includeYear) return `${prefix}${padded}`;
  return settings.yearPosition === "before"
    ? `${prefix}${String(year)}${settings.yearSeparator}${padded}`
    : `${prefix}${padded}${settings.yearSeparator}${String(year)}`;
}
