import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    // 1. Verificación de seguridad (Token Admin)
    const authHeader = req.headers.get("authorization");
    const token = authHeader && authHeader.split(" ")[1]?.replace(/"/g, '');

    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 401 });

    let esAdmin = false;
    try {
        // Usa una clave segura de respaldo por si falla la variable de entorno
        const secret = process.env.SECRETO_JWT_ADMIN || "palabra_secreta_emergencia_2026";
        const decodedAdmin: any = jwt.verify(token, secret);
        
        // Comprobamos roles (acepta mayúsculas o minúsculas)
        if (decodedAdmin.rol?.toUpperCase() === "ADMIN") esAdmin = true;
    } catch (e) {}

    if (!esAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const [
      productos,
      categorias,
      marcas,
      pedidos,
      clientes,
      cupones,
    ] = await Promise.all([
      prisma.producto.count(),
      prisma.categoria.count(),
      prisma.marca.count(),
      prisma.pedido.count(),
      prisma.cliente.count(),
      prisma.cupon.count(),
    ]);

    return NextResponse.json({
      productos,
      categorias,
      marcas,
      pedidos,
      clientes,
      cupones,
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return new NextResponse(
      JSON.stringify({ error: "Error al obtener estadísticas" }),
      { status: 500 }
    );
  }
}
