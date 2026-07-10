import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

// ============================================================================
// GET: Cupones disponibles para el cliente autenticado
// Excluye cupones inactivos, caducados, aún no iniciados, agotados o que
// el cliente ya haya usado hasta su límite personal.
// ============================================================================
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let clienteId: number;
  try {
    const decoded: any = jwt.verify(token, process.env.SECRETO_JWT_CLIENTE!);
    clienteId = parseInt(decoded.id);
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  try {
    const ahora = new Date();

    const cupones = await prisma.cupon.findMany({
      where: {
        activo: true,
        fechaInicio: { lte: ahora },
        fechaFin: { gte: ahora },
      },
      orderBy: { fechaFin: "asc" },
    });

    const usos = await prisma.cupon_uso.findMany({
      where: { clienteId },
    });
    const usosPorCupon = new Map(usos.map(u => [u.cuponId, u.veces]));

    const disponibles = cupones
      .filter(c => c.cantidadUsada < c.cantidadTotal)
      .filter(c => (usosPorCupon.get(c.id) || 0) < c.limitePorUsuario)
      .map(c => ({
        id: c.id,
        codigo: c.codigo,
        descripcion: c.descripcion || "",
        tipoDescuento: c.tipoDescuento,
        descuento: Number(c.valorDescuento),
        fechaExpiracion: c.fechaFin.toISOString(),
      }));

    return NextResponse.json(disponibles);
  } catch (error: any) {
    console.error("❌ ERROR GET MIS CUPONES:", error);
    return NextResponse.json({ error: "Error interno", detalle: error.message }, { status: 500 });
  }
}
