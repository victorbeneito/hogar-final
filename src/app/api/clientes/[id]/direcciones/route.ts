import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { canEdit } from "@/lib/adminAuth";

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
    const rolAdmin = getRole(decodedAdmin);
    if (["admin", "superadmin", "auditor"].includes(rolAdmin)) return { autorizado: true as const };
  } catch {}

  try {
    const decodedClient: any = jwt.verify(token, clientSecret);
    if (String(decodedClient?.id) === String(idSolicitado)) return { autorizado: true as const };
    const rolClient = getRole(decodedClient);
    if (["admin", "superadmin", "auditor"].includes(rolClient)) return { autorizado: true as const };
    return { autorizado: false, status: 403, error: "No autorizado" };
  } catch {
    return { autorizado: false, status: 403, error: "Token inválido" };
  }
}

function toPayload(body: any, idCliente: number, ahora = new Date()) {
  return {
    clienteId: idCliente,
    alias: body.alias || "Principal",
    nombre: body.nombre || "",
    apellidos: body.apellidos || "",
    empresa: body.empresa || null,
    nif: body.nif || null,
    telefono: body.telefono || null,
    direccion: body.direccion || "",
    complemento: body.direccionComplementaria || null,
    codigoPostal: body.codigoPostal || "",
    ciudad: body.ciudad || "",
    provincia: body.provincia || "",
    pais: body.pais || "España",
    predeterminada: Boolean(body.predeterminada ?? false),
    updatedAt: ahora,
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const idCliente = parseInt(idString, 10);
    if (Number.isNaN(idCliente)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const permiso = await verificarAcceso(req, idCliente);
    if (!permiso.autorizado) {
      return NextResponse.json({ ok: false, error: permiso.error }, { status: permiso.status });
    }

    const direcciones = await prisma.direccion.findMany({
      where: { clienteId: idCliente },
      orderBy: [
        { predeterminada: "desc" },
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ ok: true, direcciones });
  } catch (error: any) {
    console.error("❌ Error GET direcciones:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso" }, { status: 403 });
  }

  try {
    const { id: idString } = await params;
    const idCliente = parseInt(idString, 10);
    if (Number.isNaN(idCliente)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const permiso = await verificarAcceso(req, idCliente);
    if (!permiso.autorizado) {
      return NextResponse.json({ ok: false, error: permiso.error }, { status: permiso.status });
    }

    const body = await req.json();
    const ahora = new Date();

    const direccion = await prisma.$transaction(async (tx) => {
      if (body.predeterminada) {
        await tx.direccion.updateMany({
          where: { clienteId: idCliente, predeterminada: true },
          data: { predeterminada: false },
        });
      }

      return tx.direccion.create({
        data: {
          ...toPayload(body, idCliente, ahora),
          createdAt: ahora,
        },
      });
    });

    return NextResponse.json({ ok: true, direccion });
  } catch (error: any) {
    console.error("❌ Error POST direcciones:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso" }, { status: 403 });
  }

  try {
    const { id: idString } = await params;
    const idCliente = parseInt(idString, 10);
    if (Number.isNaN(idCliente)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const permiso = await verificarAcceso(req, idCliente);
    if (!permiso.autorizado) {
      return NextResponse.json({ ok: false, error: permiso.error }, { status: permiso.status });
    }

    const url = new URL(req.url);
    const direccionId = Number(url.searchParams.get("direccionId"));
    if (Number.isNaN(direccionId)) {
      return NextResponse.json({ ok: false, error: "direccionId requerido" }, { status: 400 });
    }

    const body = await req.json();
    const ahora = new Date();

    if (body.predeterminada) {
      await prisma.direccion.updateMany({
        where: { clienteId: idCliente, predeterminada: true, NOT: { id: direccionId } },
        data: { predeterminada: false },
      });
    }

    const direccion = await prisma.direccion.update({
      where: { id: direccionId },
      data: {
        ...toPayload(body, idCliente, ahora),
        updatedAt: ahora,
      },
    });

    return NextResponse.json({ ok: true, direccion });
  } catch (error: any) {
    console.error("❌ Error PUT direcciones:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const idCliente = parseInt(idString, 10);
    if (Number.isNaN(idCliente)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const permiso = await verificarAcceso(req, idCliente);
    if (!permiso.autorizado) {
      return NextResponse.json({ ok: false, error: permiso.error }, { status: permiso.status });
    }

    const url = new URL(req.url);
    const direccionId = Number(url.searchParams.get("direccionId"));
    if (Number.isNaN(direccionId)) {
      return NextResponse.json({ ok: false, error: "direccionId requerido" }, { status: 400 });
    }

    await prisma.direccion.updateMany({
      where: { clienteId: idCliente },
      data: { predeterminada: false },
    });

    const direccion = await prisma.direccion.update({
      where: { id: direccionId },
      data: { predeterminada: true, updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, direccion });
  } catch (error: any) {
    console.error("❌ Error PATCH direcciones:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso" }, { status: 403 });
  }

  try {
    const { id: idString } = await params;
    const idCliente = parseInt(idString, 10);
    if (Number.isNaN(idCliente)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const permiso = await verificarAcceso(req, idCliente);
    if (!permiso.autorizado) {
      return NextResponse.json({ ok: false, error: permiso.error }, { status: permiso.status });
    }

    const url = new URL(req.url);
    const direccionId = Number(url.searchParams.get("direccionId"));
    if (Number.isNaN(direccionId)) {
      return NextResponse.json({ ok: false, error: "direccionId requerido" }, { status: 400 });
    }

    await prisma.direccion.delete({
      where: { id: direccionId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("❌ Error DELETE direcciones:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
