import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTemplateEmail } from "@/lib/emailService";
import { buildUrl } from "@/lib/urls";
import {
  MINUTOS_VALIDEZ_RESET,
  crearTokenReset,
  demasiadasSolicitudes,
  normalizarEmail,
} from "@/lib/passwordReset";

/**
 * Paso 1 de la recuperación: el cliente pide el enlace.
 *
 * Responde siempre `ok: true` con el mismo mensaje, exista el email o no.
 * Si distinguiéramos los casos, este formulario público serviría para
 * averiguar qué correos tienen cuenta en la tienda.
 */
export async function POST(req: NextRequest) {
  const respuestaGenerica = NextResponse.json({
    ok: true,
    message:
      "Si el correo corresponde a una cuenta, te hemos enviado un enlace para crear una contraseña nueva.",
  });

  try {
    const { email } = await req.json();
    const emailNormalizado = normalizarEmail(email);

    if (!emailNormalizado || !emailNormalizado.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Introduce un correo electrónico válido." },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.findUnique({
      where: { email: emailNormalizado },
      select: { id: true, nombre: true, email: true },
    });

    if (!cliente) return respuestaGenerica;

    if (await demasiadasSolicitudes(cliente.id)) {
      console.warn(`⚠️ Recuperación: demasiadas solicitudes para cliente ${cliente.id}`);
      return respuestaGenerica;
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const { token } = await crearTokenReset(cliente.id, ip);

    // El envío sí se espera: si el SMTP falla queremos verlo en el log del
    // servidor, aunque al cliente le sigamos dando la respuesta genérica.
    try {
      await sendTemplateEmail({
        to: cliente.email,
        templateSlug: "password-reset",
        variables: {
          nombre: cliente.nombre,
          email: cliente.email,
          resetUrl: buildUrl(`/auth/restablecer?token=${encodeURIComponent(token)}`),
          minutosValidez: MINUTOS_VALIDEZ_RESET,
        },
      });
    } catch (err: any) {
      console.error("❌ Email recuperación contraseña:", err?.message);
    }

    return respuestaGenerica;
  } catch (error: any) {
    console.error("❌ Error en recuperar contraseña:", error?.message);
    return NextResponse.json({ ok: false, error: "Error de servidor" }, { status: 500 });
  }
}
