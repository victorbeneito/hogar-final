import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";

export async function GET() {
  try {
    const marcas = await prisma.marca.findMany({
      orderBy: { nombre: 'asc' }
    });
    return NextResponse.json({ ok: true, marcas });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso para crear marcas" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const marca = await prisma.marca.create({
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        logo_url: body.logo_url
      }
    });
    return NextResponse.json({ ok: true, marca }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}