import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function toAddress(source: any, prefix: string) {
  return {
    nombre: source[`${prefix}Nombre`] ?? source.nombre ?? "",
    apellidos: source[`${prefix}Apellidos`] ?? source.apellidos ?? "",
    empresa: source[`${prefix}Empresa`] ?? source.empresa ?? "",
    nif: source[`${prefix}Nif`] ?? source.nif ?? "",
    telefono: source[`${prefix}Telefono`] ?? source.telefono ?? "",
    direccion: source[`${prefix}Direccion`] ?? source.direccion ?? "",
    direccionComplementaria: source[`${prefix}DireccionComplementaria`] ?? source.direccionComplementaria ?? "",
    codigoPostal: source[`${prefix}CodigoPostal`] ?? source.cp ?? source.codigoPostal ?? "",
    ciudad: source[`${prefix}Ciudad`] ?? source.ciudad ?? "",
    provincia: source[`${prefix}Provincia`] ?? source.provincia ?? "",
    pais: source[`${prefix}Pais`] ?? source.pais ?? "España",
  };
}

function mapPedido(pedidoRaw: any) {
  return {
    id: pedidoRaw.id,
    referencia: pedidoRaw.referencia || pedidoRaw.numeroPedido,
    numeroPedido: pedidoRaw.numeroPedido,
    clienteId: pedidoRaw.clienteId,
    nombre: `${pedidoRaw.nombre || pedidoRaw.Cliente?.nombre || ""} ${pedidoRaw.apellidos || pedidoRaw.Cliente?.apellidos || ""}`.trim(),
    apellidos: pedidoRaw.apellidos || pedidoRaw.Cliente?.apellidos || "",
    email: pedidoRaw.email,
    telefono: pedidoRaw.telefono || "",
    nif: pedidoRaw.nif || "",
    direccion: pedidoRaw.direccion || "",
    direccionComplementaria: pedidoRaw.direccionComplementaria || "",
    ciudad: pedidoRaw.ciudad || "",
    provincia: pedidoRaw.provincia || "",
    cp: pedidoRaw.cp || "",
    pais: pedidoRaw.pais || "España",
    direccionEntrega: {
      nombre: pedidoRaw.nombre || pedidoRaw.Cliente?.nombre || "",
      apellidos: pedidoRaw.apellidos || pedidoRaw.Cliente?.apellidos || "",
      empresa: pedidoRaw.Cliente?.empresa || "",
      nif: pedidoRaw.nif || "",
      telefono: pedidoRaw.telefono || "",
      direccion: pedidoRaw.direccion || "",
      direccionComplementaria: pedidoRaw.direccionComplementaria || "",
      codigoPostal: pedidoRaw.cp || pedidoRaw.Cliente?.codigoPostal || "",
      ciudad: pedidoRaw.ciudad || pedidoRaw.Cliente?.ciudad || "",
      provincia: pedidoRaw.provincia || pedidoRaw.Cliente?.provincia || "",
      pais: pedidoRaw.pais || pedidoRaw.Cliente?.pais || "España",
    },
    direccionFacturacion: toAddress(pedidoRaw, "facturacion"),
    envioMetodo: pedidoRaw.envioMetodo,
    envioCoste: Number(pedidoRaw.envioCoste ?? 0),
    transportistaNombre: pedidoRaw.transportistaNombre || "",
    numeroSeguimiento: pedidoRaw.numeroSeguimiento || "",
    trackingUrl: pedidoRaw.trackingUrl || "",
    fechaEnvio: pedidoRaw.fechaEnvio ? pedidoRaw.fechaEnvio.toISOString() : null,
    fechaEntrega: pedidoRaw.fechaEntrega ? pedidoRaw.fechaEntrega.toISOString() : null,
    pagoMetodo: pedidoRaw.pagoMetodo,
    pagoRecargo: Number(pedidoRaw.pagoRecargo ?? 0),
    estadoPago: pedidoRaw.estadoPago,
    subtotal: Number(pedidoRaw.subtotal ?? 0),
    descuento: Number(pedidoRaw.descuento ?? 0),
    cuponCodigo: pedidoRaw.cuponCodigo || "",
    cuponDescuento: pedidoRaw.cuponDescuento ?? null,
    totalFinal: Number(pedidoRaw.totalFinal ?? 0),
    estado: pedidoRaw.estado,
    notas: pedidoRaw.notas || "",
    fechaPedido: pedidoRaw.fechaPedido ? pedidoRaw.fechaPedido.toISOString() : null,
    createdAt: pedidoRaw.createdAt ? pedidoRaw.createdAt.toISOString() : null,
    updatedAt: pedidoRaw.updatedAt ? pedidoRaw.updatedAt.toISOString() : null,
    cliente: pedidoRaw.Cliente
      ? {
          id: pedidoRaw.Cliente.id,
          nombre: `${pedidoRaw.Cliente.nombre || ""} ${pedidoRaw.Cliente.apellidos || ""}`.trim(),
          email: pedidoRaw.Cliente.email,
          telefono: pedidoRaw.Cliente.telefono || "",
          empresa: pedidoRaw.Cliente.empresa || "",
          nif: pedidoRaw.Cliente.nif || "",
        }
      : null,
    factura: pedidoRaw.factura || null,
    productos: (pedidoRaw.PedidoProducto || []).map((prod: any) => ({
      id: prod.id,
      productoId: prod.productoIdRef || null,
      varianteId: prod.varianteIdRef || null,
      nombre: prod.nombre,
      varianteInfo: prod.varianteInfo || "",
      cantidad: prod.cantidad,
      precioUnitario: Number(prod.precioUnitario ?? 0),
      subtotal: Number(prod.subtotal ?? 0),
      producto: prod.producto || null,
      variante: prod.variante || null,
    })),
    mensajes: pedidoRaw.mensajes || [],
  };
}

function cleanData<T extends Record<string, any>>(data: T) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const pedidoRaw = await prisma.pedido.findUnique({
      where: { id },
      include: {
        Cliente: {
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
        },
        factura: true,
        PedidoProducto: {
          include: {
            producto: {
              select: { id: true, nombre: true, referencia: true, slug: true },
            },
            variante: {
              select: { id: true, referencia: true, tamano: true, color: true, tirador: true },
            },
          },
          orderBy: { id: "asc" },
        },
        mensajes: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!pedidoRaw) {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, pedido: mapPedido(pedidoRaw) });
  } catch (error: any) {
    console.error("Error GET pedido:", error);
    return NextResponse.json({ ok: false, error: "Error de servidor", detalle: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      const pedidoActualizado = await tx.pedido.update({
        where: { id },
        data: cleanData({
          estado: body.estado,
          estadoPago: body.estadoPago,
          notas: body.notas,
          envioMetodo: body.envioMetodo,
          envioCoste: body.envioCoste !== undefined ? Number(body.envioCoste) : undefined,
          transportistaNombre: body.transportistaNombre,
          numeroSeguimiento: body.numeroSeguimiento,
          trackingUrl: body.trackingUrl,
          fechaEnvio: body.fechaEnvio ? new Date(body.fechaEnvio) : undefined,
          fechaEntrega: body.fechaEntrega ? new Date(body.fechaEntrega) : undefined,
          pagoMetodo: body.pagoMetodo,
          pagoRecargo: body.pagoRecargo !== undefined ? Number(body.pagoRecargo) : undefined,
          subtotal: body.subtotal !== undefined ? Number(body.subtotal) : undefined,
          descuento: body.descuento !== undefined ? Number(body.descuento) : undefined,
          totalFinal: body.totalFinal !== undefined ? Number(body.totalFinal) : undefined,
          cuponCodigo: body.cuponCodigo,
          cuponDescuento: body.cuponDescuento !== undefined ? Number(body.cuponDescuento) : undefined,
          nombre: body.nombre,
          apellidos: body.apellidos,
          email: body.email,
          telefono: body.telefono,
          nif: body.nif,
          direccion: body.direccion,
          direccionComplementaria: body.direccionComplementaria,
          ciudad: body.ciudad,
          provincia: body.provincia,
          cp: body.cp,
          pais: body.pais,
          facturacionNombre: body.facturacionNombre,
          facturacionApellidos: body.facturacionApellidos,
          facturacionEmpresa: body.facturacionEmpresa,
          facturacionNif: body.facturacionNif,
          facturacionTelefono: body.facturacionTelefono,
          facturacionDireccion: body.facturacionDireccion,
          facturacionDireccionComplementaria: body.facturacionDireccionComplementaria,
          facturacionCodigoPostal: body.facturacionCodigoPostal,
          facturacionCiudad: body.facturacionCiudad,
          facturacionProvincia: body.facturacionProvincia,
          facturacionPais: body.facturacionPais,
          updatedAt: new Date(),
        }),
      });

      if (Array.isArray(body.productos)) {
        for (const producto of body.productos) {
          if (!producto?.id) continue;
          await tx.pedidoProducto.update({
            where: { id: producto.id },
            data: cleanData({
              cantidad: producto.cantidad !== undefined ? Number(producto.cantidad) : undefined,
              precioUnitario: producto.precioUnitario !== undefined ? Number(producto.precioUnitario) : undefined,
              subtotal: producto.subtotal !== undefined ? Number(producto.subtotal) : undefined,
              varianteInfo: producto.varianteInfo,
            }),
          });
        }
      }

      return pedidoActualizado;
    });

    const pedidoCompleto = await prisma.pedido.findUnique({
      where: { id: result.id },
      include: {
        Cliente: {
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
        },
        factura: true,
        PedidoProducto: {
          include: {
            producto: {
              select: { id: true, nombre: true, referencia: true, slug: true },
            },
            variante: {
              select: { id: true, referencia: true, tamano: true, color: true, tirador: true },
            },
          },
          orderBy: { id: "asc" },
        },
        mensajes: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ ok: true, pedido: pedidoCompleto ? mapPedido(pedidoCompleto) : result });
  } catch (error: any) {
    console.error("Error PUT pedido:", error);
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    await prisma.factura.deleteMany({ where: { pedidoId: id } });
    await prisma.pedido.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error DELETE pedido:", error);
    return NextResponse.json({ ok: false, error: "Error de servidor" }, { status: 500 });
  }
}
