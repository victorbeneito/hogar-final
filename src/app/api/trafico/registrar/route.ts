import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, ipHash, url, referrer, fuente, dispositivo } = body;

    // Validación básica
    if (!sessionId || !ipHash || !url) {
      return NextResponse.json(
        { error: "Campos requeridos" },
        { status: 400 }
      );
    }

    // Registrar la visita
    await prisma.visita.create({
      data: {
        sessionId,
        ipHash,
        url,
        referrer: referrer || null,
        fuente: fuente || 'directo',
        dispositivo: dispositivo || 'desktop',
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al registrar visita:", error);
    // No retornar error para no interrumpir la experiencia del usuario
    return NextResponse.json({ ok: true });
  }
}
