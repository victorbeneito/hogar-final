import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Genera slug a partir del nombre
function toSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { orden: "asc" },
      include: {
        other_categoria: {        // subcategorías hijas
          orderBy: { orden: "asc" },
        },
      },
    });
    return NextResponse.json({ ok: true, categorias });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, descripcion, imagen, activa, orden, parentId } = body;
    const ordenNumero = orden !== undefined ? Number(orden) : 0;
    const parentIdNumero = parentId !== undefined && parentId !== null && parentId !== "" ? Number(parentId) : null;

    if (!nombre) {
      return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });
    }

    // Slug único: si ya existe añade un sufijo numérico
    let slug = toSlug(nombre);
    const existe = await prisma.categoria.findUnique({ where: { slug } });
    if (existe) slug = `${slug}-${Date.now()}`;

    const categoria = await prisma.categoria.create({
      data: {
        nombre,
        slug,
        descripcion: descripcion ?? null,
        imagen:      imagen      ?? null,
        activa:      activa      ?? true,
        orden:       Number.isFinite(ordenNumero) ? ordenNumero : 0,
        parentId:    parentIdNumero,
      },
    });

    return NextResponse.json({ ok: true, categoria }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear categoría:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
