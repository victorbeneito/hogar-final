import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInvoiceSettings } from "@/lib/invoiceGenerator";
import { spawn } from "child_process";
import path from "path";
import type { BodyInit } from "undici";

export const dynamic = "force-dynamic";

function runPdfWorkerBatch(invoices: any[], settings: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(process.cwd(), "scripts", "pdf-worker-batch.cjs");
    const child = spawn("node", [workerPath], { stdio: ["pipe", "pipe", "pipe"] });

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errChunks.push(chunk));

    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        const msg = Buffer.concat(errChunks).toString("utf8");
        reject(new Error(msg || `pdf-worker-batch exited with code ${code}`));
      }
    });

    child.on("error", reject);

    child.stdin.write(JSON.stringify({ invoices, settings }));
    child.stdin.end();
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const origen = searchParams.get("origen")?.trim();
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const prestashopPrefix = "PS-";

    const where: Record<string, unknown> = {};

    if (fechaDesde || fechaHasta) {
      const fechaFilter: Record<string, Date> = {};
      if (fechaDesde) {
        const d = new Date(fechaDesde);
        if (!isNaN(d.getTime())) fechaFilter.gte = d;
      }
      if (fechaHasta) {
        const h = new Date(fechaHasta);
        if (!isNaN(h.getTime())) {
          h.setHours(23, 59, 59, 999);
          fechaFilter.lte = h;
        }
      }
      if (Object.keys(fechaFilter).length) where.fechaFactura = fechaFilter;
    }

    const andConditions: Record<string, unknown>[] = [];
    if (origen === "prestashop") {
      andConditions.push({ numeroFactura: { startsWith: prestashopPrefix } });
    } else if (origen === "actuales") {
      andConditions.push({ NOT: { numeroFactura: { startsWith: prestashopPrefix } } });
    }
    if (andConditions.length) where.AND = andConditions;

    const facturas = await prisma.factura.findMany({
      where,
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
      orderBy: { fechaFactura: "asc" },
    });

    if (facturas.length === 0) {
      return NextResponse.json({ error: "No hay facturas para los filtros seleccionados" }, { status: 404 });
    }

    const settings = await getInvoiceSettings();

    const invoices = facturas.map((factura) => {
      const pedido = factura.pedido;
      const factNombre =
        [
          pedido.facturacionEmpresa,
          [pedido.facturacionNombre, pedido.facturacionApellidos].filter(Boolean).join(" "),
        ]
          .filter(Boolean)
          .join("\n") || [pedido.nombre, pedido.apellidos].filter(Boolean).join(" ");

      return {
        numeroFactura: factura.numeroFactura,
        fechaFactura: factura.fechaFactura,
        numeroPedido: pedido.numeroPedido,
        fechaPedido: pedido.fechaPedido,
        entregaNombre: [pedido.nombre, pedido.apellidos].filter(Boolean).join(" "),
        entregaNif: pedido.nif,
        entregaDireccion: pedido.direccion,
        entregaCiudad: pedido.ciudad,
        entregaCp: pedido.cp,
        entregaProvincia: pedido.provincia,
        entregaPais: pedido.pais,
        entregaTelefono: pedido.telefono,
        factNombre,
        factNif: pedido.facturacionNif || pedido.nif,
        factDireccion: pedido.facturacionDireccion || pedido.direccion,
        factCiudad: pedido.facturacionCiudad || pedido.ciudad,
        factCp: pedido.facturacionCodigoPostal || pedido.cp,
        factProvincia: pedido.facturacionProvincia || pedido.provincia,
        factPais: pedido.facturacionPais || pedido.pais,
        factTelefono: pedido.facturacionTelefono || pedido.telefono,
        baseImponible: Number(factura.baseImponible),
        porcentajeIva: Number(factura.porcentajeIva),
        totalIva: Number(factura.totalIva),
        total: Number(factura.total),
        subtotalProductos: Number(pedido.subtotal),
        envioCoste: Number(pedido.envioCoste),
        descuento: Number(pedido.descuento),
        pagoMetodo: pedido.pagoMetodo,
        transportista: pedido.transportistaNombre,
        productos: pedido.pedidoproducto.map((p) => ({
          referencia: p.variante?.referencia || p.producto?.referencia,
          nombre: p.nombre,
          varianteInfo: p.varianteInfo,
          cantidad: p.cantidad,
          precioUnitario: Number(p.precioUnitario),
          subtotal: Number(p.subtotal),
        })),
      };
    });

    const buffer = await runPdfWorkerBatch(invoices, settings);

    const parts: string[] = [];
    if (fechaDesde) parts.push(fechaDesde);
    if (fechaHasta) parts.push(fechaHasta);
    const rangePart = parts.length ? `_${parts.join("_")}` : "";
    const filename = `listado-facturas${rangePart}.pdf`;

    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Batch PDF] Error:", msg);
    return NextResponse.json({ error: msg || "Error generando listado PDF" }, { status: 500 });
  }
}
