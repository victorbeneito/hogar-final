import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTemplateEmail } from "@/lib/emailService";
import { sendReviOrder, REVI_SYNC_CUTOFF_DATE } from "@/lib/reviService";
import { createFactura } from "@/lib/invoiceGenerator";
import { canEdit } from "@/lib/adminAuth";

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
    nombre: `${pedidoRaw.nombre || pedidoRaw.cliente?.nombre || ""} ${pedidoRaw.apellidos || pedidoRaw.cliente?.apellidos || ""}`.trim(),
    apellidos: pedidoRaw.apellidos || pedidoRaw.cliente?.apellidos || "",
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
      nombre: pedidoRaw.nombre || pedidoRaw.cliente?.nombre || "",
      apellidos: pedidoRaw.apellidos || pedidoRaw.cliente?.apellidos || "",
      empresa: pedidoRaw.cliente?.empresa || "",
      nif: pedidoRaw.nif || "",
      telefono: pedidoRaw.telefono || "",
      direccion: pedidoRaw.direccion || "",
      direccionComplementaria: pedidoRaw.direccionComplementaria || "",
      codigoPostal: pedidoRaw.cp || pedidoRaw.cliente?.codigoPostal || "",
      ciudad: pedidoRaw.ciudad || pedidoRaw.cliente?.ciudad || "",
      provincia: pedidoRaw.provincia || pedidoRaw.cliente?.provincia || "",
      pais: pedidoRaw.pais || pedidoRaw.cliente?.pais || "España",
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
    createdAt: pedidoRaw.fechaPedido ? pedidoRaw.fechaPedido.toISOString() : null,
    updatedAt: pedidoRaw.updatedAt ? pedidoRaw.updatedAt.toISOString() : null,
    cliente: pedidoRaw.cliente
      ? {
          id: pedidoRaw.cliente.id,
          nombre: `${pedidoRaw.cliente.nombre || ""} ${pedidoRaw.cliente.apellidos || ""}`.trim(),
          email: pedidoRaw.cliente.email,
          telefono: pedidoRaw.cliente.telefono || "",
          empresa: pedidoRaw.cliente.empresa || "",
          nif: pedidoRaw.cliente.nif || "",
        }
      : null,
    factura: pedidoRaw.factura || null,
    productos: (pedidoRaw.pedidoproducto || []).map((prod: any) => ({
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
    estadoHistorial: [] as { id: number; estado: string; color: string; fecha: string }[],
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
      select: {
        id: true,
        numeroPedido: true,
        clienteId: true,
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        nif: true,
        direccion: true,
        direccionComplementaria: true,
        ciudad: true,
        provincia: true,
        cp: true,
        pais: true,
        facturacionNombre: true,
        facturacionApellidos: true,
        facturacionEmpresa: true,
        facturacionNif: true,
        facturacionTelefono: true,
        facturacionDireccion: true,
        facturacionDireccionComplementaria: true,
        facturacionCodigoPostal: true,
        facturacionCiudad: true,
        facturacionProvincia: true,
        facturacionPais: true,
        envioMetodo: true,
        envioCoste: true,
        transportistaNombre: true,
        numeroSeguimiento: true,
        trackingUrl: true,
        fechaEnvio: true,
        fechaEntrega: true,
        pagoMetodo: true,
        pagoRecargo: true,
        estadoPago: true,
        subtotal: true,
        descuento: true,
        totalFinal: true,
        estado: true,
        cuponCodigo: true,
        cuponDescuento: true,
        notas: true,
        fechaPedido: true,
        updatedAt: true,
        cliente: {
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
        pedidoproducto: {
          select: {
            id: true,
            productoIdRef: true,
            varianteIdRef: true,
            nombre: true,
            varianteInfo: true,
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
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
          select: {
            id: true,
            autor: true,
            autorNombre: true,
            mensaje: true,
            privado: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!pedidoRaw) {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }

    let historial: any[] = await prisma.historialestadopedido.findMany({
      where: { pedidoId: id },
      orderBy: { fecha: "asc" },
    });

    // Auto-reparar: insertar historial si está vacío, o corregir colores grises incorrectos
    const needsRepair =
      historial.length === 0 ||
      historial.some((h: any) => !h.color || h.color === "#6b7280");

    if (needsRepair && pedidoRaw.estado) {
      const allEstados = await prisma.estadopedido.findMany({
        select: { clave: true, nombre: true, color: true },
      });
      const match = allEstados.find(
        (e) =>
          e.clave.toLowerCase() === pedidoRaw.estado.toLowerCase() ||
          e.nombre.toLowerCase() === pedidoRaw.estado.toLowerCase()
      );
      if (match && match.color !== "#6b7280") {
        try {
          if (historial.length === 0) {
            const entry = await prisma.historialestadopedido.create({
              data: {
                pedidoId: id,
                estado: match.nombre,
                color: match.color,
                fecha: pedidoRaw.fechaPedido ?? new Date(),
              },
            });
            historial = [entry];
          } else {
            // Corregir entradas con color gris incorrecto
            for (const h of historial.filter((h: any) => !h.color || h.color === "#6b7280")) {
              await prisma.historialestadopedido.update({
                where: { id: h.id },
                data: { color: match.color, estado: match.nombre },
              });
            }
            historial = await prisma.historialestadopedido.findMany({
              where: { pedidoId: id },
              orderBy: { fecha: "asc" },
            });
          }
        } catch {}
      }
    }

    const pedidoMapeado = mapPedido(pedidoRaw);
    pedidoMapeado.estadoHistorial = historial.map((h: any) => ({
      id: h.id,
      estado: h.estado,
      color: h.color || "#6b7280",
      fecha: h.fecha instanceof Date ? h.fecha.toISOString() : String(h.fecha),
    }));

    return NextResponse.json({ ok: true, pedido: pedidoMapeado });
  } catch (error: any) {
    console.error("Error GET pedido:", error);
    return NextResponse.json({ ok: false, error: "Error de servidor", detalle: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso para editar pedidos" }, { status: 403 });
  }

  try {
    const { id: idString } = await params;
    const id = parseInt(idString, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Leer estado anterior para detectar cambios y enviar email si procede
    const pedidoAnterior = body.estado
      ? await prisma.pedido.findUnique({
          where: { id },
          select: {
            estado: true,
            email: true,
            nombre: true,
            numeroPedido: true,
            numeroSeguimiento: true,
            trackingUrl: true,
            totalFinal: true,
            fechaPedido: true,
          },
        })
      : null;

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
          fechaEnvio: body.fechaEnvio ? new Date(body.fechaEnvio) : body.fechaEnvio === null ? null : undefined,
          fechaEntrega: body.fechaEntrega ? new Date(body.fechaEntrega) : body.fechaEntrega === null ? null : undefined,
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
        select: {
          id: true,
        },
      });

      if (Array.isArray(body.productosEliminarIds) && body.productosEliminarIds.length > 0) {
        const idsEliminar = body.productosEliminarIds
          .map((eid: any) => Number(eid))
          .filter((eid: number) => Number.isInteger(eid));
        if (idsEliminar.length > 0) {
          await tx.pedidoproducto.deleteMany({
            where: { id: { in: idsEliminar }, pedidoId: id },
          });
        }
      }

      if (Array.isArray(body.productos)) {
        for (const producto of body.productos) {
          if (producto?.id) {
            await tx.pedidoproducto.update({
              where: { id: producto.id },
              data: cleanData({
                productoIdRef: producto.productoId !== undefined ? producto.productoId : undefined,
                varianteIdRef: producto.varianteId !== undefined ? producto.varianteId : undefined,
                nombre: producto.nombre,
                cantidad: producto.cantidad !== undefined ? Number(producto.cantidad) : undefined,
                precioUnitario: producto.precioUnitario !== undefined ? Number(producto.precioUnitario) : undefined,
                subtotal: producto.subtotal !== undefined ? Number(producto.subtotal) : undefined,
                varianteInfo: producto.varianteInfo,
              }),
            });
          } else {
            if (!producto?.nombre || !producto?.cantidad) continue;
            await tx.pedidoproducto.create({
              data: {
                pedidoId: id,
                productoIdRef: producto.productoId ?? null,
                varianteIdRef: producto.varianteId ?? null,
                nombre: producto.nombre,
                varianteInfo: producto.varianteInfo || null,
                cantidad: Number(producto.cantidad),
                precioUnitario: Number(producto.precioUnitario ?? 0),
                subtotal: Number(producto.subtotal ?? Number(producto.cantidad) * Number(producto.precioUnitario ?? 0)),
              },
            });
          }
        }
      }

      return pedidoActualizado;
    });

    const pedidoCompleto = await prisma.pedido.findUnique({
      where: { id: result.id },
      select: {
        id: true,
        numeroPedido: true,
        clienteId: true,
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        nif: true,
        direccion: true,
        direccionComplementaria: true,
        ciudad: true,
        provincia: true,
        cp: true,
        pais: true,
        facturacionNombre: true,
        facturacionApellidos: true,
        facturacionEmpresa: true,
        facturacionNif: true,
        facturacionTelefono: true,
        facturacionDireccion: true,
        facturacionDireccionComplementaria: true,
        facturacionCodigoPostal: true,
        facturacionCiudad: true,
        facturacionProvincia: true,
        facturacionPais: true,
        envioMetodo: true,
        envioCoste: true,
        transportistaNombre: true,
        numeroSeguimiento: true,
        trackingUrl: true,
        fechaEnvio: true,
        fechaEntrega: true,
        pagoMetodo: true,
        pagoRecargo: true,
        estadoPago: true,
        subtotal: true,
        descuento: true,
        totalFinal: true,
        estado: true,
        cuponCodigo: true,
        cuponDescuento: true,
        notas: true,
        fechaPedido: true,
        updatedAt: true,
        cliente: {
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
        pedidoproducto: {
          select: {
            id: true,
            productoIdRef: true,
            varianteIdRef: true,
            nombre: true,
            varianteInfo: true,
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
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
          select: {
            id: true,
            autor: true,
            autorNombre: true,
            mensaje: true,
            privado: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Guardar historial de estado si cambió
    if (body.estado && pedidoAnterior && pedidoAnterior.estado !== body.estado) {
      const estadoInfo = await prisma.estadopedido.findUnique({
        where: { clave: body.estado },
        select: { nombre: true, color: true },
      });
      await prisma.historialestadopedido.create({
        data: {
          pedidoId: id,
          estado: estadoInfo?.nombre ?? body.estado,
          color: estadoInfo?.color ?? "#6b7280",
          fecha: new Date(),
        },
      });
    }

    // Emails automáticos al cambiar el estado del pedido
    if (pedidoAnterior && body.estado && pedidoAnterior.estado !== body.estado && pedidoAnterior.email) {
      const appUrl = process.env.APP_URL || "https://www.elhogardetsuenos.com";
      const nombre = pedidoAnterior.nombre || "Cliente";
      const numeroPedido = pedidoAnterior.numeroPedido;

      if (body.estado === "ENVIADO") {
        const trackingNumber = body.numeroSeguimiento || pedidoAnterior.numeroSeguimiento || "";
        const trackingUrl =
          body.trackingUrl ||
          pedidoAnterior.trackingUrl ||
          (trackingNumber
            ? `https://www.ontime.es/seguimiento/?expedicion=${trackingNumber}`
            : `${appUrl}/mis-pedidos`);
        sendTemplateEmail({
          to: pedidoAnterior.email,
          templateSlug: "order-shipped",
          variables: { nombre, numeroPedido, trackingNumber, trackingUrl },
        }).catch((err) => console.error("❌ Email pedido enviado:", err?.message));
      } else if (body.estado === "CANCELADO") {
        const motivo = body.notas ? `Motivo: ${body.notas}` : "";
        sendTemplateEmail({
          to: pedidoAnterior.email,
          templateSlug: "order-cancelled",
          variables: { nombre, numeroPedido, motivo },
        }).catch((err) => console.error("❌ Email pedido cancelado:", err?.message));
      } else if (body.estado === "CUESTIONARIO" && pedidoAnterior.fechaPedido >= REVI_SYNC_CUTOFF_DATE) {
        sendReviOrder(pedidoCompleto)
          .then(() => prisma.pedido.update({ where: { id }, data: { reviInvitadoAt: new Date() } }))
          .catch((err) =>
            console.error("[REVI] Error enviando pedido a REVI:", err?.message)
          );
      }

      // Generar factura si el nuevo estado tiene permitirFacturaPDF = true
      const estadoConfig = await prisma.estadopedido.findUnique({
        where: { clave: body.estado },
        select: { permitirFacturaPDF: true },
      });
      if (estadoConfig?.permitirFacturaPDF) {
        createFactura(id).catch((err) =>
          console.error("[FACTURA] Error generando factura:", err?.message)
        );
      }
    }

    if (pedidoCompleto) {
      const historialPut: any[] = await prisma.$queryRaw`
        SELECT id, estado, color, fecha FROM historialestadopedido WHERE pedidoId = ${id} ORDER BY fecha ASC
      `;
      const pedidoFinal = mapPedido(pedidoCompleto);
      pedidoFinal.estadoHistorial = historialPut.map((h: any) => ({
        id: h.id,
        estado: h.estado,
        color: h.color || "#6b7280",
        fecha: h.fecha instanceof Date ? h.fecha.toISOString() : String(h.fecha),
      }));
      return NextResponse.json({ ok: true, pedido: pedidoFinal });
    }
    return NextResponse.json({ ok: true, pedido: result });
  } catch (error: any) {
    console.error("Error PUT pedido:", error);
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso para eliminar pedidos" }, { status: 403 });
  }

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
