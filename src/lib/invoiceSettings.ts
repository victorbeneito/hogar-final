export type InvoiceOrderStatus = "PENDIENTE" | "PROCESANDO" | "ENVIADO" | "ENTREGADO" | "CANCELADO" | "DEVUELTO";

export type InvoiceTemplateConfig = {
  name: string;
  headerTitle: string;
  subtitle: string;
  legalText: string;
  footerText: string;
  html: string;
};

export type InvoiceSettingsConfig = {
  active: boolean;
  emitOnOrderStatuses: InvoiceOrderStatus[];
  prefix: string;
  includeYear: boolean;
  yearPosition: "before" | "after";
  yearSeparator: string;
  resetAnnually: boolean;
  nextSequence: number;
  padding: number;
  showTaxBreakdown: boolean;
  showProductImage: boolean;
  template: InvoiceTemplateConfig;
};

export const INVOICE_ORDER_STATUS_OPTIONS: Array<{ value: InvoiceOrderStatus; label: string }> = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "PROCESANDO", label: "Procesando" },
  { value: "ENVIADO", label: "Enviado" },
  { value: "ENTREGADO", label: "Entregado" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "DEVUELTO", label: "Devuelto" },
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
  padding: 4,
  showTaxBreakdown: true,
  showProductImage: false,
  template: {
    name: "invoice",
    headerTitle: "FACTURA",
    subtitle: "Documento generado automáticamente",
    legalText: "El importe mostrado incluye los impuestos aplicables según normativa vigente.",
    footerText: "Gracias por confiar en El Hogar de tus Sueños.",
    html:
      "<div style=\"font-family:Arial,sans-serif\"><h1>{{headerTitle}}</h1><p>{{subtitle}}</p><p><strong>Factura:</strong> {{numeroFactura}}</p><p><strong>Pedido:</strong> {{numeroPedido}}</p><p><strong>Cliente:</strong> {{clienteNombre}}</p><p><strong>Total:</strong> {{total}}</p><hr /><p>{{legalText}}</p><p>{{footerText}}</p></div>",
  },
};

export function getDefaultInvoiceSettings(): InvoiceSettingsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_INVOICE_SETTINGS)) as InvoiceSettingsConfig;
}

export function normalizeInvoiceSettings(input: any): InvoiceSettingsConfig {
  const source = input && typeof input === "object" ? input : {};
  const templateSource = source.template && typeof source.template === "object" ? source.template : {};

  return {
    active: Boolean(source.active ?? DEFAULT_INVOICE_SETTINGS.active),
    emitOnOrderStatuses: Array.isArray(source.emitOnOrderStatuses)
      ? source.emitOnOrderStatuses
          .map((status: any) => String(status).toUpperCase())
          .filter((status: string) => INVOICE_ORDER_STATUS_OPTIONS.some((item) => item.value === status))
          .filter((status: string, index: number, array: string[]) => array.indexOf(status) === index)
      : DEFAULT_INVOICE_SETTINGS.emitOnOrderStatuses,
    prefix: String(source.prefix ?? DEFAULT_INVOICE_SETTINGS.prefix),
    includeYear: Boolean(source.includeYear ?? DEFAULT_INVOICE_SETTINGS.includeYear),
    yearPosition: source.yearPosition === "before" ? "before" : "after",
    yearSeparator: String(source.yearSeparator ?? DEFAULT_INVOICE_SETTINGS.yearSeparator),
    resetAnnually: Boolean(source.resetAnnually ?? DEFAULT_INVOICE_SETTINGS.resetAnnually),
    nextSequence: Math.max(1, Number(source.nextSequence ?? DEFAULT_INVOICE_SETTINGS.nextSequence) || DEFAULT_INVOICE_SETTINGS.nextSequence),
    padding: Math.max(4, Number(source.padding ?? DEFAULT_INVOICE_SETTINGS.padding) || 4),
    showTaxBreakdown: Boolean(source.showTaxBreakdown ?? DEFAULT_INVOICE_SETTINGS.showTaxBreakdown),
    showProductImage: Boolean(source.showProductImage ?? DEFAULT_INVOICE_SETTINGS.showProductImage),
    template: {
      name: String(templateSource.name ?? DEFAULT_INVOICE_SETTINGS.template.name),
      headerTitle: String(templateSource.headerTitle ?? DEFAULT_INVOICE_SETTINGS.template.headerTitle),
      subtitle: String(templateSource.subtitle ?? DEFAULT_INVOICE_SETTINGS.template.subtitle),
      legalText: String(templateSource.legalText ?? DEFAULT_INVOICE_SETTINGS.template.legalText),
      footerText: String(templateSource.footerText ?? DEFAULT_INVOICE_SETTINGS.template.footerText),
      html: String(templateSource.html ?? DEFAULT_INVOICE_SETTINGS.template.html),
    },
  };
}

export function buildInvoiceNumber(settings: InvoiceSettingsConfig, sequence?: number, issuedAt?: Date | string | null) {
  const seq = Number(sequence ?? settings.nextSequence ?? 1);
  const padded = String(seq).padStart(settings.padding, "0");
  const year = issuedAt ? new Date(issuedAt).getFullYear() : new Date().getFullYear();
  const prefix = settings.prefix.trim();
  if (!settings.includeYear) {
    return `${prefix}${padded}`;
  }

  return settings.yearPosition === "before"
    ? `${prefix}${String(year)}${settings.yearSeparator}${padded}`
    : `${prefix}${padded}${settings.yearSeparator}${String(year)}`;
}

export function shouldEmitInvoiceForOrderStatus(status: string | null | undefined, settings: InvoiceSettingsConfig) {
  if (!settings.active || !status) return false;
  return settings.emitOnOrderStatuses.includes(String(status).toUpperCase() as InvoiceOrderStatus);
}

export function renderInvoiceTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "");
}
