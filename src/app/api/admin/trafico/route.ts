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

    // Calcular fechas
    const ahora = new Date();
    const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
    const ayerInicio = new Date(hoyInicio);
    ayerInicio.setDate(ayerInicio.getDate() - 1);
    const ayerFin = new Date(hoyInicio);

    // Visitantes en línea (últimos 30 minutos)
    const visitantesOnline = await prisma.visita.findMany({
      where: {
        timestamp: {
          gte: new Date(ahora.getTime() - 30 * 60 * 1000),
        },
      },
      select: { sessionId: true },
      distinct: ['sessionId'],
    });

    // Visitas hoy
    const visitasHoy = await prisma.visita.count({
      where: {
        timestamp: { gte: hoyInicio },
      },
    });

    // Visitas ayer
    const visitasAyer = await prisma.visita.count({
      where: {
        timestamp: { gte: ayerInicio, lt: ayerFin },
      },
    });

    // Gráfica últimas 24 horas (agrupado por hora)
    const ultimas24h = await prisma.visita.findMany({
      where: {
        timestamp: { gte: new Date(ahora.getTime() - 24 * 60 * 60 * 1000) },
      },
      select: { timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    const graficaMap = new Map<string, number>();
    for (let i = 0; i < 24; i++) {
      const hora = new Date(ahora);
      hora.setHours(ahora.getHours() - (23 - i), 0, 0, 0);
      const horaStr = hora.toISOString().slice(0, 13);
      graficaMap.set(horaStr, 0);
    }

    ultimas24h.forEach((visita) => {
      const horaStr = new Date(visita.timestamp).toISOString().slice(0, 13);
      if (graficaMap.has(horaStr)) {
        graficaMap.set(horaStr, (graficaMap.get(horaStr) || 0) + 1);
      }
    });

    const grafica24h = Array.from(graficaMap.entries()).map(([hora, visitas]) => ({
      hora: new Date(hora + ':00:00').toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      visitas,
    }));

    // Top 10 páginas
    const topPaginas = await prisma.visita.groupBy({
      by: ['url'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Fuentes de tráfico
    const fuentes = await prisma.visita.groupBy({
      by: ['fuente'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Dispositivos
    const dispositivos = await prisma.visita.groupBy({
      by: ['dispositivo'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Calcular porcentaje de cambio
    const porcentajeCambio = visitasAyer === 0
      ? (visitasHoy > 0 ? 100 : 0)
      : Math.round(((visitasHoy - visitasAyer) / visitasAyer) * 100);

    return NextResponse.json({
      visitantesOnline: visitantesOnline.length,
      visitasHoy,
      visitasAyer,
      porcentajeCambio,
      grafica24h,
      topPaginas: topPaginas.map(p => ({
        url: p.url,
        visitas: p._count.id,
      })),
      fuentes: fuentes.map(f => ({
        fuente: f.fuente || 'directo',
        cantidad: f._count.id,
      })),
      dispositivos: dispositivos.map(d => ({
        dispositivo: d.dispositivo || 'desktop',
        cantidad: d._count.id,
      })),
    });
  } catch (error) {
    console.error("Error al obtener estadísticas de tráfico:", error);
    return new NextResponse(
      JSON.stringify({ error: "Error al obtener estadísticas" }),
      { status: 500 }
    );
  }
}
