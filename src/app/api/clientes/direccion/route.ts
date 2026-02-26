import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import jwt from 'jsonwebtoken';

// 👇 SOLUCIÓN AL ERROR DE FIRMA:
// Definimos la clave buscando en las variables de entorno más comunes.
// Si en tu registro usaste "JWT_SECRET", esto lo detectará automáticamente.
const SECRET_KEY = process.env.SECRETO_JWT_CLIENTE || process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

function getTokenFromHeader(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.replace('Bearer ', '');
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ ok: false, error: 'Token requerido' }, { status: 401 });

    // Usamos la constante SECRET_KEY que hemos definido arriba
    const decoded: any = jwt.verify(token, SECRET_KEY);
    const id = parseInt(decoded.id);

    const cliente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!cliente) return NextResponse.json({ ok: false, error: 'Cliente no encontrado' }, { status: 404 });

    // Quitamos el password antes de enviarlo
    const { password: _, ...datosDireccion } = cliente;
    return NextResponse.json({ ok: true, direccion: datosDireccion });

  } catch (error: any) {
    console.error("Error GET Dirección:", error.message);
    return NextResponse.json({ ok: false, error: "Sesión inválida o expirada" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ ok: false, error: 'Token requerido' }, { status: 401 });

    // 👇 AQUÍ FALLABA ANTES: Ahora usa SECRET_KEY corregida
    const decoded: any = jwt.verify(token, SECRET_KEY);
    const id = parseInt(decoded.id);
    
    const body = await req.json();

    const updateData = {
      empresa: body.empresa,
      direccion: body.direccion,
      direccionComplementaria: body.direccionComplementaria,
      codigoPostal: body.codigoPostal,
      ciudad: body.ciudad,
      pais: body.pais || 'España',
      provincia: body.provincia,
      telefono: body.telefono,
      nif: body.nif,
    };

    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ ok: true, direccion: clienteActualizado });

  } catch (error: any) {
    console.error("❌ Error PUT Dirección:", error.message);
    
    // Si el error es de firma, devolvemos 401 para que el frontend sepa que debe reloguear si es necesario
    if (error.message === "invalid signature" || error.message === "jwt malformed") {
        return NextResponse.json({ ok: false, error: "Error de seguridad: Tu sesión no es válida. Por favor, cierra sesión y entra de nuevo." }, { status: 401 });
    }

    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}