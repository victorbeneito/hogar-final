import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const { codigo } = await req.json();

    if (!codigo) {
      return NextResponse.json({ error: "Código es requerido" }, { status: 400 });
    }

    // Actualizar en MariaDB
    // Prisma lanza un error si el registro no existe en un .update(), 
    // por lo que usamos try/catch para manejar el 404.
    const cupon = await prisma.cupon.update({
  where: { 
    codigo: codigo.toUpperCase() 
  },
  data: { 
    cantidadUsada: { increment: 1 } // <--- INCREMENTAMOS EL CONTADOR
  }
});

    return NextResponse.json({ message: "Cupón marcado como usado", cupon });

  } catch (error: any) {
    console.error("❌ Error al marcar cupón usado:", error);

    // Código de error P2025 en Prisma significa "Record to update not found"
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}