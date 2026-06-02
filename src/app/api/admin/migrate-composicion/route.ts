import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    // Crear el campo composicion en la tabla producto si no existe
    await prisma.$executeRawUnsafe(
      `ALTER TABLE producto ADD COLUMN composicion LONGTEXT NULL AFTER etiquetas`
    );

    return NextResponse.json({
      ok: true,
      message: "Campo composicion creado exitosamente en la tabla producto"
    });
  } catch (err: any) {
    // Si el campo ya existe, no es un error
    if (err.message?.includes("Duplicate column name")) {
      return NextResponse.json({
        ok: true,
        message: "El campo composicion ya existe"
      });
    }

    console.error("Error en migración:", err);
    return NextResponse.json({
      ok: false,
      error: err.message || "Error al crear el campo"
    }, { status: 500 });
  }
}
