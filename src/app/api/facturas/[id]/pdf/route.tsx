import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInvoiceSettings } from "@/lib/invoiceGenerator";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

function runPdfWorker(payload: object): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Buffer.from prevents Turbopack from statically resolving this as a module import
    const workerPath = path.join(process.cwd(), "scripts", `pdf-worker.${Buffer.from([99,106,115]).toString()}`);
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
        reject(new Error(msg || `pdf-worker exited with code ${code}`));
      }
    });

    child.on("error", reject);

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

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

    const factNombre =
      [
        pedido.facturacionEmpresa,
        [pedido.facturacionNombre, pedido.facturacionApellidos].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join("\n") || [pedido.nombre, pedido.apellidos].filter(Boolean).join(" ");

    const entregaNombre = [pedido.nombre, pedido.apellidos].filter(Boolean).join(" ");

    const payload = {
      data: {
        numeroFactura: factura.numeroFactura,
        fechaFactura: factura.fechaFactura,
        numeroPedido: pedido.numeroPedido,
        fechaPedido: pedido.fechaPedido,
        entregaNombre,
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
      },
      settings,
    };

    const buffer = await runPdfWorker(payload);

    const filename = `${factura.numeroFactura.replace(/\//g, "-")}.pdf`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PDF] Error generando factura:", msg);
    return NextResponse.json(
      { error: msg || "Error generando PDF" },
      { status: 500 }
    );
  }
}
