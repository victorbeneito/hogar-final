import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    // Verificación de seguridad (Token Admin)
    const authHeader = req.headers.get("authorization");
    const token = authHeader && authHeader.split(" ")[1]?.replace(/"/g, '');

    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 401 });

    let esAdmin = false;
    try {
      const secret = process.env.SECRETO_JWT_ADMIN || "palabra_secreta_emergencia_2026";
      const decodedAdmin: any = jwt.verify(token, secret);
      const rolUpper = decodedAdmin.rol?.toUpperCase() ?? "";
      if (["ADMIN", "SUPERADMIN", "AUDITOR"].includes(rolUpper)) esAdmin = true;
    } catch (e) {}

    if (!esAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Parámetros de período opcionales
    const { searchParams } = new URL(req.url);
    const desdeParam = searchParams.get('desde');
    const hastaParam = searchParams.get('hasta');

    let periodoDesde: Date | undefined;
    let periodoHasta: Date | undefined;

    if (desdeParam && hastaParam) {
      periodoDesde = new Date(desdeParam);
      periodoHasta = new Date(hastaParam);
      periodoHasta.setHours(23, 59, 59, 999);
    }

    // 1. Más vendidos (de pedidos)
    const masVendidosRaw = await prisma.pedidoproducto.groupBy({
      by: ['productoIdRef', 'nombre'],
      _sum: { cantidad: true, subtotal: true },
      where: periodoDesde && periodoHasta
        ? {
            pedido: {
              fechaPedido: { gte: periodoDesde, lte: periodoHasta }
            }
          }
        : undefined,
      orderBy: { _sum: { cantidad: 'desc' } },
      take: 10,
    });

    const masVendidos = masVendidosRaw.map((item: any) => ({
      id: item.productoIdRef,
      nombre: item.nombre,
      cantidad: item._sum?.cantidad || 0,
      total: Math.round((item._sum?.subtotal || 0) * 100) / 100,
    }));

    // 2. Más vistos (de visitas a productos)
    const masVistosRaw = await prisma.visita.groupBy({
      by: ['url'],
      _count: { id: true },
      where: {
        url: { startsWith: '/productos/' },
        ...(periodoDesde && periodoHasta ? { timestamp: { gte: periodoDesde, lte: periodoHasta } } : {}),
      },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Extraer slugs de URLs y buscar productos
    const slugs = masVistosRaw.map((v: any) => {
      const match = v.url.match(/\/productos\/([^/?]+)/);
      return match ? match[1] : null;
    }).filter(Boolean);

    const productosVistos = slugs.length > 0
      ? await prisma.producto.findMany({
          where: { slug: { in: slugs } },
          select: { id: true, nombre: true, slug: true },
        })
      : [];

    const masVistos = masVistosRaw
      .map((v: any) => {
        const match = v.url.match(/\/productos\/([^/?]+)/);
        const slug = match ? match[1] : null;
        const producto = productosVistos.find(p => p.slug === slug);
        return {
          id: producto?.id,
          slug,
          nombre: producto?.nombre || slug || v.url,
          visitas: v._count.id,
        };
      })
      .filter(item => item.nombre);

    // 3. Más buscados
    const masBuscados = await prisma.busqueda_log.groupBy({
      by: ['termino'],
      _count: { id: true },
      where: periodoDesde && periodoHasta
        ? { timestamp: { gte: periodoDesde, lte: periodoHasta } }
        : undefined,
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const masBuscadosFormatted = masBuscados.map((item: any) => ({
      termino: item.termino,
      cantidad: item._count.id,
    }));

    return NextResponse.json({
      masVendidos,
      masVistos,
      masBuscados: masBuscadosFormatted,
    });
  } catch (error: any) {
    console.error("Error al obtener estadísticas de productos:", error);
    return new NextResponse(
      JSON.stringify({ error: "Error al obtener estadísticas" }),
      { status: 500 }
    );
  }
}
