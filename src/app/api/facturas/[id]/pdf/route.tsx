import { NextRequest, NextResponse } from "next/server";
import { renderFacturaPdf } from "@/lib/facturaPdf";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const facturaId = parseInt(id, 10);
    if (isNaN(facturaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const pdf = await renderFacturaPdf(facturaId);
    if (!pdf) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    return new Response(new Uint8Array(pdf.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PDF] Error generando factura:", msg);
    return NextResponse.json(
      { error: msg || "Error generando PDF" },
      { status: 500 }
    );
  }
}
