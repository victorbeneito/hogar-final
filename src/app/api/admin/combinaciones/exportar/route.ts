import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/adminAuth";
import Papa from "papaparse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json(
      { ok: false, error: "Sin permiso para exportar" },
      { status: 403 }
    );
  }

  try {
    const variantes = await prisma.variante.findMany({
      select: {
        id: true,
        referencia: true,
        stock: true,
        precio_extra: true,
        imagen: true,
        imagenMuestra: true,
        imagenesVariante: true,
        color: true,
        tamano: true,
        tirador: true,
        producto: {
          select: {
            referencia: true,
          },
        },
        varianteatributo: {
          select: {
            atributovalor: {
              select: {
                id: true,
                valor: true,
              },
            },
          },
        },
      },
      orderBy: { productoId: "asc" as const },
    });

    const rows = variantes.map((v) => {
      const atributos = v.varianteatributo
        .map((va) => va.atributovalor.valor)
        .join("|");

      return {
        accion: "upsert",
        productoReferencia: v.producto.referencia || "",
        referencia: v.referencia || "",
        stock: String(v.stock),
        precio_extra: v.precio_extra
          ? v.precio_extra.toFixed(2)
          : "",
        imagen: v.imagen || "",
        imagenMuestra: v.imagenMuestra || "",
        imagenesVariante: v.imagenesVariante || "",
        color: v.color || "",
        tamano: v.tamano || "",
        tirador: v.tirador || "",
        atributos,
      };
    });

    const csv = Papa.unparse(rows, { delimiter: ";" });
    const bom = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8;",
        "Content-Disposition":
          'attachment; filename="exportacion-combinaciones.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Error al exportar" },
      { status: 500 }
    );
  }
}
