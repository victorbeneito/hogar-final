import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function mapCarrito(carrito: any) {
  const items = carrito.carritoitem || [];
  const totalItems = items.reduce((sum: number, item: any) => sum + Number(item.cantidad || 0), 0);
  const lastActivity = carrito.updatedAt ? new Date(carrito.updatedAt) : new Date(carrito.createdAt);
  const estado = carrito.pedido
    ? "convertido"
    : Date.now() - lastActivity.getTime() > 30 * 60 * 1000
      ? "abandonado"
      : "activo";

  return {
    id: carrito.id,
    sessionId: carrito.sessionId || "",
    clienteId: carrito.clienteId,
    cliente: carrito.cliente
      ? {
          id: carrito.cliente.id,
          nombre: `${carrito.cliente.nombre || ""} ${carrito.cliente.apellidos || ""}`.trim(),
          email: carrito.cliente.email,
          telefono: carrito.cliente.telefono || "",
        }
      : null,
    total: Number(carrito.total ?? 0),
    totalItems,
    estado,
    createdAt: carrito.createdAt?.toISOString?.() ?? null,
    updatedAt: carrito.updatedAt?.toISOString?.() ?? null,
    pedido: carrito.pedido
      ? {
          id: carrito.pedido.id,
          numeroPedido: carrito.pedido.numeroPedido,
          estado: carrito.pedido.estado,
          totalFinal: Number(carrito.pedido.totalFinal ?? 0),
        }
      : null,
    items: items.map((item: any) => ({
      id: item.id,
      productoId: item.productoId,
      varianteId: item.varianteId,
      nombre: item.nombre,
      precio: Number(item.precio ?? 0),
      cantidad: Number(item.cantidad ?? 0),
      imagen: item.imagen || null,
    })),
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const carrito = await prisma.carritocompra.findUnique({
      where: { id },
      include: {
        carritoitem: true,
      },
    });

    if (!carrito) {
      return NextResponse.json({ ok: false, error: "Carrito no encontrado" }, { status: 404 });
    }

    const [cliente, pedido] = await Promise.all([
      carrito.clienteId
        ? prisma.cliente.findUnique({
            where: { id: carrito.clienteId },
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              email: true,
              telefono: true,
              empresa: true,
              nif: true,
              direccion: true,
              direccionComplementaria: true,
              codigoPostal: true,
              ciudad: true,
              provincia: true,
              pais: true,
            },
          })
        : Promise.resolve(null),
      prisma.pedido.findFirst({
        where: { carritoId: carrito.id },
        select: {
          id: true,
          numeroPedido: true,
          estado: true,
          estadoPago: true,
          totalFinal: true,
          fechaPedido: true,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, carrito: mapCarrito({ ...carrito, cliente, pedido }) });
  } catch (error: any) {
    console.error("Error GET carrito:", error);
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    await prisma.carritocompra.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error DELETE carrito:", error);
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}
