import { prisma } from "@/lib/prisma";
import {
  DEFAULT_EMAIL_SETTINGS,
  EMAIL_TEMPLATES,
  normalizeEmailSettings,
  type EmailTemplateConfig,
  type EmailTemplateSlug,
} from "@/lib/emailConfig";
import { getEmailTransportConfig, isEmailTransportReady, sendOutboundEmail, type EmailSendResult } from "@/lib/emailTransport";
import { getBaseUrl } from "@/lib/urls";

export type EmailVariables = Record<string, string | number | boolean | null | undefined>;

export type SendTemplateEmailInput = {
  to: string | string[];
  templateSlug: EmailTemplateSlug;
  variables?: EmailVariables;
  replyTo?: string;
  from?: string;
};

export type SendRawEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
};

const CONFIG_KEY = "correos_configuracion";

export function renderEmailContent(template: string, variables: EmailVariables = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value == null ? "" : String(value);
  });
}

export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function loadEmailSettings() {
  const configuracion = await prisma.configuracion.findUnique({ where: { clave: CONFIG_KEY } });
  return normalizeEmailSettings(configuracion?.valor ? JSON.parse(configuracion.valor) : DEFAULT_EMAIL_SETTINGS);
}

export function getEmailTemplateConfig(
  slug: EmailTemplateSlug,
  templateConfig: Record<EmailTemplateSlug, EmailTemplateConfig>
) {
  return templateConfig[slug] ?? EMAIL_TEMPLATES.find((item) => item.slug === slug)?.defaults;
}

export async function sendTemplateEmail(input: SendTemplateEmailInput): Promise<EmailSendResult> {
  const config = await loadEmailSettings();
  const transport = getEmailTransportConfig();

  if (!isEmailTransportReady(transport)) {
    throw new Error("La capa de envío de correos todavía no está configurada.");
  }

  const template = getEmailTemplateConfig(input.templateSlug, config.templates);
  if (!template) {
    throw new Error(`La plantilla ${input.templateSlug} no existe.`);
  }

  if (!template.enabled) {
    throw new Error(`La plantilla ${input.templateSlug} está desactivada.`);
  }

  const variables: EmailVariables = {
    ...input.variables,
    senderName: transport.senderName,
    senderEmail: transport.senderEmail,
    brandName: config.brandName,
    supportEmail: config.supportEmail,
    replyToEmail: config.replyToEmail,
    appUrl: getBaseUrl(),
  };

  const subject = renderEmailContent(template.subject, variables);
  const html = renderEmailContent(template.html, variables);
  const text = htmlToText(renderEmailContent(template.html, variables));

  return sendOutboundEmail(transport, {
    to: input.to,
    subject,
    html,
    text,
    replyTo: input.replyTo || config.replyToEmail,
    from: input.from,
  });
}

type AdminOrderEmailProduct = {
  productoIdRef?: number | null;
  nombre: string;
  varianteInfo?: string | null;
  cantidad: number;
  precioUnitario: number | string;
  subtotal: number | string;
};

type AdminOrderEmailData = {
  numeroPedido: string;
  nombre?: string | null;
  apellidos?: string | null;
  email?: string | null;
  telefono?: string | null;
  nif?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  cp?: string | null;
  pais?: string | null;
  envioMetodo?: string | null;
  envioCoste?: number | string | null;
  pagoMetodo?: string | null;
  subtotal?: number | string | null;
  descuento?: number | string | null;
  totalFinal?: number | string | null;
  notas?: string | null;
  mensajeCliente?: string | null;
  fechaPedido?: Date | string | null;
  pedidoproducto?: AdminOrderEmailProduct[];
};

export function buildAdminOrderEmail(
  pedido: AdminOrderEmailData,
  datosCliente: Record<string, any>,
  options: { brandName: string; appUrl: string }
): string {
  const { brandName, appUrl } = options;

  const fecha = pedido.fechaPedido
    ? new Date(pedido.fechaPedido).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  const nombreCliente = `${pedido.nombre || ""} ${pedido.apellidos || ""}`.trim() || "Cliente";

  const productosHtml = (pedido.pedidoproducto || []).map((item) => {
    const ref = item.productoIdRef ?? "-";
    const nombreProducto = item.nombre;
    const precioUnit = `${Number(item.precioUnitario).toFixed(2)} €`;
    const precioTotal = `${Number(item.subtotal).toFixed(2)} €`;
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#666;font-size:13px;">${ref}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">${nombreProducto}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">${precioUnit}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${item.cantidad}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600;">${precioTotal}</td>
    </tr>`;
  }).join("");

  const subtotalVal = Number(pedido.subtotal ?? 0);
  const descuentoVal = Number(pedido.descuento ?? 0);
  const envioVal = Number(pedido.envioCoste ?? 0);
  const totalVal = Number(pedido.totalFinal ?? 0);

  const billing = datosCliente?.facturacion ?? datosCliente ?? {};
  const billingNombre = `${billing.nombre || pedido.nombre || ""} ${billing.apellidos || pedido.apellidos || ""}`.trim() || nombreCliente;

  function addrBlock(a: Record<string, any>, nombre: string) {
    return [
      `<span style="color:#6BAEC9;font-weight:700;">${nombre}</span>`,
      a.direccion || "",
      `${a.cp || a.codigoPostal || ""} ${a.ciudad || ""}`.trim(),
      a.pais || "España",
      a.provincia || "",
      a.telefono || "",
      a.nif || "",
    ].filter(Boolean).join("<br>");
  }

  const entrega = { direccion: pedido.direccion, cp: pedido.cp, ciudad: pedido.ciudad, provincia: pedido.provincia, pais: pedido.pais, telefono: pedido.telefono, nif: pedido.nif };
  const facturacion = { direccion: billing.direccion || pedido.direccion, cp: billing.cp || billing.codigoPostal || pedido.cp, ciudad: billing.ciudad || pedido.ciudad, provincia: billing.provincia || pedido.provincia, pais: billing.pais || pedido.pais || "España", telefono: billing.telefono || pedido.telefono, nif: billing.nif || pedido.nif };

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nuevo pedido ${pedido.numeroPedido}</title>
</head>
<body style="margin:0;padding:20px 0;background:#F8F8F5;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e8dfc8;border-radius:8px;overflow:hidden;">

  <!-- Logo -->
  <div style="text-align:center;padding:24px 20px 20px;background:#ffffff;border-bottom:3px solid #DDC9A3;">
    <img src="${appUrl}/img/logo-hogar-dark.jpg" alt="${brandName}" style="max-height:72px;max-width:220px;">
  </div>
  <!-- Franja beis (nav) -->
  <div style="background:#DDC9A3;height:4px;font-size:1px;line-height:4px;">&nbsp;</div>

  <!-- Título -->
  <div style="padding:32px 40px 20px;text-align:center;">
    <h1 style="font-size:30px;color:#222;margin:0 0 14px;font-weight:700;">¡ENHORABUENA!</h1>
    <p style="font-size:15px;color:#555;margin:0;line-height:1.6;">
      Tiene un nuevo pedido en su tienda <strong>${brandName}</strong> realizado por el cliente:
      <strong>${nombreCliente}</strong>
      (<a href="mailto:${pedido.email || ""}" style="color:#6BAEC9;text-decoration:none;">${pedido.email || ""}</a>)
    </p>
  </div>

  <!-- Detalles pedido -->
  <div style="margin:0 40px 24px;border:1px solid #ddd;border-radius:3px;">
    <div style="background:#f7f7f7;padding:11px 16px;border-bottom:1px solid #ddd;">
      <strong style="font-size:12px;color:#333;text-transform:uppercase;letter-spacing:.6px;">Detalles del pedido</strong>
    </div>
    <div style="padding:16px;font-size:14px;color:#333;line-height:1.8;">
      <p style="margin:0 0 6px;"><strong>Pedido:</strong> ${pedido.numeroPedido} &nbsp;&nbsp; <strong>Fecha:</strong> ${fecha}</p>
      <p style="margin:0;"><strong>Pago:</strong> ${pedido.pagoMetodo || "—"}</p>
    </div>
  </div>

  <!-- Tabla productos -->
  <div style="margin:0 40px 24px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#6BAEC9;color:#fff;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;">Referencia</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;">Producto</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;">Precio unit.</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;">Cantidad</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;">Precio total</th>
        </tr>
      </thead>
      <tbody>${productosHtml}</tbody>
    </table>
  </div>

  <!-- Totales -->
  <div style="margin:0 40px 24px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:6px 12px;text-align:right;color:#555;">Productos</td>
        <td style="padding:6px 12px;text-align:right;font-weight:600;width:130px;">${subtotalVal.toFixed(2)} €</td>
      </tr>
      ${descuentoVal > 0 ? `<tr><td style="padding:6px 12px;text-align:right;color:#555;">Descuentos</td><td style="padding:6px 12px;text-align:right;font-weight:600;width:130px;color:#6BAEC9;">-${descuentoVal.toFixed(2)} €</td></tr>` : ""}
      <tr>
        <td style="padding:6px 12px;text-align:right;color:#555;">Transporte</td>
        <td style="padding:6px 12px;text-align:right;font-weight:600;width:130px;">${envioVal > 0 ? `${envioVal.toFixed(2)} €` : "Gratis"}</td>
      </tr>
      <tr style="border-top:2px solid #DDC9A3;">
        <td style="padding:12px 12px;text-align:right;font-weight:700;font-size:17px;">Total pagado</td>
        <td style="padding:12px 12px;text-align:right;font-weight:700;font-size:17px;width:130px;">${totalVal.toFixed(2)} €</td>
      </tr>
    </table>
  </div>

  ${pedido.envioMetodo ? `
  <!-- Transportista -->
  <div style="margin:0 40px 24px;border:1px solid #ddd;border-radius:3px;">
    <div style="background:#f7f7f7;padding:11px 16px;border-bottom:1px solid #ddd;">
      <strong style="font-size:12px;color:#333;text-transform:uppercase;letter-spacing:.6px;">Transportista</strong>
    </div>
    <div style="padding:14px 16px;font-size:14px;color:#333;">${pedido.envioMetodo}</div>
  </div>` : ""}

  <!-- Direcciones -->
  <div style="margin:0 40px 24px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:50%;padding-right:8px;vertical-align:top;">
          <div style="border:1px solid #ddd;border-radius:3px;">
            <div style="background:#f7f7f7;padding:10px 14px;border-bottom:1px solid #ddd;">
              <strong style="font-size:12px;color:#333;text-transform:uppercase;letter-spacing:.6px;">Dirección de entrega</strong>
            </div>
            <div style="padding:14px;font-size:13px;color:#444;line-height:1.9;">
              ${addrBlock(entrega, nombreCliente)}
            </div>
          </div>
        </td>
        <td style="width:50%;padding-left:8px;vertical-align:top;">
          <div style="border:1px solid #ddd;border-radius:3px;">
            <div style="background:#f7f7f7;padding:10px 14px;border-bottom:1px solid #ddd;">
              <strong style="font-size:12px;color:#333;text-transform:uppercase;letter-spacing:.6px;">Dirección de facturación</strong>
            </div>
            <div style="padding:14px;font-size:13px;color:#444;line-height:1.9;">
              ${addrBlock(facturacion, billingNombre)}
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Mensaje del cliente -->
  <div style="margin:0 40px 32px;border:1px solid #ddd;border-radius:3px;">
    <div style="background:#f7f7f7;padding:11px 16px;border-bottom:1px solid #ddd;">
      <strong style="font-size:12px;color:#333;text-transform:uppercase;letter-spacing:.6px;">Mensaje del cliente</strong>
    </div>
    <div style="padding:14px 16px;font-size:14px;color:#555;">${pedido.mensajeCliente || "Sin mensajes"}</div>
  </div>

  <!-- Footer -->
  <div style="background:#F8F8F5;border-top:2px solid #DDC9A3;padding:18px;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;color:#888;">
      <strong style="color:#4A4A4A;">${brandName}</strong> &nbsp;·&nbsp;
      <a href="${appUrl}" style="color:#6BAEC9;text-decoration:none;">${appUrl}</a>
    </p>
    <p style="margin:0;font-size:11px;color:#aaa;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
  </div>
</div>
</body>
</html>`;
}

export async function sendRawEmail(input: SendRawEmailInput): Promise<EmailSendResult> {
  const transport = getEmailTransportConfig();
  if (!isEmailTransportReady(transport)) {
    throw new Error("La capa de envío de correos todavía no está configurada.");
  }

  return sendOutboundEmail(transport, {
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text ?? htmlToText(input.html),
    replyTo: input.replyTo || transport.replyToEmail,
    from: input.from,
  });
}
