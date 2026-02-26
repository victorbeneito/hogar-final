import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    const body = await req.json();

    const marca = await prisma.marca.update({
      where: { id },
      data: body
    });
    
    return NextResponse.json({ ok: true, marca });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    
    await prisma.marca.delete({ where: { id } });
    
    return NextResponse.json({ ok: true, mensaje: 'Marca eliminada' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}