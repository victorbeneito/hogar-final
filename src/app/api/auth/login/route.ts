import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // 1. Buscar cliente en la tabla Cliente
    const cliente = await prisma.cliente.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!cliente) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 401 }
      );
    }

    // 2. Verificar contraseña
    const esValido = await bcrypt.compare(password, cliente.password);
    if (!esValido) {
      return NextResponse.json(
        { ok: false, error: "Contraseña incorrecta" },
        { status: 401 }
      );
    }

    // 3. Crear Token
    const token = jwt.sign(
      { id: cliente.id, email: cliente.email },
      process.env.SECRETO_JWT_CLIENTE!,
      { expiresIn: "24h" }
    );

    // 4. Limpiar contraseña para devolver el objeto
    const { password: _, ...clienteSinPassword } = cliente;

    return NextResponse.json({
      ok: true,
      token,
      cliente: clienteSinPassword,
    });

  } catch (error: any) {
    console.error("❌ Error en login cliente:", error.message);
    return NextResponse.json(
      { ok: false, error: "Error de servidor" },
      { status: 500 }
    );
  }
}

