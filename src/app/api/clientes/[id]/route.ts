import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return authHeader?.split(" ")[1]?.replace(/"/g, "") || null;
}

function getRole(decoded: any) {
  return String(decoded?.rol ?? decoded?.role ?? "").toLowerCase();
}

async function verificarAcceso(req: NextRequest, idSolicitado: number) {
  const token = getToken(req);
  if (!token) return { autorizado: false, status: 401, error: "Token requerido" };

  const adminSecret = process.env.SECRETO_JWT_ADMIN || "palabra_secreta_emergencia_2026";
  const clientSecret = process.env.SECRETO_JWT_CLIENTE || process.env.JWT_SECRET || "secreto_super_seguro_tienda";

  try {
    const decodedAdmin: any = jwt.verify(token, adminSecret);
    if (getRole(decodedAdmin) === "admin") return { autorizado: true as const };
  } catch {}

  try {
    const decodedClient: any = jwt.verify(token, clientSecret);
    if (String(decodedClient?.id) === String(idSolicitado)) return { autorizado: true as const };
    if (getRole(decodedClient) === "admin") return { autorizado: true as const };
    return { autorizado: false, status: 403, error: "No autorizado" };
  } catch {
    return { autorizado: false, status: 403, error: "Token inválido" };
  }
}

function mapDireccionLegacy(cliente: any, direccion: any | null) {
  if (direccion) {
    return {
      alias: direccion.alias,
      empresa: direccion.empresa ?? cliente?.empresa ?? "",
      direccion: direccion.direccion,
      direccionComplementaria: direccion.complemento ?? "",
      codigoPostal: direccion.codigoPostal,
      ciudad: direccion.ciudad,
      provincia: direccion.provincia,
      pais: direccion.pais ?? "España",
      telefono: direccion.telefono ?? "",
      nif: direccion.nif ?? cliente?.nif ?? "",
      predeterminada: direccion.predeterminada,
    };
  }

  return {
    alias: "Principal",
    empresa: cliente?.empresa ?? "",
    direccion: cliente?.direccion ?? "",
    direccionComplementaria: cliente?.direccionComplementaria ?? "",
    codigoPostal: cliente?.codigoPostal ?? "",
    ciudad: cliente?.ciudad ?? "",
    provincia: cliente?.provincia ?? "",
    pais: cliente?.pais ?? "España",
    telefono: cliente?.telefono ?? "",
    nif: cliente?.nif ?? "",
    predeterminada: true,
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const permiso = await verificarAcceso(req, id);
    if (!permiso.autorizado) {
      return NextResponse.json({ error: permiso.error }, { status: permiso.status });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id },
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
        activo: true,
        aceptaMarketing: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const [direcciones, pedidos] = await Promise.all([
      prisma.direccion.findMany({
        where: { clienteId: id },
        orderBy: [
          { predeterminada: "desc" },
          { updatedAt: "desc" },
          { createdAt: "desc" },
        ],
      }),
      prisma.pedido.findMany({
        where: { clienteId: id },
        orderBy: { fechaPedido: "desc" },
        select: {
          id: true,
          numeroPedido: true,
          totalFinal: true,
          estado: true,
          fechaPedido: true,
          updatedAt: true,
          pagoMetodo: true,
          envioMetodo: true,
        },
      }),
    ]);

    const direccionPrincipal = mapDireccionLegacy(cliente, direcciones[0] ?? null);

    return NextResponse.json({
      ok: true,
      cliente: {
        ...cliente,
        direccionPrincipal,
      },
      direcciones,
      pedidos,
    });
  } catch (error: any) {
    console.error("❌ Error GET cliente:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const permiso = await verificarAcceso(req, id);
    if (!permiso.autorizado) {
      return NextResponse.json({ error: permiso.error }, { status: permiso.status });
    }

    const body = await req.json();
    const ahora = new Date();

    const updateClienteData: Record<string, any> = {
      nombre: body.nombre,
      apellidos: body.apellidos,
      email: body.email,
      telefono: body.telefono,
      empresa: body.empresa,
      nif: body.nif || body.dni,
      direccion: body.direccion,
      direccionComplementaria: body.direccionComplementaria,
      codigoPostal: body.codigoPostal,
      ciudad: body.ciudad,
      provincia: body.provincia,
      pais: body.pais,
      activo: body.activo,
      aceptaMarketing: body.aceptaMarketing,
      role: body.role,
      updatedAt: ahora,
    };

    if (body.password && String(body.password).length > 0) {
      updateClienteData.password = await bcrypt.hash(String(body.password), 10);
    }

    Object.keys(updateClienteData).forEach((key) => {
      if (updateClienteData[key] === undefined || updateClienteData[key] === null) {
        delete updateClienteData[key];
      }
    });

    const hasAddressPayload =
      body.alias !== undefined ||
      body.empresa !== undefined ||
      body.nif !== undefined ||
      body.telefono !== undefined ||
      body.direccion !== undefined ||
      body.direccionComplementaria !== undefined ||
      body.codigoPostal !== undefined ||
      body.ciudad !== undefined ||
      body.provincia !== undefined ||
      body.pais !== undefined;

    const result = await prisma.$transaction(async (tx) => {
      const clienteActualizado = await tx.cliente.update({
        where: { id },
        data: updateClienteData,
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
          activo: true,
          aceptaMarketing: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      let direccionPrincipal = null;

      if (hasAddressPayload) {
        const direccionExistente = await tx.direccion.findFirst({
          where: { clienteId: id, predeterminada: true },
          orderBy: { updatedAt: "desc" },
        });

        const addressData = {
          alias: body.alias || "Principal",
          nombre: body.nombre || clienteActualizado.nombre,
          apellidos: body.apellidos ?? clienteActualizado.apellidos ?? "",
          empresa: body.empresa ?? clienteActualizado.empresa ?? null,
          nif: body.nif || body.dni || clienteActualizado.nif || null,
          telefono: body.telefono ?? clienteActualizado.telefono ?? null,
          direccion: body.direccion ?? clienteActualizado.direccion ?? "",
          complemento: body.direccionComplementaria ?? clienteActualizado.direccionComplementaria ?? null,
          codigoPostal: body.codigoPostal ?? clienteActualizado.codigoPostal ?? "",
          ciudad: body.ciudad ?? clienteActualizado.ciudad ?? "",
          provincia: body.provincia ?? clienteActualizado.provincia ?? "",
          pais: body.pais ?? clienteActualizado.pais ?? "España",
          predeterminada: true,
          updatedAt: ahora,
        };

        if (direccionExistente) {
          direccionPrincipal = await tx.direccion.update({
            where: { id: direccionExistente.id },
            data: addressData,
          });
        } else {
          direccionPrincipal = await tx.direccion.create({
            data: {
              clienteId: id,
              ...addressData,
              createdAt: ahora,
            },
          });
        }
      }

      return { clienteActualizado, direccionPrincipal };
    });

    const { password: _password, ...clienteFinal } = result.clienteActualizado;

    return NextResponse.json({
      ok: true,
      message: "Cliente actualizado correctamente",
      cliente: {
        ...clienteFinal,
        direccionPrincipal: mapDireccionLegacy(clienteFinal, result.direccionPrincipal),
      },
      direccion: result.direccionPrincipal,
    });
  } catch (error: any) {
    console.error("❌ Error PUT cliente:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const permiso = await verificarAcceso(req, id);
    if (!permiso.autorizado) {
      return NextResponse.json({ error: permiso.error }, { status: permiso.status });
    }

    await prisma.$transaction(async (tx) => {
      const pedidos = await tx.pedido.findMany({
        where: { clienteId: id },
        select: { id: true },
      });

      const pedidoIds = pedidos.map((pedido) => pedido.id);
      if (pedidoIds.length > 0) {
        await tx.pedidoproducto.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
        await tx.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
      }

      await tx.direccion.deleteMany({ where: { clienteId: id } });
      await tx.cliente.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true, message: "Cliente eliminado" });
  } catch (error: any) {
    console.error("🔥 Error DELETE cliente:", error);
    return NextResponse.json({ error: `Error al eliminar: ${error.message}` }, { status: 500 });
  }
}
