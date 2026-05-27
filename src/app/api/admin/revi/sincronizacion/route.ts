import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendReviOrder } from '@/lib/reviService';
import { canEdit } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    const pedidosPendientes = await prisma.pedido.count({
      where: { estado: 'CUESTIONARIO' }
    });

    return NextResponse.json({
      ok: true,
      pedidosPendientes,
      ultimaSincronizacion: new Date().toISOString(),
      status: pedidosPendientes === 0 ? 'sincronizado' : 'pendiente'
    });
  } catch (error: any) {
    console.error('[REVI] Error fetching sync stats:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error fetching stats' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso para sincronizar" }, { status: 403 });
  }
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { estado: 'CUESTIONARIO' },
      include: {
        cliente: true,
        pedidoproducto: {
          include: { producto: true }
        }
      }
    });

    let enviados = 0;
    let errores: string[] = [];

    for (const pedido of pedidos) {
      try {
        await sendReviOrder(pedido as any);
        enviados++;
      } catch (err: any) {
        errores.push(`Pedido ${pedido.numeroPedido}: ${err?.message || 'Error desconocido'}`);
      }
    }

    const pendientes = await prisma.pedido.count({
      where: { estado: 'CUESTIONARIO' }
    });

    return NextResponse.json({
      ok: true,
      enviados,
      pendientes,
      errores: errores.length > 0 ? errores : undefined
    });
  } catch (error: any) {
    console.error('[REVI] Error syncing orders:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error syncing orders' },
      { status: 500 }
    );
  }
}
