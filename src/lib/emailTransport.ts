import net from "node:net";
import tls from "node:tls";
import os from "node:os";

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

type ResponseHandler = {
  resolve: (response: SmtpResponse) => void;
  reject: (error: Error) => void;
};

type SmtpResponse = {
  code: number;
  lines: string[];
};

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function formatAddress(value: string) {
  return value.includes("<") ? value : `<${value}>`;
}

function extractEmailAddress(value: string) {
  const match = /<([^>]+)>/.exec(value);
  return match ? match[1].trim() : value.trim();
}

function escapeHeaderValue(value: string) {
  return value.replace(/\r?\n/g, " ").trim();
}

function buildMessage(email: OutboundEmail, from: string, replyTo: string) {
  const to = Array.isArray(email.to) ? email.to.join(", ") : email.to;
  const subject = escapeHeaderValue(email.subject);
  const boundary = `----=_HOGAR_${Date.now().toString(36)}`;

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Reply-To: ${replyTo}`,
    "MIME-Version: 1.0",
  ];

  if (email.text) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const body = [
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      email.text,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      email.html,
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");
    return `${headers.join("\r\n")}\r\n\r\n${body}`;
  }

  headers.push("Content-Type: text/html; charset=utf-8");
  headers.push("Content-Transfer-Encoding: 8bit");
  return `${headers.join("\r\n")}\r\n\r\n${email.html}`;
}

class SmtpSession {
  private buffer = "";
  private currentResponse: SmtpResponse | null = null;
  private responseHandlers: ResponseHandler[] = [];
  private queuedResponses: SmtpResponse[] = [];

  constructor(private readonly socket: net.Socket | tls.TLSSocket) {
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => this.onData(chunk));
    this.socket.on("error", (error) => this.fail(error));
  }

  private onData(chunk: string) {
    this.buffer += chunk;
    let idx = this.buffer.indexOf("\r\n");
    while (idx >= 0) {
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      this.consumeLine(line);
      idx = this.buffer.indexOf("\r\n");
    }
  }

  private consumeLine(line: string) {
    const match = /^(\d{3})([ -])(.*)$/.exec(line);
    if (!match) {
      if (this.currentResponse) {
        this.currentResponse.lines.push(line);
      }
      return;
    }

    const code = Number(match[1]);
    const separator = match[2];
    const text = match[3];

    if (!this.currentResponse || this.currentResponse.code !== code) {
      this.currentResponse = { code, lines: [text] };
    } else {
      this.currentResponse.lines.push(text);
    }

    if (separator === " ") {
      const response = this.currentResponse;
      this.currentResponse = null;
      const handler = this.responseHandlers.shift();
      if (handler) {
        handler.resolve(response);
      } else {
        this.queuedResponses.push(response);
      }
    }
  }

  private fail(error: Error) {
    const handler = this.responseHandlers.shift();
    if (handler) {
      handler.reject(error);
    }
  }

  readResponse() {
    const queued = this.queuedResponses.shift();
    if (queued) {
      return Promise.resolve(queued);
    }

    return new Promise<SmtpResponse>((resolve, reject) => {
      this.responseHandlers.push({ resolve, reject });
    });
  }

  send(command: string) {
    this.socket.write(`${command}\r\n`);
    return this.readResponse();
  }

  sendMessage(message: string) {
    this.socket.write(`${message}\r\n.\r\n`);
    return this.readResponse();
  }

  close() {
    this.socket.end();
  }
}

async function connectPlain(host: string, port: number) {
  return new Promise<net.Socket>((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => resolve(socket));
    socket.once("error", reject);
  });
}

async function connectSecure(host: string, port: number, rejectUnauthorized: boolean) {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized }, () => resolve(socket));
    socket.once("error", reject);
  });
}

async function upgradeToTls(socket: net.Socket | tls.TLSSocket, host: string, rejectUnauthorized: boolean) {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: host,
      rejectUnauthorized,
    });

    secureSocket.once("secureConnect", () => resolve(secureSocket));
    secureSocket.once("error", reject);
  });
}

async function sendViaSmtp(config: EmailTransportConfig, email: OutboundEmail): Promise<EmailSendResult> {
  if (!config.smtp) {
    throw new Error("La configuración SMTP no está disponible.");
  }

  let socket: net.Socket | tls.TLSSocket = config.smtp.secure
    ? await connectSecure(config.smtp.host, config.smtp.port, config.smtp.rejectUnauthorized)
    : await connectPlain(config.smtp.host, config.smtp.port);
  let session = new SmtpSession(socket);

  let response = await session.readResponse();
  if (response.code !== 220) {
    throw new Error(`SMTP no respondió correctamente al conectar (${response.code}).`);
  }

  response = await session.send(`EHLO ${os.hostname()}`);
  if (response.code !== 250) {
    throw new Error(`SMTP no aceptó EHLO (${response.code}).`);
  }

  if (!config.smtp.secure && response.lines.some((line) => /STARTTLS/i.test(line))) {
    const startTlsResponse = await session.send("STARTTLS");
    if (startTlsResponse.code !== 220) {
      throw new Error(`SMTP no aceptó STARTTLS (${startTlsResponse.code}).`);
    }

    socket = await upgradeToTls(socket, config.smtp.host, config.smtp.rejectUnauthorized);
    session = new SmtpSession(socket);
    response = await session.send(`EHLO ${os.hostname()}`);
    if (response.code !== 250) {
      throw new Error(`SMTP no aceptó EHLO tras STARTTLS (${response.code}).`);
    }
  }

  if (config.smtp.user && config.smtp.password) {
    const authResponse = await session.send("AUTH LOGIN");
    if (authResponse.code !== 334) {
      throw new Error(`SMTP no aceptó AUTH LOGIN (${authResponse.code}).`);
    }

    const userResponse = await session.send(Buffer.from(config.smtp.user).toString("base64"));
    if (userResponse.code !== 334) {
      throw new Error(`SMTP no aceptó el usuario (${userResponse.code}).`);
    }

    const passResponse = await session.send(Buffer.from(config.smtp.password).toString("base64"));
    if (passResponse.code !== 235) {
      throw new Error(`SMTP no autenticó correctamente (${passResponse.code}).`);
    }
  }

  const from = formatAddress(email.from || `${config.senderName} <${config.senderEmail}>`);
  const replyTo = formatAddress(email.replyTo || config.replyToEmail);
  const toList = Array.isArray(email.to) ? email.to : [email.to];
  const message = buildMessage(email, from, replyTo);

  const mailFromResponse = await session.send(`MAIL FROM:<${extractEmailAddress(from)}>`);
  if (mailFromResponse.code !== 250) {
    throw new Error(`SMTP rechazó el remitente (${mailFromResponse.code}).`);
  }

  for (const recipient of toList) {
    const rcptResponse = await session.send(`RCPT TO:<${extractEmailAddress(recipient)}>`);
    if (rcptResponse.code !== 250 && rcptResponse.code !== 251) {
      throw new Error(`SMTP rechazó el destinatario (${rcptResponse.code}).`);
    }
  }

  const dataResponse = await session.send("DATA");
  if (dataResponse.code !== 354) {
    throw new Error(`SMTP no entró en modo DATA (${dataResponse.code}).`);
  }

  const finalResponse = await session.sendMessage(message.replace(/^\./gm, ".."));
  if (finalResponse.code !== 250) {
    throw new Error(`SMTP no aceptó el mensaje (${finalResponse.code}).`);
  }

  try {
    await session.send("QUIT");
  } catch {
    session.close();
  }

  return {
    provider: "smtp",
    messageId: null,
    accepted: toList,
  };
}

function buildApiPayload(config: EmailTransportConfig, email: OutboundEmail) {
  const from = formatAddress(email.from || `${config.senderName} <${config.senderEmail}>`);
  return {
    from: config.api?.from || from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: email.replyTo || config.replyToEmail,
  };
}

export function getEmailTransportConfig(): EmailTransportConfig {
  const mode = (process.env.EMAIL_TRANSPORT_MODE || "smtp").toLowerCase() as EmailTransportMode;
  const senderName = process.env.EMAIL_SENDER_NAME || process.env.EMAIL_FROM_NAME || "El Hogar de tus Sueños";
  const senderEmail = process.env.EMAIL_SENDER_EMAIL || process.env.EMAIL_FROM_EMAIL || "info@elhogardetsuenos.com";
  const replyToEmail = process.env.EMAIL_REPLY_TO || senderEmail;
  const supportEmail = process.env.EMAIL_SUPPORT_EMAIL || senderEmail;

  const config: EmailTransportConfig = {
    mode,
    senderName,
    senderEmail,
    replyToEmail,
    supportEmail,
  };

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
  if (config.mode === "api") {
    return Boolean(config.api?.url);
  }

  return Boolean(config.smtp?.host && config.smtp?.user && config.smtp?.password);
}

export async function sendOutboundEmail(config: EmailTransportConfig, email: OutboundEmail): Promise<EmailSendResult> {
  if (config.mode === "api") {
    if (!config.api?.url) {
      throw new Error("EMAIL_API_URL no está configurada.");
    }

    const response = await fetch(config.api.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.api.key ? { Authorization: `Bearer ${config.api.key}` } : {}),
      },
      body: JSON.stringify(buildApiPayload(config, email)),
    });

    if (!response.ok) {
      throw new Error(`La API de correo respondió con ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));
    return {
      provider: "api",
      messageId: String(data.messageId ?? data.id ?? ""),
      accepted: Array.isArray(data.accepted) ? data.accepted.map(String) : undefined,
    };
  }

  return sendViaSmtp(config, email);
}
