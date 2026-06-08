import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function hashIP(ip: string): Promise<string> {
  const salt = 'visitor_salt_2026';
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, url, referrer, fuente, dispositivo } = body;

    if (!sessionId || !url) {
      return NextResponse.json({ error: "Campos requeridos" }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || req.headers.get('cf-connecting-ip')
      || '0.0.0.0';

    const ipHash = await hashIP(ip);

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
    return NextResponse.json({ ok: true });
  }
}
