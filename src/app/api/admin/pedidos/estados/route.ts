import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_STATES = [
  { clave: "PENDIENTE",  nombre: "Pendiente",             color: "#f59e0b", orden: 1, enviarEmail: false, establecerPagado: false, establecerEnviado: false, esEntrega: false, esFactura: false, considerarValidado: false, permitirFacturaPDF: false, ocultarEstado: false, adjuntarFacturaPDF: false, adjuntarAlbaranPDF: false, activo: true },
  { clave: "PROCESANDO", nombre: "Preparación en curso",  color: "#3b82f6", orden: 2, enviarEmail: true,  establecerPagado: false, establecerEnviado: false, esEntrega: false, esFactura: false, considerarValidado: true,  permitirFacturaPDF: false, ocultarEstado: false, adjuntarFacturaPDF: false, adjuntarAlbaranPDF: false, activo: true },
  { clave: "ENVIADO",    nombre: "Enviado",               color: "#8b5cf6", orden: 3, enviarEmail: true,  establecerPagado: false, establecerEnviado: true,  esEntrega: false, esFactura: false, considerarValidado: true,  permitirFacturaPDF: false, ocultarEstado: false, adjuntarFacturaPDF: false, adjuntarAlbaranPDF: false, activo: true },
  { clave: "ENTREGADO",  nombre: "Entregado",             color: "#10b981", orden: 4, enviarEmail: false, establecerPagado: false, establecerEnviado: false, esEntrega: true,  esFactura: false, considerarValidado: true,  permitirFacturaPDF: true,  ocultarEstado: false, adjuntarFacturaPDF: false, adjuntarAlbaranPDF: false, activo: true },
  { clave: "CANCELADO",  nombre: "Cancelado",             color: "#ef4444", orden: 5, enviarEmail: true,  establecerPagado: false, establecerEnviado: false, esEntrega: false, esFactura: false, considerarValidado: false, permitirFacturaPDF: false, ocultarEstado: false, adjuntarFacturaPDF: false, adjuntarAlbaranPDF: false, activo: true },
  { clave: "DEVUELTO",   nombre: "Devuelto / Reembolsado",color: "#6366f1", orden: 6, enviarEmail: true,  establecerPagado: false, establecerEnviado: false, esEntrega: false, esFactura: false, considerarValidado: false, permitirFacturaPDF: false, ocultarEstado: false, adjuntarFacturaPDF: false, adjuntarAlbaranPDF: false, activo: true },
];

export async function GET() {
  try {
    let estados = await prisma.estadopedido.findMany({ orderBy: { orden: "asc" } });

    if (estados.length === 0) {
      const now = new Date();
      await prisma.estadopedido.createMany({
        data: DEFAULT_STATES.map((s) => ({ ...s, plantillaEmail: null, icono: null, updatedAt: now })),
        skipDuplicates: true,
      });
      estados = await prisma.estadopedido.findMany({ orderBy: { orden: "asc" } });
    }

    return NextResponse.json({ estados });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.nombre?.trim()) {
      return NextResponse.json({ error: "El nombre del estado es obligatorio" }, { status: 400 });
    }
    if (!data.clave?.trim()) {
      return NextResponse.json({ error: "La clave interna es obligatoria" }, { status: 400 });
    }
    const clave = String(data.clave).toUpperCase().replace(/\s+/g, "_");

    // Verificar si la clave ya existe
    const existe = await prisma.estadopedido.findUnique({ where: { clave } });
    if (existe) {
      return NextResponse.json(
        { error: `La clave "${clave}" ya está en uso por otro estado` },
        { status: 400 }
      );
    }

    const now = new Date();
    const estado = await prisma.estadopedido.create({
      data: {
        clave,
        nombre: data.nombre,
        color: data.color ?? "#6b7280",
        icono: data.icono ?? null,
        orden: data.orden ?? 99,
        activo: data.activo ?? true,
        enviarEmail: data.enviarEmail ?? false,
        plantillaEmail: data.plantillaEmail ?? null,
        esEntrega: data.esEntrega ?? false,
        esFactura: data.esFactura ?? false,
        considerarValidado: data.considerarValidado ?? false,
        permitirFacturaPDF: data.permitirFacturaPDF ?? false,
        ocultarEstado: data.ocultarEstado ?? false,
        adjuntarFacturaPDF: data.adjuntarFacturaPDF ?? false,
        adjuntarAlbaranPDF: data.adjuntarAlbaranPDF ?? false,
        establecerEnviado: data.establecerEnviado ?? false,
        establecerPagado: data.establecerPagado ?? false,
        updatedAt: now,
      },
    });
    return NextResponse.json({ ok: true, estado });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
