import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canEdit } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso para modificar mapeos" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const mapeos = body.mapeos || [];

    if (!Array.isArray(mapeos) || mapeos.length === 0) {
      return NextResponse.json({ ok: false, error: 'Invalid mapeos array' }, { status: 400 });
    }

    let importedCount = 0;
    let errors = [];

    for (const item of mapeos) {
      const { idPrestashop, referencia } = item;

      if (!idPrestashop || !referencia) {
        errors.push(`Skipped invalid item: ${JSON.stringify(item)}`);
        continue;
      }

      const producto = await prisma.producto.findFirst({
        where: { referencia }
      });

      await prisma.mapeo_producto_ps.upsert({
        where: { idPrestashop },
        update: {
          referencia,
          productoId: producto?.id || null,
          updatedAt: new Date()
        },
        create: {
          idPrestashop,
          referencia,
          productoId: producto?.id || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      importedCount++;
    }

    const totalMapeos = await prisma.mapeo_producto_ps.count();

    return NextResponse.json({
      ok: true,
      importedCount,
      totalMapeos,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('[REVI] Error importing mapeo:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error importing mapeos' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const skip = (page - 1) * limit;

    const [mapeos, total] = await Promise.all([
      prisma.mapeo_producto_ps.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          idPrestashop: true,
          referencia: true,
          productoId: true,
          createdAt: true,
          producto: {
            select: { id: true, nombre: true }
          }
        },
        orderBy: { idPrestashop: 'asc' }
      }),
      prisma.mapeo_producto_ps.count()
    ]);

    return NextResponse.json({
      ok: true,
      mapeos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('[REVI] Error fetching mapeos:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error fetching mapeos' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');

    if (!idStr) {
      return NextResponse.json({ ok: false, error: 'Missing id parameter' }, { status: 400 });
    }

    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
    }

    await prisma.mapeo_producto_ps.delete({
      where: { id }
    });

    const totalMapeos = await prisma.mapeo_producto_ps.count();

    return NextResponse.json({
      ok: true,
      totalMapeos
    });
  } catch (error: any) {
    console.error('[REVI] Error deleting mapeo:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error deleting mapeo' },
      { status: 500 }
    );
  }
}
