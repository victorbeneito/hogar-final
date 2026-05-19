import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import { getInvoiceSettings } from "@/lib/invoiceGenerator";
import { InvoicePdf, type InvoiceData } from "@/lib/invoicePdf";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const facturaId = parseInt(id, 10);
    if (isNaN(facturaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const factura = await prisma.factura.findUnique({
      where: { id: facturaId },
      include: {
        pedido: {
          include: {
            pedidoproducto: {
              include: {
                producto: { select: { referencia: true } },
                variante: { select: { referencia: true } },
              },
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });

    if (!factura) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    const pedido = factura.pedido;
    const settings = await getInvoiceSettings();

    // Build billing address (prefer facturacion fields, fall back to main address)
    const factNombre = [
      pedido.facturacionEmpresa,
      [pedido.facturacionNombre, pedido.facturacionApellidos].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join("\n") ||
      [pedido.nombre, pedido.apellidos].filter(Boolean).join(" ");

    const entregaNombre = [pedido.nombre, pedido.apellidos].filter(Boolean).join(" ");

    const data: InvoiceData = {
      numeroFactura: factura.numeroFactura,
      fechaFactura: factura.fechaFactura,
      numeroPedido: pedido.numeroPedido,
      fechaPedido: pedido.fechaPedido,
      // Delivery
      entregaNombre,
      entregaNif: pedido.nif,
      entregaDireccion: pedido.direccion,
      entregaCiudad: pedido.ciudad,
      entregaCp: pedido.cp,
      entregaProvincia: pedido.provincia,
      entregaPais: pedido.pais,
      entregaTelefono: pedido.telefono,
      // Billing
      factNombre,
      factNif: pedido.facturacionNif || pedido.nif,
      factDireccion: pedido.facturacionDireccion || pedido.direccion,
      factCiudad: pedido.facturacionCiudad || pedido.ciudad,
      factCp: pedido.facturacionCodigoPostal || pedido.cp,
      factProvincia: pedido.facturacionProvincia || pedido.provincia,
      factPais: pedido.facturacionPais || pedido.pais,
      factTelefono: pedido.facturacionTelefono || pedido.telefono,
      // Financials
      baseImponible: Number(factura.baseImponible),
      porcentajeIva: Number(factura.porcentajeIva),
      totalIva: Number(factura.totalIva),
      total: Number(factura.total),
      subtotalProductos: Number(pedido.subtotal),
      envioCoste: Number(pedido.envioCoste),
      descuento: Number(pedido.descuento),
      // Payment
      pagoMetodo: pedido.pagoMetodo,
      transportista: pedido.transportistaNombre,
      // Products
      productos: pedido.pedidoproducto.map((p) => ({
        referencia: p.variante?.referencia || p.producto?.referencia,
        nombre: p.nombre,
        varianteInfo: p.varianteInfo,
        cantidad: p.cantidad,
        precioUnitario: Number(p.precioUnitario),
        subtotal: Number(p.subtotal),
      })),
    };

    const buffer = await renderToBuffer(createElement(InvoicePdf, { data, settings }));

    const filename = `${factura.numeroFactura.replace(/\//g, "-")}.pdf`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[PDF] Error generando factura:", error);
    return NextResponse.json({ error: error.message || "Error generando PDF" }, { status: 500 });
  }
}
