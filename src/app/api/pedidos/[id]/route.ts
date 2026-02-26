import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: DETALLE DEL PEDIDO
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    if (isNaN(id)) {
        return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const pedidoRaw = await prisma.pedido.findUnique({
      where: { id },
      include: {
        PedidoProducto: true, 
        Cliente: true         
      }
    });

    if (!pedidoRaw) {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }

    // 🔄 MAPEO "A PRUEBA DE FALLOS"
    const pedido = {
        ...pedidoRaw,
        
        // Asegurar números
        totalFinal: Number(pedidoRaw.totalFinal),
        subtotal: Number(pedidoRaw.subtotal),
        envioCoste: Number(pedidoRaw.envioCoste),

        // 1. Campo directo (Standard)
        pagoMetodo: pedidoRaw.pagoMetodo, 
        
        // 2. Campo alternativo (Por si el frontend usa camelCase inverso)
        metodoPago: pedidoRaw.pagoMetodo,

        // 3. Objeto anidado (Lo que usaba el Admin)
        pago: {
            metodo: pedidoRaw.pagoMetodo, 
            nombre: pedidoRaw.pagoMetodo, // Por si busca .nombre
            tipo: pedidoRaw.pagoMetodo,   // Por si busca .tipo
            total: Number(pedidoRaw.totalFinal),
            estado: pedidoRaw.estado
        },
        
        // Cliente y Productos
        cliente: pedidoRaw.Cliente,
        productos: pedidoRaw.PedidoProducto.map((pp: any) => ({
            productoId: pp.productoId,
            nombre: pp.nombre || pp.nombreProducto || "Producto",
            cantidad: pp.cantidad,
            precioUnitario: Number(pp.precioUnitario),
            subtotal: Number(pp.subtotal)
        }))
    };

    return NextResponse.json({ ok: true, pedido });
  } catch (error: any) {
    console.error("Error GET pedido:", error);
    return NextResponse.json({ ok: false, error: "Error de servidor", detalle: error.message }, { status: 500 });
  }
}

// PUT: ACTUALIZAR ESTADO
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    const data = await req.json();

    const pedido = await prisma.pedido.update({
      where: { id },
      data: {
         estado: data.estado 
      }
    });

    return NextResponse.json({ ok: true, pedido });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "Error de servidor" }, { status: 500 });
  }
}

// DELETE: BORRAR PEDIDO
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    await prisma.pedidoProducto.deleteMany({
        where: { pedidoId: id }
    });

    await prisma.pedido.delete({
        where: { id }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "Error de servidor" }, { status: 500 });
  }
}

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// interface RouteParams {
//   params: Promise<{ id: string }>;
// }

// export async function GET(req: NextRequest, { params }: RouteParams) {
//   try {
//     const { id: idString } = await params;
//     const id = parseInt(idString);

//     if (isNaN(id)) {
//         return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
//     }

//     const pedido = await prisma.pedido.findUnique({
//       where: { id },
//       include: {
//         PedidoProducto: true, 
//         Cliente: true
//       }
//     });

//     if (!pedido) {
//       return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
//     }

//     return NextResponse.json({ ok: true, pedido });
//   } catch (error: any) {
//     return NextResponse.json({ ok: false, error: "Error de servidor" }, { status: 500 });
//   }
// }

// export async function PUT(req: NextRequest, { params }: RouteParams) {
//   try {
//     const { id: idString } = await params;
//     const id = parseInt(idString);
//     const data = await req.json();

//     const pedido = await prisma.pedido.update({
//       where: { id },
//       data: {
//          estado: data.estado 
//       }
//     });

//     return NextResponse.json({ ok: true, pedido });
//   } catch (error: any) {
//     return NextResponse.json({ ok: false, error: "Error de servidor" }, { status: 500 });
//   }
// }