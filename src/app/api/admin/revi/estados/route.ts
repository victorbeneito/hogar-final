import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const estadosPedido = await prisma.estadopedido.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      select: { clave: true, nombre: true }
    });

    const estados = estadosPedido.map((e) => e.clave);

    return NextResponse.json({
      ok: true,
      estados,
      estadosPedido
    });
  } catch (error: any) {
    console.error('[REVI] Error fetching estados:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error fetching estados' },
      { status: 500 }
    );
  }
}
