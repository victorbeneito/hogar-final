import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.SECRETO_JWT_CLIENTE!);
    const id = parseInt(decoded.id);

    const { password, newEmail } = await req.json();

    if (!newEmail || !password) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const match = await bcrypt.compare(password, cliente.password);
    if (!match) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });

    // Verificar si el email ya existe en OTRO cliente
    const emailExistente = await prisma.cliente.findUnique({ where: { email: newEmail } });
    if (emailExistente && emailExistente.id !== id) {
      return NextResponse.json({ error: "Ese correo ya está registrado" }, { status: 409 });
    }

    const actualizado = await prisma.cliente.update({
      where: { id },
      data: { email: newEmail }
    });

    return NextResponse.json({ message: "Email actualizado", email: actualizado.email });
  } catch (error) {
    return NextResponse.json({ error: "Error al cambiar el correo" }, { status: 500 });
  }
}