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

        // Comprobamos roles (acepta admin, superadmin, auditor - con cualquier capitalización)
        const rolUpper = decodedAdmin.rol?.toUpperCase() ?? "";
        if (["ADMIN", "SUPERADMIN", "AUDITOR"].includes(rolUpper)) esAdmin = true;
    } catch (e) {}

    if (!esAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Calcular fechas
    const ahora = new Date();
    const hace30dias = new Date(ahora);
    hace30dias.setDate(hace30dias.getDate() - 30);
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
      ventasUltimos30dias,
      pedidosPorEstado,
      ultimosPedidos,
      ultimosClientes,
      mensajesCliente,
      pedidosUltimos7dias,
    ] = await Promise.all([
      prisma.producto.count(),
      prisma.categoria.count(),
      prisma.marca.count(),
      prisma.pedido.count(),
      prisma.cliente.count(),
      prisma.cupon.count(),
      // Suma total de ventas
      prisma.pedido.aggregate({ _sum: { totalFinal: true } }),
      // Ventas últimos 30 días agrupadas por día
      prisma.pedido.findMany({
        where: { fechaPedido: { gte: hace30dias } },
        select: { fechaPedido: true, totalFinal: true },
        orderBy: { fechaPedido: 'asc' },
      }),
      // Pedidos por estado (top 6)
      prisma.pedido.groupBy({
        by: ['estado'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 6,
      }),
      // Últimos 10 pedidos
      prisma.pedido.findMany({
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
      // Últimos 5 clientes
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
      // Últimos 10 mensajes de clientes
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
      // Pedidos últimos 7 días (para gráfica secundaria)
      prisma.pedido.aggregate({
        where: { fechaPedido: { gte: hace7dias } },
        _sum: { totalFinal: true },
        _count: { id: true },
      }),
    ]);

    // Procesar datos para gráfica de ventas (últimos 30 días)
    const ventasMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const fecha = new Date(hace30dias);
      fecha.setDate(fecha.getDate() + i);
      const fechaStr = fecha.toISOString().split('T')[0];
      ventasMap.set(fechaStr, 0);
    }

    ventasUltimos30dias.forEach((venta) => {
      const fechaStr = new Date(venta.fechaPedido).toISOString().split('T')[0];
      if (ventasMap.has(fechaStr)) {
        ventasMap.set(fechaStr, (ventasMap.get(fechaStr) || 0) + venta.totalFinal);
      }
    });

    const graficaVentas = Array.from(ventasMap.entries()).map(([fecha, total]) => ({
      fecha,
      total: Math.round(total * 100) / 100,
    }));

    const ventasTotales = Math.round((ventasTotalesAgg._sum.totalFinal || 0) * 100) / 100;
    const ventasMes = Math.round(
      ventasUltimos30dias.reduce((sum, v) => sum + v.totalFinal, 0) * 100
    ) / 100;
    const ventasSemana = Math.round((pedidosUltimos7dias._sum.totalFinal || 0) * 100) / 100;
    const pedidosSemana = pedidosUltimos7dias._count.id || 0;

    return NextResponse.json({
      // Conteos
      productos,
      categorias,
      marcas,
      pedidos,
      clientes,
      cupones,
      // Ventas
      ventasTotales,
      ventasMes,
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
