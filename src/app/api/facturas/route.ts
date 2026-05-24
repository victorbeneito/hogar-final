import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const numero = searchParams.get("numero")?.trim();
    const cliente = searchParams.get("cliente")?.trim();
    const origen = searchParams.get("origen")?.trim();
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const sortBy = searchParams.get("sortBy") || "fechaFactura";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
    const prestashopPrefix = "PS-";

    const where: any = {};
    if (numero) {
      where.numeroFactura = { contains: numero };
    }

    if (cliente) {
      where.OR = [
        { pedido: { nombre: { contains: cliente } } },
        { pedido: { apellidos: { contains: cliente } } },
        { pedido: { email: { contains: cliente } } },
        { numeroFactura: { contains: cliente } },
      ];
    }

    if (fechaDesde || fechaHasta) {
      where.fechaFactura = {};
      if (fechaDesde) where.fechaFactura.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaFactura.lte = new Date(fechaHasta);
    }

    const appendAndFilter = (condition: any) => {
      where.AND = [...(where.AND || []), condition];
    };

    if (origen === "prestashop") {
      appendAndFilter({ numeroFactura: { startsWith: prestashopPrefix } });
    } else if (origen === "actuales") {
      appendAndFilter({ NOT: { numeroFactura: { startsWith: prestashopPrefix } } });
    }

    const orderMap: Record<string, any> = {
      id: { id: sortDir },
      numeroFactura: { numeroFactura: sortDir },
      fechaFactura: { fechaFactura: sortDir },
      total: { total: sortDir },
      nombre: { pedido: { nombre: sortDir } },
    };

    const facturas = await prisma.factura.findMany({
      where,
      include: {
        pedido: {
          select: {
            id: true,
            numeroPedido: true,
            nombre: true,
            apellidos: true,
            email: true,
            totalFinal: true,
            estado: true,
            fechaPedido: true,
          },
        },
      },
      orderBy: orderMap[sortBy] || { fechaFactura: "desc" },
    });

    return NextResponse.json({
      ok: true,
      facturas: facturas.map((factura) => ({
        id: factura.id,
        numeroFactura: factura.numeroFactura,
        fechaFactura: factura.fechaFactura.toISOString(),
        total: Number(factura.total ?? 0),
        baseImponible: Number(factura.baseImponible ?? 0),
        totalIva: Number(factura.totalIva ?? 0),
        porcentajeIva: Number(factura.porcentajeIva ?? 0),
        pdfUrl: factura.pdf_url,
        pedido: factura.pedido,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}
