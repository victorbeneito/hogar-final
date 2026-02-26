import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

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