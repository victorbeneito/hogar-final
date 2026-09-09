import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Datos mínimos de un pedido para medir la compra en GA4 / Google Ads.
 *
 * La página de confirmación no puede componer el evento `purchase` por su cuenta: para
 * cuando el cliente llega ahí el carrito ya está vaciado, y en los pagos con pasarela
 * (Redsys, PayPal) además se ha salido y vuelto a la web, así que en el navegador no
 * queda ni el importe final ni las líneas del pedido. Por eso se leen del servidor,
 * que es de donde salen los totales de verdad (con envío, recargo y cupón aplicados).
 *
 * Devuelve SÓLO lo que necesita la analítica: importes, cupón y productos. Nada de
 * nombre, email, dirección ni teléfono, aunque el pedido los tenga: este endpoint es
 * público por narices (lo llama el navegador del cliente, que puede ser un invitado
 * sin sesión) y no hay motivo para que exponga datos personales.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idTexto } = await params;
    const id = parseInt(idTexto, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: {
        id: true,
        numeroPedido: true,
        totalFinal: true,
        envioCoste: true,
        cuponCodigo: true,
        pedidoproducto: {
          select: {
            productoIdRef: true,
            nombre: true,
            varianteInfo: true,
            cantidad: true,
            precioUnitario: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!pedido) {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      compra: {
        // El número de pedido (PED-2026-0001) es el identificador que ve el cliente y
        // el que aparece en el panel, así que es el que hay que poder cruzar con las
        // conversiones de Ads. Si por lo que sea faltara, se cae al id interno.
        transaction_id: String(pedido.numeroPedido || pedido.id),
        value: Number(pedido.totalFinal ?? 0),
        shipping: Number(pedido.envioCoste ?? 0),
        ...(pedido.cuponCodigo ? { coupon: pedido.cuponCodigo } : {}),
        items: pedido.pedidoproducto.map((linea, index) => ({
          // Mismo item_id que en view_item y add_to_cart: el id del producto.
          item_id: String(linea.productoIdRef ?? ""),
          item_name: linea.nombre,
          price: Number(linea.precioUnitario ?? 0),
          quantity: Number(linea.cantidad ?? 1),
          ...(linea.varianteInfo ? { item_variant: linea.varianteInfo } : {}),
          index,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error GET pedido analytics:", error);
    return NextResponse.json({ ok: false, error: "Error de servidor" }, { status: 500 });
  }
}
