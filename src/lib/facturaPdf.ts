import { prisma } from "./prisma";
import { getInvoiceSettings } from "./invoiceGenerator";
import { spawn } from "child_process";

/**
 * Render del PDF de factura. Vivía dentro de la ruta /api/facturas/[id]/pdf;
 * está aquí porque también se adjunta a los correos de cambio de estado cuando
 * el estado tiene marcado "Adjuntar factura PDF al correo".
 */

function runPdfWorker(payload: object): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // eval makes the path fully opaque to Turbopack's static analyzer (process.cwd resolves to /ROOT/ at build time)
    // eslint-disable-next-line no-eval
    const workerPath: string = (0, eval)('require("path").join(process.cwd(), "scripts", "pdf-worker.cjs")');
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

export type FacturaPdf = { buffer: Buffer; filename: string };

/** Devuelve null si la factura no existe. */
export async function renderFacturaPdf(facturaId: number): Promise<FacturaPdf | null> {
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

  if (!factura) return null;

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

  return {
    buffer: await runPdfWorker(payload),
    filename: `${factura.numeroFactura.replace(/\//g, "-")}.pdf`,
  };
}

/** El PDF de la factura de un pedido, si la tiene. */
export async function renderFacturaPdfDePedido(pedidoId: number): Promise<FacturaPdf | null> {
  const factura = await prisma.factura.findUnique({
    where: { pedidoId },
    select: { id: true },
  });
  if (!factura) return null;
  return renderFacturaPdf(factura.id);
}
