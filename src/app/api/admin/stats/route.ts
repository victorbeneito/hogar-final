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

        // Comprobamos roles (acepta admin, superadmin, support, auditor - con cualquier capitalización)
        const rolUpper = decodedAdmin.rol?.toUpperCase() ?? "";
        if (["ADMIN", "SUPERADMIN", "SUPPORT", "AUDITOR"].includes(rolUpper)) esAdmin = true;
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

    if (desdeParam && hastaParam) {
      // Usar período personalizado
      periodoDesde = new Date(desdeParam);
      periodoHasta = new Date(hastaParam);
      // Asegurar que hasta incluye el día completo
      periodoHasta.setHours(23, 59, 59, 999);
    } else {
      // Valores predeterminados (últimos 30 días)
      periodoHasta = new Date(ahora);
      periodoDesde = new Date(ahora);
      periodoDesde.setDate(periodoDesde.getDate() - 30);
    }

    const hace7dias = new Date(ahora);
    hace7dias.setDate(hace7dias.getDate() - 7);

    const [
      productos,
      categorias,
      marcas,
      pedidos,
      clientes,
      cupones,
      ventasTotalesAgg,
      ventasEnPeriodo,
      pedidosPorEstado,
      ultimosPedidos,
      ultimosClientes,
      mensajesCliente,
      pedidosPeriodo,
      clientesPeriodo,
    ] = await Promise.all([
      prisma.producto.count(),
      prisma.categoria.count(),
      prisma.marca.count(),
      // Pedidos en el período
      prisma.pedido.count({ where: { fechaPedido: { gte: periodoDesde, lte: periodoHasta } } }),
      // Clientes totales (global)
      prisma.cliente.count(),
      prisma.cupon.count(),
      // Suma total de ventas (sin período, para referencia)
      prisma.pedido.aggregate({ _sum: { totalFinal: true } }),
      // Ventas en el período seleccionado, agrupadas por día
      prisma.pedido.findMany({
        where: { fechaPedido: { gte: periodoDesde, lte: periodoHasta } },
        select: { fechaPedido: true, totalFinal: true },
        orderBy: { fechaPedido: 'asc' },
      }),
      // Pedidos por estado en el período (top 6)
      prisma.pedido.groupBy({
        by: ['estado'],
        _count: { id: true },
        where: { fechaPedido: { gte: periodoDesde, lte: periodoHasta } },
        orderBy: { _count: { id: 'desc' } },
        take: 6,
      }),
      // Últimos 10 pedidos en el período
      prisma.pedido.findMany({
        where: { fechaPedido: { gte: periodoDesde, lte: periodoHasta } },
        take: 10,
        orderBy: { fechaPedido: 'desc' },
        select: {
          id: true,
          numeroPedido: true,
          nombre: true,
          apellidos: true,
          estado: true,
          totalFinal: true,
          fechaPedido: true,
          pagoMetodo: true,
        },
      }),
      // Últimos 5 clientes (global, sin período)
      prisma.cliente.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          email: true,
          createdAt: true,
          activo: true,
        },
      }),
      // Últimos 10 mensajes de clientes (global, sin período)
      prisma.pedido_mensaje.findMany({
        where: { autor: 'cliente' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          pedido: {
            select: {
              id: true,
              numeroPedido: true,
              nombre: true,
              apellidos: true,
            },
          },
        },
      }),
      // Pedidos en el período (suma y conteo)
      prisma.pedido.aggregate({
        where: { fechaPedido: { gte: periodoDesde, lte: periodoHasta } },
        _sum: { totalFinal: true },
        _count: { id: true },
      }),
      // Clientes nuevos en el período
      prisma.cliente.count({
        where: { createdAt: { gte: periodoDesde, lte: periodoHasta } },
      }),
    ]);

    // Procesar datos para gráfica de ventas
    const diasEnPeriodo = Math.ceil((periodoHasta.getTime() - periodoDesde.getTime()) / (1000 * 60 * 60 * 24));
    const ventasMap = new Map<string, number>();

    // Determinar agrupación según período
    if (diasEnPeriodo < 2) {
      // Por hora
      const horaInicio = new Date(periodoDesde);
      horaInicio.setMinutes(0, 0, 0);
      for (let i = 0; i <= diasEnPeriodo * 24; i++) {
        const hora = new Date(horaInicio);
        hora.setHours(hora.getHours() + i);
        const horaStr = hora.toISOString().substring(0, 13);
        ventasMap.set(horaStr, 0);
      }
      ventasEnPeriodo.forEach((venta) => {
        const horaStr = new Date(venta.fechaPedido).toISOString().substring(0, 13);
        if (ventasMap.has(horaStr)) {
          ventasMap.set(horaStr, (ventasMap.get(horaStr) || 0) + venta.totalFinal);
        }
      });
    } else if (diasEnPeriodo < 90) {
      // Por día (por defecto)
      for (let i = 0; i <= diasEnPeriodo; i++) {
        const fecha = new Date(periodoDesde);
        fecha.setDate(fecha.getDate() + i);
        const fechaStr = fecha.toISOString().split('T')[0];
        ventasMap.set(fechaStr, 0);
      }
      ventasEnPeriodo.forEach((venta) => {
        const fechaStr = new Date(venta.fechaPedido).toISOString().split('T')[0];
        if (ventasMap.has(fechaStr)) {
          ventasMap.set(fechaStr, (ventasMap.get(fechaStr) || 0) + venta.totalFinal);
        }
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
        ventasMap.set(semanaStr, 0);
      }
      ventasEnPeriodo.forEach((venta) => {
        const fecha = new Date(venta.fechaPedido);
        const inicioSemanaVenta = new Date(fecha);
        inicioSemanaVenta.setDate(inicioSemanaVenta.getDate() - inicioSemanaVenta.getDay());
        inicioSemanaVenta.setHours(0, 0, 0, 0);
        const semanaStr = inicioSemanaVenta.toISOString().split('T')[0];
        if (ventasMap.has(semanaStr)) {
          ventasMap.set(semanaStr, (ventasMap.get(semanaStr) || 0) + venta.totalFinal);
        }
      });
    }

    const graficaVentas = Array.from(ventasMap.entries()).map(([fecha, total]) => ({
      fecha,
      total: Math.round(total * 100) / 100,
    }));

    const ventasTotales = Math.round((ventasTotalesAgg._sum.totalFinal || 0) * 100) / 100;
    const ventasEnPeriodoTotal = Math.round(
      ventasEnPeriodo.reduce((sum, v) => sum + v.totalFinal, 0) * 100
    ) / 100;
    const ventasSemana = Math.round((pedidosPeriodo._sum.totalFinal || 0) * 100) / 100;
    const pedidosSemana = pedidosPeriodo._count.id || 0;

    return NextResponse.json({
      // Conteos (globales, siempre)
      productos,
      categorias,
      marcas,
      clientes,
      cupones,
      // Conteos del período
      pedidos,           // ya filtrado por período en la query
      clientesPeriodo,   // clientes nuevos en el período
      // Ventas
      ventasTotales,                       // histórico total (referencia)
      ventasMes: ventasEnPeriodoTotal,     // ventas del período seleccionado
      ventasSemana,
      pedidosSemana,
      // Listados
      ultimosPedidos,
      ultimosClientes,
      mensajesPendientes: mensajesCliente,
      // Gráficas
      pedidosPorEstado,
      graficaVentas,
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return new NextResponse(
      JSON.stringify({ error: "Error al obtener estadísticas" }),
      { status: 500 }
    );
  }
}
