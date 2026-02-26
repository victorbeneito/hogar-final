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

    const { oldPassword, newPassword } = await req.json();

    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const match = await bcrypt.compare(oldPassword, cliente.password);
    if (!match) return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 401 });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.cliente.update({
      where: { id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error al cambiar contraseña" }, { status: 500 });
  }
}