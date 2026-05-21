import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest, isSuperAdmin, canEdit } from "@/lib/adminAuth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const usuario = await prisma.admin.findUnique({
    where: { id: Number(id) },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
  });

  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  return NextResponse.json(usuario);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSuperAdmin(req)) {
    return NextResponse.json({ error: "Solo el superadmin puede editar usuarios" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { nombre, email, password, rol, activo } = body;

  if (!nombre || !email || !rol) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  if (!["admin", "superadmin"].includes(rol)) {
    return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    nombre,
    email: email.toLowerCase(),
    rol,
    activo: activo ?? true,
    updatedAt: new Date(),
  };

  if (password && password.trim() !== "") {
    data.password = await bcrypt.hash(password, 10);
  }

  const actualizado = await prisma.admin.update({
    where: { id: Number(id) },
    data,
    select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
  });

  return NextResponse.json(actualizado);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSuperAdmin(req)) {
    return NextResponse.json({ error: "Solo el superadmin puede eliminar usuarios" }, { status: 403 });
  }

  const { id } = await params;
  const adminReq = getAdminFromRequest(req);

  if (adminReq?.adminId === Number(id)) {
    return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 });
  }

  await prisma.admin.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
