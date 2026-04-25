export type EmailTemplateSlug =
  | "account-created"
  | "order-placed"
  | "order-shipped"
  | "order-cancelled"
  | "order-return";

export type EmailTemplateConfig = {
  enabled: boolean;
  subject: string;
  preheader: string;
  html: string;
};

export type EmailSettingsConfig = {
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  supportEmail: string;
  brandName: string;
  templates: Record<EmailTemplateSlug, EmailTemplateConfig>;
};

export type EmailTemplateDefinition = {
  slug: EmailTemplateSlug;
  name: string;
  category: string;
  description: string;
  route: string;
  variables: string[];
  defaults: EmailTemplateConfig;
};

export const EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    slug: "account-created",
    name: "Cuenta creada",
    category: "Clientes",
    description: "Correo automático al crear una cuenta.",
    route: "/admin/personalizar/correos/account-created",
    variables: ["{{nombre}}", "{{email}}", "{{brandName}}", "{{loginUrl}}"],
    defaults: {
      enabled: true,
      subject: "¡Bienvenido a {{brandName}}!",
      preheader: "Ya puedes acceder a tu cuenta y empezar a comprar.",
      html:
        "<p>Hola <strong>{{nombre}}</strong>,</p><p>Gracias por crear una cuenta en <strong>{{brandName}}</strong>.</p><p>Tu correo de acceso es <strong>{{email}}</strong>.</p><p>Si no has sido tú, ignora este mensaje.</p><p><a href=\"{{loginUrl}}\">Acceder a mi cuenta</a></p>",
    },
  },
  {
    slug: "order-placed",
    name: "Pedido realizado",
    category: "Pedidos",
    description: "Confirmación automática al registrar el pedido.",
    route: "/admin/personalizar/correos/order-placed",
    variables: ["{{nombre}}", "{{numeroPedido}}", "{{total}}", "{{brandName}}", "{{pedidoUrl}}"],
    defaults: {
      enabled: true,
      subject: "Hemos recibido tu pedido {{numeroPedido}}",
      preheader: "Tu pedido ya está registrado y lo estamos preparando.",
      html:
        "<p>Hola <strong>{{nombre}}</strong>,</p><p>Hemos recibido tu pedido <strong>{{numeroPedido}}</strong>.</p><p>Total: <strong>{{total}}</strong></p><p>Gracias por comprar en {{brandName}}.</p><p><a href=\"{{pedidoUrl}}\">Ver pedido</a></p>",
    },
  },
  {
    slug: "order-shipped",
    name: "Pedido enviado",
    category: "Pedidos",
    description: "Aviso cuando el pedido sale de almacén.",
    route: "/admin/personalizar/correos/order-shipped",
    variables: ["{{nombre}}", "{{numeroPedido}}", "{{trackingNumber}}", "{{trackingUrl}}", "{{brandName}}"],
    defaults: {
      enabled: true,
      subject: "Tu pedido {{numeroPedido}} ya ha sido enviado",
      preheader: "Tu paquete ya está en camino.",
      html:
        "<p>Hola <strong>{{nombre}}</strong>,</p><p>Tu pedido <strong>{{numeroPedido}}</strong> ya ha sido enviado.</p><p>Número de seguimiento: <strong>{{trackingNumber}}</strong></p><p><a href=\"{{trackingUrl}}\">Seguir envío</a></p>",
    },
  },
  {
    slug: "order-cancelled",
    name: "Pedido cancelado",
    category: "Pedidos",
    description: "Notificación cuando el pedido se cancela.",
    route: "/admin/personalizar/correos/order-cancelled",
    variables: ["{{nombre}}", "{{numeroPedido}}", "{{brandName}}", "{{motivo}}"],
    defaults: {
      enabled: true,
      subject: "Tu pedido {{numeroPedido}} ha sido cancelado",
      preheader: "Te informamos de la cancelación de tu pedido.",
      html:
        "<p>Hola <strong>{{nombre}}</strong>,</p><p>Tu pedido <strong>{{numeroPedido}}</strong> ha sido cancelado.</p><p>{{motivo}}</p><p>Si necesitas ayuda, contacta con {{brandName}}.</p>",
    },
  },
  {
    slug: "order-return",
    name: "Devolución",
    category: "Pedidos",
    description: "Aviso para devoluciones o reembolsos.",
    route: "/admin/personalizar/correos/order-return",
    variables: ["{{nombre}}", "{{numeroPedido}}", "{{brandName}}", "{{estado}}"],
    defaults: {
      enabled: true,
      subject: "Hemos gestionado tu devolución del pedido {{numeroPedido}}",
      preheader: "Te informamos sobre el estado de tu devolución.",
      html:
        "<p>Hola <strong>{{nombre}}</strong>,</p><p>La devolución del pedido <strong>{{numeroPedido}}</strong> se ha actualizado.</p><p>Estado: <strong>{{estado}}</strong></p><p>Gracias por confiar en {{brandName}}.</p>",
    },
  },
];

export const DEFAULT_EMAIL_SETTINGS: EmailSettingsConfig = {
  senderName: "El Hogar de tus Sueños",
  senderEmail: "info@elhogardetsuenos.com",
  replyToEmail: "info@elhogardetsuenos.com",
  supportEmail: "info@elhogardetsuenos.com",
  brandName: "El Hogar de tus Sueños",
  templates: Object.fromEntries(EMAIL_TEMPLATES.map((template) => [template.slug, template.defaults])) as Record<
    EmailTemplateSlug,
    EmailTemplateConfig
  >,
};

export function getDefaultEmailSettings(): EmailSettingsConfig {
  return {
    ...DEFAULT_EMAIL_SETTINGS,
    templates: Object.fromEntries(
      EMAIL_TEMPLATES.map((template) => [template.slug, { ...template.defaults }])
    ) as Record<EmailTemplateSlug, EmailTemplateConfig>,
  };
}

export function getEmailTemplateDefinition(slug: string) {
  return EMAIL_TEMPLATES.find((template) => template.slug === slug) ?? null;
}

export function normalizeEmailSettings(input: any): EmailSettingsConfig {
  const source = input && typeof input === "object" ? input : {};
  const templates = source.templates && typeof source.templates === "object" ? source.templates : {};

  return {
    senderName: String(source.senderName ?? DEFAULT_EMAIL_SETTINGS.senderName),
    senderEmail: String(source.senderEmail ?? DEFAULT_EMAIL_SETTINGS.senderEmail),
    replyToEmail: String(source.replyToEmail ?? DEFAULT_EMAIL_SETTINGS.replyToEmail),
    supportEmail: String(source.supportEmail ?? DEFAULT_EMAIL_SETTINGS.supportEmail),
    brandName: String(source.brandName ?? DEFAULT_EMAIL_SETTINGS.brandName),
    templates: Object.fromEntries(
      EMAIL_TEMPLATES.map((template) => {
        const current = templates[template.slug] ?? {};
        return [
          template.slug,
          {
            enabled: Boolean(current.enabled ?? template.defaults.enabled),
            subject: String(current.subject ?? template.defaults.subject),
            preheader: String(current.preheader ?? template.defaults.preheader),
            html: String(current.html ?? template.defaults.html),
          },
        ];
      })
    ) as Record<EmailTemplateSlug, EmailTemplateConfig>,
  };
}
