import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest, isSuperAdmin, canEdit } from "@/lib/adminAuth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuarios = await prisma.admin.findMany({
    select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  if (!isSuperAdmin(req)) {
    return NextResponse.json({ error: "Solo el superadmin puede crear usuarios" }, { status: 403 });
  }

  const body = await req.json();
  const { nombre, email, password, rol, activo } = body;

  if (!nombre || !email || !password || !rol) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  if (!["superadmin", "admin", "support", "auditor"].includes(rol)) {
    return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
  }

  const existe = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (existe) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const nuevo = await prisma.admin.create({
    data: {
      nombre,
      email: email.toLowerCase(),
      password: hash,
      rol,
      activo: activo ?? true,
      updatedAt: new Date(),
    },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
  });

  return NextResponse.json(nuevo, { status: 201 });
}
