import { prisma } from "@/lib/prisma";
import {
  DEFAULT_EMAIL_SETTINGS,
  EMAIL_TEMPLATES,
  normalizeEmailSettings,
  type EmailTemplateConfig,
  type EmailTemplateSlug,
} from "@/lib/emailConfig";
import { getEmailTransportConfig, isEmailTransportReady, sendOutboundEmail, type EmailSendResult } from "@/lib/emailTransport";

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
