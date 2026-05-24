import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { sendRawEmail, sendTemplateEmail } from "@/lib/emailService";
import type { EmailTemplateSlug } from "@/lib/emailConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendEmailBody = {
  to?: string | string[];
  templateSlug?: EmailTemplateSlug;
  variables?: Record<string, string | number | boolean | null | undefined>;
  subject?: string;
  html?: string;
  text?: string;
  replyTo?: string;
  from?: string;
};

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as SendEmailBody;

    if (!body.to) {
      return NextResponse.json({ ok: false, error: "Falta el destinatario" }, { status: 400 });
    }

    if (body.templateSlug) {
      const result = await sendTemplateEmail({
        to: body.to,
        templateSlug: body.templateSlug,
        variables: body.variables,
        replyTo: body.replyTo,
        from: body.from,
      });

      return NextResponse.json({ ok: true, result, adminEmail: admin.email });
    }

    if (!body.subject || !body.html) {
      return NextResponse.json({ ok: false, error: "Faltan subject y html" }, { status: 400 });
    }

    const result = await sendRawEmail({
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: body.text,
      replyTo: body.replyTo,
      from: body.from,
    });

    return NextResponse.json({ ok: true, result, adminEmail: admin.email });
  } catch (error: any) {
    console.error("❌ [correos/enviar] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error.message || "Error de envío",
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response,
    }, { status: 500 });
  }
}
