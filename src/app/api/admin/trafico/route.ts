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

    // 2. Parámetros de período opcionales
    const { searchParams } = new URL(req.url);
    const desdeParam = searchParams.get('desde');
    const hastaParam = searchParams.get('hasta');

    // Calcular fechas
    const ahora = new Date();
    let periodoDesde: Date;
    let periodoHasta: Date;
    let usandoPeriodoCustom = false;

    if (desdeParam && hastaParam) {
      periodoDesde = new Date(desdeParam);
      periodoHasta = new Date(hastaParam);
      periodoHasta.setHours(23, 59, 59, 999);
      usandoPeriodoCustom = true;
    } else {
      // Comportamiento por defecto: hoy y ayer
      periodoHasta = new Date(ahora);
      periodoDesde = new Date(ahora);
      periodoDesde.setDate(periodoDesde.getDate() - 1);
    }

    const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
    const ayerInicio = new Date(hoyInicio);
    ayerInicio.setDate(ayerInicio.getDate() - 1);
    const ayerFin = new Date(hoyInicio);

    // Visitantes en línea (últimos 30 minutos, siempre)
    const visitantesOnline = await prisma.visita.findMany({
      where: {
        timestamp: {
          gte: new Date(ahora.getTime() - 30 * 60 * 1000),
        },
      },
      select: { sessionId: true },
      distinct: ['sessionId'],
    });

    // Sesiones únicas en el período seleccionado (no page views)
    const sesionesEnPeriodo = await prisma.visita.findMany({
      where: {
        timestamp: { gte: periodoDesde, lte: periodoHasta },
      },
      select: { sessionId: true },
      distinct: ['sessionId'],
    });
    const visitasEnPeriodo = sesionesEnPeriodo.length;

    // Para mantener compatibilidad: si no hay período custom, calcular ayer también
    let visitasAyer = 0;
    let porcentajeCambio = 0;
    if (!usandoPeriodoCustom) {
      const sesionesAyer = await prisma.visita.findMany({
        where: {
          timestamp: { gte: ayerInicio, lt: ayerFin },
        },
        select: { sessionId: true },
        distinct: ['sessionId'],
      });
      visitasAyer = sesionesAyer.length;
      porcentajeCambio = visitasAyer === 0
        ? (visitasEnPeriodo > 0 ? 100 : 0)
        : Math.round(((visitasEnPeriodo - visitasAyer) / visitasAyer) * 100);
    }

    // Gráfica del período — se usa primera visita de cada sesión para contar sesiones únicas por intervalo
    const visitasEnPeriodoData = await prisma.visita.findMany({
      where: {
        timestamp: { gte: periodoDesde, lte: periodoHasta },
      },
      select: { timestamp: true, sessionId: true },
      orderBy: { timestamp: 'asc' },
    });

    const diasEnPeriodo = Math.ceil((periodoHasta.getTime() - periodoDesde.getTime()) / (1000 * 60 * 60 * 24));
    const graficaMap = new Map<string, number>();
    // Rastrear sesiones ya contadas por bucket para evitar duplicados en la gráfica
    const sesionesContadasPorBucket = new Map<string, Set<string>>();

    function contarSesionEnBucket(bucket: string, sessionId: string) {
      if (!graficaMap.has(bucket)) return;
      if (!sesionesContadasPorBucket.has(bucket)) {
        sesionesContadasPorBucket.set(bucket, new Set());
      }
      const set = sesionesContadasPorBucket.get(bucket)!;
      if (!set.has(sessionId)) {
        set.add(sessionId);
        graficaMap.set(bucket, (graficaMap.get(bucket) || 0) + 1);
      }
    }

    if (!usandoPeriodoCustom) {
      // Gráfica 24h por hora (comportamiento por defecto)
      for (let i = 0; i < 24; i++) {
        const hora = new Date(ahora);
        hora.setHours(ahora.getHours() - (23 - i), 0, 0, 0);
        const horaStr = hora.toISOString().slice(0, 13);
        graficaMap.set(horaStr, 0);
      }
      visitasEnPeriodoData.forEach((visita: any) => {
        const horaStr = new Date(visita.timestamp).toISOString().slice(0, 13);
        contarSesionEnBucket(horaStr, visita.sessionId);
      });
    } else if (diasEnPeriodo < 2) {
      // Por hora
      const horaInicio = new Date(periodoDesde);
      horaInicio.setMinutes(0, 0, 0);
      for (let i = 0; i <= diasEnPeriodo * 24; i++) {
        const hora = new Date(horaInicio);
        hora.setHours(hora.getHours() + i);
        const horaStr = hora.toISOString().substring(0, 13);
        graficaMap.set(horaStr, 0);
      }
      visitasEnPeriodoData.forEach((visita: any) => {
        const horaStr = new Date(visita.timestamp).toISOString().substring(0, 13);
        contarSesionEnBucket(horaStr, visita.sessionId);
      });
    } else if (diasEnPeriodo < 90) {
      // Por día
      for (let i = 0; i <= diasEnPeriodo; i++) {
        const fecha = new Date(periodoDesde);
        fecha.setDate(fecha.getDate() + i);
        const fechaStr = fecha.toISOString().split('T')[0];
        graficaMap.set(fechaStr, 0);
      }
      visitasEnPeriodoData.forEach((visita: any) => {
        const fechaStr = new Date(visita.timestamp).toISOString().split('T')[0];
        contarSesionEnBucket(fechaStr, visita.sessionId);
      });
    } else {
      // Por semana
      const inicioSemana = new Date(periodoDesde);
      inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
      inicioSemana.setHours(0, 0, 0, 0);
      for (let i = 0; i * 7 <= diasEnPeriodo; i++) {
        const semana = new Date(inicioSemana);
        semana.setDate(semana.getDate() + i * 7);
        const semanaStr = semana.toISOString().split('T')[0];
        graficaMap.set(semanaStr, 0);
      }
      visitasEnPeriodoData.forEach((visita: any) => {
        const fecha = new Date(visita.timestamp);
        const inicioSemanaVenta = new Date(fecha);
        inicioSemanaVenta.setDate(inicioSemanaVenta.getDate() - inicioSemanaVenta.getDay());
        inicioSemanaVenta.setHours(0, 0, 0, 0);
        const semanaStr = inicioSemanaVenta.toISOString().split('T')[0];
        contarSesionEnBucket(semanaStr, visita.sessionId);
      });
    }

    // Determinar tipo de agrupación para que el widget sepa cómo etiquetar
    const tipoGrafica: 'hora' | 'dia' | 'semana' = (!usandoPeriodoCustom || diasEnPeriodo < 2)
      ? 'hora'
      : diasEnPeriodo < 90
        ? 'dia'
        : 'semana';

    const grafica24h = Array.from(graficaMap.entries()).map(([clave, visitas]) => {
      let etiqueta: string;
      if (tipoGrafica === 'hora') {
        etiqueta = new Date(clave + ':00:00').toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      } else {
        // día o semana: mostrar "DD/MM"
        const [, mes, dia] = clave.split('-');
        etiqueta = `${dia}/${mes}`;
      }
      return { hora: etiqueta, visitas };
    });

    // Top 10 páginas en el período
    const topPaginas = await prisma.visita.groupBy({
      by: ['url'],
      _count: { id: true },
      where: { timestamp: { gte: periodoDesde, lte: periodoHasta } },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Fuentes de tráfico: una sesión cuenta solo por su primera fuente detectada
    const fuentesRaw = await prisma.visita.findMany({
      where: { timestamp: { gte: periodoDesde, lte: periodoHasta } },
      select: { sessionId: true, fuente: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    });
    // Primera fuente de cada sesión
    const fuentePorSesion = new Map<string, string>();
    fuentesRaw.forEach((v: any) => {
      if (!fuentePorSesion.has(v.sessionId)) {
        fuentePorSesion.set(v.sessionId, v.fuente || 'directo');
      }
    });
    const fuenteConteo = new Map<string, number>();
    fuentePorSesion.forEach((fuente) => {
      fuenteConteo.set(fuente, (fuenteConteo.get(fuente) || 0) + 1);
    });
    const fuentes = Array.from(fuenteConteo.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([fuente, cantidad]) => ({ fuente, cantidad }));

    // Dispositivos en el período
    const dispositivos = await prisma.visita.groupBy({
      by: ['dispositivo'],
      _count: { id: true },
      where: { timestamp: { gte: periodoDesde, lte: periodoHasta } },
      orderBy: { _count: { id: 'desc' } },
    });

    return NextResponse.json({
      visitantesOnline: visitantesOnline.length,
      visitasHoy: visitasEnPeriodo,
      visitasAyer: visitasAyer || undefined,
      porcentajeCambio: porcentajeCambio || undefined,
      tipoGrafica,
      grafica24h,
      topPaginas: topPaginas.map((p: any) => ({
        url: p.url,
        visitas: p._count.id,
      })),
      fuentes,
      dispositivos: dispositivos.map((d: any) => ({
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
