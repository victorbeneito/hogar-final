import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  MIN_LONGITUD_PASSWORD,
  ofuscarEmail,
  validarTokenReset,
} from "@/lib/passwordReset";

const ERROR_TOKEN =
  "El enlace no es válido o ha caducado. Vuelve a pedir uno nuevo desde «He olvidado mi contraseña».";

/** Campos que el front espera de un cliente autenticado (mismos que el login). */
const camposCliente = {
  id: true,
  nombre: true,
  apellidos: true,
  email: true,
  telefono: true,
  empresa: true,
  nif: true,
  direccion: true,
  direccionComplementaria: true,
  codigoPostal: true,
  ciudad: true,
  provincia: true,
  pais: true,
  activo: true,
  aceptaMarketing: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Comprobación previa: la página de restablecer la llama al cargar para no
 * dejar que el cliente escriba una contraseña nueva con un enlace ya caducado.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    const reset = await validarTokenReset(token);

    if (!reset) {
      return NextResponse.json({ ok: false, error: ERROR_TOKEN }, { status: 400 });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: reset.clienteId },
      select: { email: true },
    });

    if (!cliente) {
      return NextResponse.json({ ok: false, error: ERROR_TOKEN }, { status: 400 });
    }

    return NextResponse.json({ ok: true, email: ofuscarEmail(cliente.email) });
  } catch (error: any) {
    console.error("❌ Error validando token de reset:", error?.message);
    return NextResponse.json({ ok: false, error: "Error de servidor" }, { status: 500 });
  }
}

/**
 * Paso 2 de la recuperación: guarda la contraseña nueva y deja al cliente
 * dentro de su cuenta, para que pueda seguir con la compra sin volver a login.
 */
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!password || String(password).length < MIN_LONGITUD_PASSWORD) {
      return NextResponse.json(
        {
          ok: false,
          error: `La contraseña debe tener al menos ${MIN_LONGITUD_PASSWORD} caracteres.`,
        },
        { status: 400 }
      );
    }

    const reset = await validarTokenReset(token);
    if (!reset) {
      return NextResponse.json({ ok: false, error: ERROR_TOKEN }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const ahora = new Date();

    // Todo junto: si algo falla, el token no se gasta y el enlace sigue sirviendo.
    const [cliente] = await prisma.$transaction([
      prisma.cliente.update({
        where: { id: reset.clienteId },
        data: {
          password: hashedPassword,
          // Quien demuestra controlar el correo y elige contraseña deja de ser
          // un invitado: si no, /api/auth/register podría sobrescribir su ficha.
          esInvitado: false,
          updatedAt: ahora,
        },
        select: camposCliente,
      }),
      prisma.password_reset.update({
        where: { id: reset.resetId },
        data: { usadoEn: ahora },
      }),
      // Cualquier otro enlace pendiente del mismo cliente queda inservible.
      prisma.password_reset.updateMany({
        where: { clienteId: reset.clienteId, usadoEn: null },
        data: { usadoEn: ahora },
      }),
    ]);

    const jwtToken = jwt.sign(
      { id: cliente.id, email: cliente.email },
      process.env.SECRETO_JWT_CLIENTE!,
      { expiresIn: "24h" }
    );

    return NextResponse.json({
      ok: true,
      message: "Contraseña actualizada. Ya puedes entrar en tu cuenta.",
      token: jwtToken,
      cliente,
    });
  } catch (error: any) {
    console.error("❌ Error restableciendo contraseña:", error?.message);
    return NextResponse.json({ ok: false, error: "Error de servidor" }, { status: 500 });
  }
}
