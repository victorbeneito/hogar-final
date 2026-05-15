import nodemailer, { type TransportOptions } from "nodemailer";

export type EmailTransportMode = "smtp" | "api";

export type EmailTransportConfig = {
  mode: EmailTransportMode;
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  supportEmail: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    rejectUnauthorized: boolean;
  };
  api?: {
    url: string;
    key: string;
    from?: string;
  };
};

export type OutboundEmail = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
};

export type EmailSendResult = {
  provider: EmailTransportMode;
  messageId: string | null;
  accepted?: string[];
};

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getEmailTransportConfig(): EmailTransportConfig {
  const mode = (process.env.EMAIL_TRANSPORT_MODE || "smtp").toLowerCase() as EmailTransportMode;
  const senderName = process.env.EMAIL_SENDER_NAME || process.env.EMAIL_FROM_NAME || "El Hogar de tus Sueños";
  const senderEmail = process.env.EMAIL_SENDER_EMAIL || process.env.EMAIL_FROM_EMAIL || "info@elhogardetusuenos.com";
  const replyToEmail = process.env.EMAIL_REPLY_TO || senderEmail;
  const supportEmail = process.env.EMAIL_SUPPORT_EMAIL || senderEmail;

  const config: EmailTransportConfig = { mode, senderName, senderEmail, replyToEmail, supportEmail };

  if (mode === "api") {
    config.api = {
      url: process.env.EMAIL_API_URL || "",
      key: process.env.EMAIL_API_KEY || "",
      from: process.env.EMAIL_API_FROM || `${senderName} <${senderEmail}>`,
    };
    return config;
  }

  config.smtp = {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: parseBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    rejectUnauthorized: parseBoolean(process.env.SMTP_REJECT_UNAUTHORIZED, true),
  };

  return config;
}

export function isEmailTransportReady(config: EmailTransportConfig = getEmailTransportConfig()) {
  if (config.mode === "api") return Boolean(config.api?.url);
  return Boolean(config.smtp?.host && config.smtp?.user && config.smtp?.password);
}

async function sendViaSmtp(config: EmailTransportConfig, email: OutboundEmail): Promise<EmailSendResult> {
  if (!config.smtp) throw new Error("La configuración SMTP no está disponible.");

  const transportOptions = {
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.password,
    },
    tls: {
      rejectUnauthorized: config.smtp.rejectUnauthorized,
    },
    // Deshabilita PLAIN y LOGIN para forzar CRAM-MD5 (como Thunderbird con "Contraseña cifrada")
    disabledCommands: ["AUTH PLAIN", "AUTH LOGIN"],
    debug: process.env.NODE_ENV === "development",
    logger: process.env.NODE_ENV === "development",
  } as TransportOptions;

  const transporter = nodemailer.createTransport(transportOptions);

  const from = email.from || `${config.senderName} <${config.senderEmail}>`;
  const to = Array.isArray(email.to) ? email.to.join(", ") : email.to;

  const info = await transporter.sendMail({
    from,
    to,
    replyTo: email.replyTo || config.replyToEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  return {
    provider: "smtp",
    messageId: info.messageId ?? null,
    accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : undefined,
  };
}

async function sendViaApi(config: EmailTransportConfig, email: OutboundEmail): Promise<EmailSendResult> {
  if (!config.api?.url) throw new Error("EMAIL_API_URL no está configurada.");

  const from = email.from || `${config.senderName} <${config.senderEmail}>`;
  const response = await fetch(config.api.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.api.key ? { Authorization: `Bearer ${config.api.key}` } : {}),
    },
    body: JSON.stringify({
      from: config.api.from || from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo || config.replyToEmail,
    }),
  });

  if (!response.ok) throw new Error(`La API de correo respondió con ${response.status}`);

  const data = await response.json().catch(() => ({}));
  return {
    provider: "api",
    messageId: String(data.messageId ?? data.id ?? ""),
    accepted: Array.isArray(data.accepted) ? data.accepted.map(String) : undefined,
  };
}

export async function sendOutboundEmail(config: EmailTransportConfig, email: OutboundEmail): Promise<EmailSendResult> {
  if (config.mode === "api") return sendViaApi(config, email);
  return sendViaSmtp(config, email);
}
