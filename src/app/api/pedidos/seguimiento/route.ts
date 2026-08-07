import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Seguimiento público de un pedido para quien compró como invitado.
 * Requiere referencia + email exactos, y devuelve sólo datos del pedido
 * (nunca datos de la cuenta).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = (searchParams.get("ref") || "").trim();
    const email = (searchParams.get("email") || "").trim().toLowerCase();

    if (!ref || !email) {
      return NextResponse.json({ ok: false, error: "Faltan la referencia y el email del pedido" }, { status: 400 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { numeroPedido: ref },
      select: {
        numeroPedido: true,
        email: true,
        nombre: true,
        apellidos: true,
        estado: true,
        estadoPago: true,
        fechaPedido: true,
        fechaEnvio: true,
        fechaEntrega: true,
        envioMetodo: true,
        envioCoste: true,
        transportistaNombre: true,
        numeroSeguimiento: true,
        trackingUrl: true,
        pagoMetodo: true,
        subtotal: true,
        descuento: true,
        totalFinal: true,
        direccion: true,
        direccionComplementaria: true,
        cp: true,
        ciudad: true,
        provincia: true,
        pais: true,
        pedidoproducto: {
          select: { nombre: true, varianteInfo: true, cantidad: true, precioUnitario: true, subtotal: true },
        },
      },
    });

    // Mismo mensaje si no existe o si el email no coincide: no filtramos referencias válidas
    if (!pedido || (pedido.email || "").toLowerCase() !== email) {
      return NextResponse.json(
        { ok: false, error: "No encontramos ningún pedido con esa referencia y ese email" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, pedido });
  } catch (error: any) {
    console.error("❌ Error en seguimiento de pedido:", error?.message);
    return NextResponse.json({ ok: false, error: "No se pudo consultar el pedido" }, { status: 500 });
  }
}
