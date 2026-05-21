import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    console.log(`🔐 Admin Login intento: ${email}`);

    // 1. Buscar usuario
    const admin = await prisma.admin.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });

    // 2. Comprobar si existe y si tiene rol válido (admin, superadmin o auditor)
    const rolLower = admin?.rol?.toString().toLowerCase() ?? "";

    if (!admin || !["admin", "superadmin", "auditor"].includes(rolLower)) {
      console.warn(`❌ Login fallido: Usuario no encontrado o sin permisos (${admin?.rol})`);
      return NextResponse.json(
        { ok: false, error: "Credenciales inválidas o sin permisos" },
        { status: 401 }
      );
    }

    // 3. Verificar contraseña
    const esValido = await bcrypt.compare(password, admin.password);
    
    if (!esValido) {
      console.warn("❌ Login fallido: Contraseña incorrecta");
      return NextResponse.json(
        { ok: false, error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // 4. Crear Token
    const secret = process.env.SECRETO_JWT_ADMIN || "palabra_secreta_emergencia_2026";

    // 🔥🔥 AQUÍ ESTÁ EL CAMBIO IMPORTANTE 🔥🔥
    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        
          rol: admin.rol,
        
        nombre: admin.nombre 
      },
      secret,
      { expiresIn: "7d" }
    );

    // 5. Preparar respuesta
    const { password: _, ...adminSinPassword } = admin;

    const response = NextResponse.json({ 
      ok: true, 
      token, 
      user: adminSinPassword 
    });

    response.cookies.set("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
    });

    console.log(`✅ Admin Login ÉXITO (rol: ${admin.rol})`);
    return response;

  } catch (error: any) {
    console.error("❌ CRITICAL ERROR en admin-login:", error);
    return NextResponse.json(
      { ok: false, error: "Error del servidor: " + error.message },
      { status: 500 }
    );
  }
}