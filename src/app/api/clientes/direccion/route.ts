import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRETO_JWT_CLIENTE || process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

function getTokenFromHeader(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.replace("Bearer ", "");
}

function mapDireccion(cliente: any, direccion: any | null) {
  if (direccion) {
    return {
      alias: direccion.alias,
      empresa: direccion.empresa ?? cliente.empresa ?? "",
      direccion: direccion.direccion,
      direccionComplementaria: direccion.complemento ?? "",
      codigoPostal: direccion.codigoPostal,
      ciudad: direccion.ciudad,
      pais: direccion.pais ?? "España",
      provincia: direccion.provincia,
      telefono: direccion.telefono ?? "",
      nif: direccion.nif ?? cliente.nif ?? "",
      predeterminada: direccion.predeterminada,
    };
  }

  return {
    alias: "Principal",
    empresa: cliente.empresa ?? "",
    direccion: cliente.direccion ?? "",
    direccionComplementaria: cliente.direccionComplementaria ?? "",
    codigoPostal: cliente.codigoPostal ?? "",
    ciudad: cliente.ciudad ?? "",
    pais: cliente.pais ?? "España",
    provincia: cliente.provincia ?? "",
    telefono: cliente.telefono ?? "",
    nif: cliente.nif ?? "",
    predeterminada: true,
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ ok: false, error: "Token requerido" }, { status: 401 });

    const decoded: any = jwt.verify(token, SECRET_KEY);
    const id = parseInt(decoded.id, 10);

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        empresa: true,
        direccion: true,
        direccionComplementaria: true,
        codigoPostal: true,
        ciudad: true,
        pais: true,
        provincia: true,
        telefono: true,
        nif: true,
      },
    });

    if (!cliente) return NextResponse.json({ ok: false, error: "Cliente no encontrado" }, { status: 404 });

    const direcciones = await prisma.direccion.findMany({
      where: { clienteId: id },
      orderBy: [
        { predeterminada: "desc" },
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      ok: true,
      direccion: mapDireccion(cliente, direcciones[0] ?? null),
      direcciones,
    });
  } catch (error: any) {
    console.error("Error GET Dirección:", error.message);
    return NextResponse.json({ ok: false, error: "Sesión inválida o expirada" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ ok: false, error: "Token requerido" }, { status: 401 });

    const decoded: any = jwt.verify(token, SECRET_KEY);
    const id = parseInt(decoded.id, 10);
    const body = await req.json();
    const ahora = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const clienteActualizado = await tx.cliente.update({
        where: { id },
        data: {
          empresa: body.empresa,
          direccion: body.direccion,
          direccionComplementaria: body.direccionComplementaria,
          codigoPostal: body.codigoPostal,
          ciudad: body.ciudad,
          pais: body.pais || "España",
          provincia: body.provincia,
          telefono: body.telefono,
          nif: body.nif,
          updatedAt: ahora,
        },
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

      const direccionExistente = await tx.direccion.findFirst({
        where: { clienteId: id, predeterminada: true },
        orderBy: { updatedAt: "desc" },
      });

      const direccionData = {
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
        predeterminada: true,
        updatedAt: ahora,
      };

      let direccionPrincipal;
      if (direccionExistente) {
        direccionPrincipal = await tx.direccion.update({
          where: { id: direccionExistente.id },
          data: direccionData,
        });
      } else {
        direccionPrincipal = await tx.direccion.create({
          data: {
            clienteId: id,
            ...direccionData,
            createdAt: ahora,
          },
        });
      }

      return { clienteActualizado, direccionPrincipal };
    });

    return NextResponse.json({
      ok: true,
      direccion: mapDireccion(result.clienteActualizado, result.direccionPrincipal),
      cliente: result.clienteActualizado,
    });
  } catch (error: any) {
    console.error("❌ Error PUT Dirección:", error.message);

    if (error.message === "invalid signature" || error.message === "jwt malformed") {
      return NextResponse.json({ ok: false, error: "Error de seguridad: Tu sesión no es válida. Por favor, cierra sesión y entra de nuevo." }, { status: 401 });
    }

    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
