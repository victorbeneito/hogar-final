import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const existingCount = await prisma.formapago.count();
  if (existingCount === 0) {
    await prisma.formapago.createMany({
      data: [
        { nombre: "Tarjeta", descripcion: "Pago con Redsys", recargo: 0, activa: true, orden: 1, updatedAt: new Date() },
        { nombre: "PayPal", descripcion: "Pago con cuenta PayPal", recargo: 0, activa: true, orden: 2, updatedAt: new Date() },
        { nombre: "Bizum", descripcion: "Pago móvil instantáneo", recargo: 0, activa: true, orden: 3, updatedAt: new Date() },
        { nombre: "Transferencia", descripcion: "Transferencia bancaria", recargo: 0, activa: true, orden: 4, updatedAt: new Date() },
        { nombre: "Contrareembolso", descripcion: "Pago al recibir el pedido", recargo: 0, activa: true, orden: 5, updatedAt: new Date() },
      ],
    });
  }

  const formasPago = await prisma.formapago.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    formasPago: formasPago.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      descripcion: item.descripcion,
      recargo: Number(item.recargo ?? 0),
      activa: item.activa,
      orden: item.orden,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso para modificar formas de pago" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const items = Array.isArray(body.formasPago) ? body.formasPago : [];

    for (const item of items) {
      if (!item?.id) continue;
      await prisma.formapago.update({
        where: { id: Number(item.id) },
        data: {
          nombre: String(item.nombre ?? ""),
          descripcion: item.descripcion?.trim?.() ? String(item.descripcion) : null,
          recargo: Number(item.recargo ?? 0),
          activa: Boolean(item.activa),
          orden: Number(item.orden ?? 0),
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}
