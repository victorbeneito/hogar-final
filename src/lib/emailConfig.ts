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
  adminEmail: string;
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

// Colores corporativos (sincronizados con tailwind.config.js)
const C_PRIMARY   = "#6BAEC9"; // azul turquesa
const C_TERCIARY  = "#DDC9A3"; // beis (nav)
const C_SECONDARY = "#4A4A4A"; // gris texto
const C_FONDO     = "#F8F8F5"; // fondo crema
const C_WHITE     = "#FFFFFF";

const EMAIL_SHELL_OPEN = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C_FONDO};font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${C_FONDO};">
<tr><td align="center" style="padding:32px 16px;">
<table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- CABECERA: fondo blanco con logo oscuro -->
<tr><td style="background:${C_WHITE};border-radius:8px 8px 0 0;padding:24px 40px;text-align:center;border-bottom:3px solid ${C_TERCIARY};">
<img src="{{appUrl}}/img/logo-hogar.jpg" alt="{{brandName}}" style="max-height:64px;max-width:220px;display:block;margin:0 auto;">
</td></tr>

<!-- FRANJA BEIS (como la nav de la web) -->
<tr><td style="background:${C_TERCIARY};height:6px;font-size:1px;line-height:6px;">&nbsp;</td></tr>

<!-- CONTENIDO -->
<tr><td style="background:${C_WHITE};padding:40px 48px 36px;">`;

const EMAIL_SHELL_CLOSE = `</td></tr>

<!-- FOOTER -->
<tr><td style="background:${C_FONDO};border-top:2px solid ${C_TERCIARY};border-radius:0 0 8px 8px;padding:20px 40px;text-align:center;">
<p style="margin:0 0 6px;font-size:12px;color:#888;line-height:1.6;">
  <strong style="color:${C_SECONDARY};">{{brandName}}</strong> &nbsp;·&nbsp;
  <a href="mailto:{{supportEmail}}" style="color:${C_PRIMARY};text-decoration:none;">{{supportEmail}}</a>
</p>
<p style="margin:0;font-size:11px;color:#aaa;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

function emailBtn(href: string, label: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td align="center" style="background:${C_PRIMARY};border-radius:8px;"><a href="${href}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:.3px;">${label}</a></td></tr></table>`;
}

function emailSection(title: string, body: string) {
  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;border:1px solid #e8dfc8;border-radius:8px;">
<tr><td style="background:${C_FONDO};border-bottom:1px solid #e8dfc8;padding:10px 18px;border-radius:8px 8px 0 0;">
<span style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.8px;">${title}</span>
</td></tr>
<tr><td style="padding:16px 18px;font-size:14px;color:${C_SECONDARY};line-height:1.7;">${body}</td></tr>
</table>`;
}

const ACCOUNT_CREATED_HTML =
  EMAIL_SHELL_OPEN +
  `<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">¡Bienvenido, {{nombre}}!</h1>
<p style="margin:0 0 28px;font-size:14px;color:#999;">Tu cuenta en <strong>{{brandName}}</strong> ya está activa</p>
<p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">
  Gracias por registrarte. Ahora puedes seguir tus pedidos, guardar direcciones y disfrutar de una experiencia de compra personalizada.
</p>` +
  emailSection(
    "Tu correo de acceso",
    `<strong style="color:#2d2d2d;font-size:15px;">{{email}}</strong>`
  ) +
  `<p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
  Mantén tus datos de acceso en un lugar seguro y no los compartas con nadie.
</p>` +
  emailBtn("{{loginUrl}}", "Acceder a mi cuenta →") +
  `<p style="margin:28px 0 0;font-size:12px;color:#bbb;line-height:1.6;">Si no has creado esta cuenta, puedes ignorar este mensaje con total seguridad.</p>` +
  EMAIL_SHELL_CLOSE;

const ORDER_PLACED_HTML =
  EMAIL_SHELL_OPEN +
  `<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">¡Gracias por tu pedido, {{nombre}}!</h1>
<p style="margin:0 0 28px;font-size:14px;color:#999;">Hemos recibido tu pedido y lo estamos preparando</p>
<p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
  Tu pedido ha sido registrado correctamente. En cuanto esté listo para enviarse, recibirás otro correo con los datos de seguimiento.
</p>` +
  emailSection(
    "Detalles del pedido",
    `<strong>Nº de pedido:</strong> <span style="color:#6BAEC9;font-weight:700;">{{numeroPedido}}</span><br>
<strong>Total pagado:</strong> <span style="font-weight:700;">{{total}}</span>`
  ) +
  `<p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
  Puedes consultar el estado de tu pedido en cualquier momento desde tu área personal.
</p>` +
  emailBtn("{{pedidoUrl}}", "Ver mi pedido →") +
  EMAIL_SHELL_CLOSE;

const ORDER_SHIPPED_HTML =
  EMAIL_SHELL_OPEN +
  `<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">¡Tu pedido está en camino, {{nombre}}!</h1>
<p style="margin:0 0 28px;font-size:14px;color:#999;">Transportista: <strong>Ontime</strong></p>
<p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
  Tu pedido <strong style="color:#6BAEC9;">{{numeroPedido}}</strong> ha salido de nuestro almacén y está en manos de Ontime para su entrega.
</p>` +
  emailSection(
    "Seguimiento del envío",
    `<p style="margin:0 0 8px;"><strong>Transportista:</strong> Ontime</p>
<p style="margin:0 0 8px;"><strong>Nº de seguimiento:</strong> <span style="font-family:monospace;font-size:15px;color:#6BAEC9;font-weight:700;letter-spacing:1px;">{{trackingNumber}}</span></p>
<p style="margin:12px 0 0;font-size:13px;color:#888;">Usa este número para localizar tu paquete en la web de Ontime.</p>`
  ) +
  emailBtn("{{trackingUrl}}", "Seguir mi envío en Ontime →") +
  `<p style="margin:24px 0 0;font-size:13px;color:#aaa;line-height:1.6;">
  Si tienes algún problema con tu envío, no dudes en contactarnos a
  <a href="mailto:{{supportEmail}}" style="color:#6BAEC9;text-decoration:none;">{{supportEmail}}</a>.
</p>` +
  EMAIL_SHELL_CLOSE;

const ORDER_CANCELLED_HTML =
  EMAIL_SHELL_OPEN +
  `<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">Pedido cancelado</h1>
<p style="margin:0 0 28px;font-size:14px;color:#999;">Nº de pedido: <strong>{{numeroPedido}}</strong></p>
<p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
  Hola <strong>{{nombre}}</strong>, te informamos de que tu pedido <strong style="color:#6BAEC9;">{{numeroPedido}}</strong> ha sido cancelado.
</p>` +
  emailSection(
    "Motivo de la cancelación",
    `<span style="color:#555;">{{motivo}}</span>`
  ) +
  `<p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.7;">
  Si el pago ya fue procesado, el reembolso se realizará en los próximos días según el método de pago utilizado.
</p>
<p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
  Si tienes alguna duda o necesitas ayuda, escríbenos a
  <a href="mailto:{{supportEmail}}" style="color:#6BAEC9;text-decoration:none;">{{supportEmail}}</a>
  y te atenderemos lo antes posible.
</p>` +
  EMAIL_SHELL_CLOSE;

const ORDER_RETURN_HTML =
  EMAIL_SHELL_OPEN +
  `<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">Actualización de tu devolución</h1>
<p style="margin:0 0 28px;font-size:14px;color:#999;">Pedido: <strong>{{numeroPedido}}</strong></p>
<p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
  Hola <strong>{{nombre}}</strong>, hemos actualizado el estado de la devolución de tu pedido <strong style="color:#6BAEC9;">{{numeroPedido}}</strong>.
</p>` +
  emailSection(
    "Estado de la devolución",
    `<strong style="color:#2d2d2d;font-size:15px;">{{estado}}</strong>`
  ) +
  `<p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
  Si el reembolso ya ha sido aprobado, lo recibirás en los próximos días hábiles en el método de pago original.
  Para cualquier consulta escríbenos a
  <a href="mailto:{{supportEmail}}" style="color:#6BAEC9;text-decoration:none;">{{supportEmail}}</a>.
</p>` +
  EMAIL_SHELL_CLOSE;

export const EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    slug: "account-created",
    name: "Cuenta creada",
    category: "Clientes",
    description: "Correo automático al crear una cuenta.",
    route: "/admin/personalizar/correos/account-created",
    variables: ["{{nombre}}", "{{email}}", "{{brandName}}", "{{loginUrl}}", "{{appUrl}}"],
    defaults: {
      enabled: true,
      subject: "¡Bienvenido a {{brandName}}!",
      preheader: "Ya puedes acceder a tu cuenta y empezar a comprar.",
      html: ACCOUNT_CREATED_HTML,
    },
  },
  {
    slug: "order-placed",
    name: "Pedido realizado",
    category: "Pedidos",
    description: "Confirmación automática al registrar el pedido.",
    route: "/admin/personalizar/correos/order-placed",
    variables: ["{{nombre}}", "{{numeroPedido}}", "{{total}}", "{{brandName}}", "{{pedidoUrl}}", "{{appUrl}}"],
    defaults: {
      enabled: true,
      subject: "[{{brandName}}] Confirmación de pedido {{numeroPedido}}",
      preheader: "Tu pedido ya está registrado y lo estamos preparando.",
      html: ORDER_PLACED_HTML,
    },
  },
  {
    slug: "order-shipped",
    name: "Pedido enviado",
    category: "Pedidos",
    description: "Aviso cuando el pedido sale de almacén.",
    route: "/admin/personalizar/correos/order-shipped",
    variables: ["{{nombre}}", "{{numeroPedido}}", "{{trackingNumber}}", "{{trackingUrl}}", "{{brandName}}", "{{appUrl}}"],
    defaults: {
      enabled: true,
      subject: "[{{brandName}}] Tu pedido {{numeroPedido}} está en camino",
      preheader: "Tu paquete ya está en manos de Ontime.",
      html: ORDER_SHIPPED_HTML,
    },
  },
  {
    slug: "order-cancelled",
    name: "Pedido cancelado",
    category: "Pedidos",
    description: "Notificación cuando el pedido se cancela.",
    route: "/admin/personalizar/correos/order-cancelled",
    variables: ["{{nombre}}", "{{numeroPedido}}", "{{brandName}}", "{{motivo}}", "{{appUrl}}"],
    defaults: {
      enabled: true,
      subject: "[{{brandName}}] Tu pedido {{numeroPedido}} ha sido cancelado",
      preheader: "Te informamos de la cancelación de tu pedido.",
      html: ORDER_CANCELLED_HTML,
    },
  },
  {
    slug: "order-return",
    name: "Devolución",
    category: "Pedidos",
    description: "Aviso para devoluciones o reembolsos.",
    route: "/admin/personalizar/correos/order-return",
    variables: ["{{nombre}}", "{{numeroPedido}}", "{{brandName}}", "{{estado}}", "{{appUrl}}"],
    defaults: {
      enabled: true,
      subject: "[{{brandName}}] Actualización de devolución - Pedido {{numeroPedido}}",
      preheader: "Te informamos sobre el estado de tu devolución.",
      html: ORDER_RETURN_HTML,
    },
  },
];

export const DEFAULT_EMAIL_SETTINGS: EmailSettingsConfig = {
  senderName: "El Hogar de tus Sueños",
  senderEmail: "info@elhogardetusuenos.com",
  replyToEmail: "info@elhogardetusuenos.com",
  supportEmail: "info@elhogardetusuenos.com",
  adminEmail: "admin@elhogardetusuenos.com",
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
    adminEmail: String(source.adminEmail ?? DEFAULT_EMAIL_SETTINGS.adminEmail),
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
