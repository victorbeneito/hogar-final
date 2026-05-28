import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader && authHeader.split(" ")[1]?.replace(/"/g, '');

    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 401 });

    let esSuperAdmin = false;
    try {
      const secret = process.env.SECRETO_JWT_ADMIN || "palabra_secreta_emergencia_2026";
      const decoded: any = jwt.verify(token, secret);
      const rolUpper = decoded.rol?.toUpperCase() ?? "";
      if (["SUPERADMIN"].includes(rolUpper)) esSuperAdmin = true;
    } catch (e) {}

    if (!esSuperAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const result = await prisma.visita.deleteMany({});

    return NextResponse.json({ ok: true, borradas: result.count });
  } catch (error) {
    console.error("Error al limpiar visitas:", error);
    return NextResponse.json({ error: "Error al limpiar" }, { status: 500 });
  }
}
