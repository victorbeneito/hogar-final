import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/auth?error=${error}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/auth?error=missing_code`
      );
    }

    // 1. Intercambiar code por access_token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("❌ Error intercambiando code por token:", error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/auth?error=token_exchange_failed`
      );
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

    // 2. Obtener perfil del usuario
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!userResponse.ok) {
      console.error("❌ Error obteniendo perfil de Google");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/auth?error=profile_fetch_failed`
      );
    }

    const googleUser = (await userResponse.json()) as GoogleUserInfo;

    // 3. Buscar o crear cliente en la BD
    let cliente = await prisma.cliente.findFirst({
      where: {
        OR: [{ googleId: googleUser.id }, { email: googleUser.email }],
      },
      select: {
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
        googleId: true,
        provider: true,
      },
    });

    if (!cliente) {
      // Crear nuevo cliente
      cliente = await prisma.cliente.create({
        data: {
          nombre: googleUser.given_name || googleUser.name,
          apellidos: googleUser.family_name || "",
          email: googleUser.email,
          password: "", // Sin contraseña para cuentas Google
          googleId: googleUser.id,
          provider: "google",
          pais: "España",
          role: "cliente",
        },
        select: {
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
          googleId: true,
          provider: true,
        },
      });
    } else {
      // Actualizar googleId si no tenía
      if (!cliente.googleId) {
        await prisma.cliente.update({
          where: { id: cliente.id },
          data: {
            googleId: googleUser.id,
            provider: "google",
          },
        });
        cliente.googleId = googleUser.id;
        cliente.provider = "google";
      }
    }

    // 4. Generar JWT
    const token = jwt.sign(
      { id: cliente.id, email: cliente.email },
      process.env.SECRETO_JWT_CLIENTE!,
      { expiresIn: "24h" }
    );

    // 5. Codificar cliente como JSON para pasar por URL
    const clienteJson = JSON.stringify(cliente);
    const clienteBase64 = Buffer.from(clienteJson).toString("base64");

    // 6. Redirigir a página de éxito
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/google/success?token=${encodeURIComponent(token)}&cliente=${clienteBase64}`
    );
  } catch (error: any) {
    console.error("❌ Error en Google OAuth callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth?error=callback_error`
    );
  }
}
