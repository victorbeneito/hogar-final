import { NextResponse } from "next/server";
import { buildUrl } from "@/lib/urls";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  // Debe coincidir carácter a carácter con una de las URIs de redirección dadas de alta
  // en Google Cloud Console, y con la de callback/route.ts.
  const redirectUri = buildUrl("/api/auth/google/callback");

  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth no configurado (falta GOOGLE_CLIENT_ID)" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return NextResponse.json({
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  });
}
