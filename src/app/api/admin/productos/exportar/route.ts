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
    const productos = await prisma.producto.findMany({
      select: {
        id: true,
        referencia: true,
        nombre: true,
        resumen: true,
        descripcion: true,
        descripcion_html: true,
        composicion: true,
        precio: true,
        precioOferta: true,
        precioCoste: true,
        stock: true,
        stockMinimo: true,
        activo: true,
        destacado: true,
        enOferta: true,
        slug: true,
        metaTitulo: true,
        metaDescripcion: true,
        reglaimpuesto: { select: { nombre: true, porcentaje: true } },
        marca: { select: { nombre: true } },
        productocategoria: {
          select: {
            categoria: { select: { nombre: true } },
            esPrincipal: true,
          },
        },
        productoimagen: {
          select: { url: true, orden: true },
          orderBy: { orden: "asc" as const },
        },
      },
      orderBy: { id: "asc" as const },
    });

    const rows = productos.map((p) => {
      const ivaFactor = p.reglaimpuesto
        ? 1 + p.reglaimpuesto.porcentaje / 100
        : 1.21;
      const precioConIva = p.precio * ivaFactor;
      const precioOfertaConIva = p.precioOferta
        ? p.precioOferta * ivaFactor
        : null;

      const categorias = p.productocategoria
        .map((pc) => pc.categoria.nombre)
        .join("|");
      const categoria = p.productocategoria.find((pc) => pc.esPrincipal)
        ?.categoria.nombre || categorias.split("|")[0] || "";

      const imagenes = p.productoimagen.map((img) => img.url).join("|");

      return {
        accion: "upsert",
        referencia: p.referencia || "",
        nombre: p.nombre,
        descripcion: p.descripcion || "",
        descripcion_html: p.descripcion_html || "",
        composicion: p.composicion || "",
        precio: precioConIva.toFixed(2),
        precioOferta: precioOfertaConIva
          ? precioOfertaConIva.toFixed(2)
          : "",
        precioCoste: p.precioCoste ? p.precioCoste.toFixed(2) : "",
        reglaImpuesto: p.reglaimpuesto?.nombre || "IVA GENERAL",
        stock: String(p.stock),
        stockMinimo: String(p.stockMinimo),
        activo: p.activo ? "1" : "0",
        destacado: p.destacado ? "1" : "0",
        enOferta: p.enOferta ? "1" : "0",
        marca: p.marca?.nombre || "",
        categoria,
        categorias,
        imagenes,
        slug: p.slug || "",
        metaTitulo: p.metaTitulo || "",
        metaDescripcion: p.metaDescripcion || "",
      };
    });

    const csv = Papa.unparse(rows, { delimiter: ";" });
    const bom = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8;",
        "Content-Disposition":
          'attachment; filename="exportacion-productos.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Error al exportar" },
      { status: 500 }
    );
  }
}
