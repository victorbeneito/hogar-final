import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ABANDONED_MINUTES = 30;

function mapCarrito(carrito: any) {
  const items = carrito.carritoitem || [];
  const totalItems = items.reduce((sum: number, item: any) => sum + Number(item.cantidad || 0), 0);
  const total = Number(carrito.total ?? 0);
  const lastActivity = carrito.updatedAt ? new Date(carrito.updatedAt) : new Date(carrito.createdAt);
  const abandonedAt = carrito.pedido
    ? null
    : new Date(lastActivity.getTime() + ABANDONED_MINUTES * 60 * 1000);
  const estado = carrito.pedido
    ? "convertido"
    : Date.now() - lastActivity.getTime() > ABANDONED_MINUTES * 60 * 1000
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
    total,
    totalItems,
    estado,
    createdAt: carrito.createdAt?.toISOString?.() ?? null,
    updatedAt: carrito.updatedAt?.toISOString?.() ?? null,
    abandonedAt: abandonedAt ? abandonedAt.toISOString() : null,
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const estado = searchParams.get("estado")?.trim() || "";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const whereClause: any = {};
    if (q) {
      whereClause.OR = [
        { sessionId: { contains: q } },
        { cliente: { is: { nombre: { contains: q } } } },
        { cliente: { is: { apellidos: { contains: q } } } },
        { cliente: { is: { email: { contains: q } } } },
      ];
    }

    const clienteIds = q
      ? (await prisma.cliente.findMany({
          where: {
            OR: [
              { nombre: { contains: q } },
              { apellidos: { contains: q } },
              { email: { contains: q } },
            ],
          },
          select: { id: true },
        })).map((cliente) => cliente.id)
      : [];

    const carts = await prisma.carritocompra.findMany({
      where: {
        ...(whereClause.OR ? { OR: [{ sessionId: { contains: q } }, { clienteId: { in: clienteIds } }] } : {}),
      },
      include: {
        carritoitem: true,
      },
      orderBy: { updatedAt: sortDir },
    });

    const cartsWithRelations = await Promise.all(
      carts.map(async (cart) => {
        const [cliente, pedido] = await Promise.all([
          cart.clienteId
            ? prisma.cliente.findUnique({
                where: { id: cart.clienteId },
                select: {
                  id: true,
                  nombre: true,
                  apellidos: true,
                  email: true,
                  telefono: true,
                },
              })
            : Promise.resolve(null),
          prisma.pedido.findFirst({
            where: { carritoId: cart.id },
            select: {
              id: true,
              numeroPedido: true,
              estado: true,
              totalFinal: true,
            },
          }),
        ]);

        return { ...cart, cliente, pedido };
      })
    );

    const mapped = cartsWithRelations.map(mapCarrito);
    const filtered = estado
      ? mapped.filter((cart) => cart.estado === estado)
      : mapped;

    return NextResponse.json({ ok: true, carritos: filtered });
  } catch (error: any) {
    console.error("Error GET carritos:", error);
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Falta sessionId" }, { status: 400 });
    }

    const items = Array.isArray(body.items) ? body.items : [];
    const total = Number(body.total ?? 0);
    const clienteId = body.clienteId ? Number(body.clienteId) : null;

    const carrito = await prisma.carritocompra.upsert({
      where: { sessionId },
      update: {
        clienteId: clienteId || undefined,
        total,
        updatedAt: new Date(),
      },
      create: {
        sessionId,
        clienteId,
        total,
        updatedAt: new Date(),
      },
    });

    await prisma.carritoitem.deleteMany({ where: { carritoId: carrito.id } });

    if (items.length > 0) {
      await prisma.carritoitem.createMany({
        data: items.map((item: any) => ({
          carritoId: carrito.id,
          productoId: Number(item.id),
          varianteId: item.varianteId ? Number(item.varianteId) : null,
          nombre: String(item.nombre ?? ""),
          precio: Number(item.precioFinal ?? item.precio ?? 0),
          cantidad: Number(item.cantidad ?? 1),
          imagen: item.imagen || null,
        })),
      });
    }

    const carritoCompleto = await prisma.carritocompra.findUnique({
      where: { id: carrito.id },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            telefono: true,
          },
        },
        pedido: {
          select: {
            id: true,
            numeroPedido: true,
            estado: true,
            totalFinal: true,
          },
        },
        carritoitem: true,
      },
    });

    return NextResponse.json({ ok: true, carrito: mapCarrito(carritoCompleto) });
  } catch (error: any) {
    console.error("Error POST carritos:", error);
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}
