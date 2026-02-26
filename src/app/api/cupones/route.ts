import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ============================================================================
// GET: Obtener cupones
// ============================================================================
export async function GET() {
  try {
    const cupones = await prisma.cupon.findMany({ orderBy: { id: 'desc' } });

    const cuponesTransformados = cupones.map((cupon: any) => {
      const inicio = cupon.fechaInicio ? new Date(cupon.fechaInicio) : new Date();
      const fin = cupon.fechaFin ? new Date(cupon.fechaFin) : new Date();

      return {
        id: cupon.id,
        codigo: cupon.codigo,
        // 🛠️ CORREGIDO: Comparamos con texto directo
        tipo_descuento: (cupon.tipoDescuento === 'PORCENTAJE') ? 'porcentaje' : 'fijo',
        valor_descuento: Number(cupon.valorDescuento || 0),
        cantidad_total: Number(cupon.cantidadTotal || 0),
        usos_consumidos: Number(cupon.cantidadUsada || 0),
        restantes: Number((cupon.cantidadTotal || 0) - (cupon.cantidadUsada || 0)),
        limite_usuario: Number(cupon.limitePorUsuario || 1),
        fecha_inicio: inicio.toISOString(),
        fecha_fin: fin.toISOString(),
        activo: cupon.activo ?? true
      };
    });

    return NextResponse.json(cuponesTransformados);
  } catch (error: any) {
    console.error("❌ ERROR GET CUPONES:", error);
    return NextResponse.json({ error: "Error interno", detalle: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Crear Cupón
// ============================================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📨 Recibiendo datos:", body); 

    // 1. TRADUCTOR DE CAMPOS
    const codigoRaw = body.codigo || body.code || "CUPON-SIN-CODIGO";
    const valor = parseFloat(body.valor_descuento || body.valorDescuento || body.valor || 0);
    const total = parseInt(body.cantidad_total || body.cantidadTotal || body.total || "100");
    const limite = parseInt(body.limite_usuario || body.limitePorUsuario || body.limite || "1");

    // 🛠️ CORREGIDO: Usamos 'any' y texto directo para evitar errores de tipo
    let tipoFinal: any = 'FIJO';
    
    const tipoRecibido = String(body.tipo_descuento || body.tipoDescuento || "").toLowerCase();
    
    if (tipoRecibido.includes('porcent')) {
      tipoFinal = 'PORCENTAJE';
    }

    // 2. PROTECCIÓN DE FECHAS
    let fInicio = new Date();
    if (body.fecha_inicio && body.fecha_inicio !== "") fInicio = new Date(body.fecha_inicio);
    else if (body.fechaInicio && body.fechaInicio !== "") fInicio = new Date(body.fechaInicio);

    let fFin = new Date();
    fFin.setFullYear(fFin.getFullYear() + 1); 
    if (body.fecha_fin && body.fecha_fin !== "") fFin = new Date(body.fecha_fin);
    else if (body.fechaFin && body.fechaFin !== "") fFin = new Date(body.fechaFin);

    // 3. GUARDAR EN BASE DE DATOS
    const nuevoCupon = await prisma.cupon.create({
      data: {
        codigo: codigoRaw.toUpperCase(),
        tipoDescuento: tipoFinal, // Ahora es un texto simple, Prisma lo entenderá
        valorDescuento: valor,
        cantidadTotal: total,
        cantidadUsada: 0,
        limitePorUsuario: limite,
        fechaInicio: fInicio,
        fechaFin: fFin,
        activo: true,
        updatedAt: new Date(), 
      }
    });

    console.log("✅ ¡Cupón creado con éxito!", nuevoCupon.id);
    return NextResponse.json(nuevoCupon);

  } catch (error: any) {
    console.error("❌ ERROR CREANDO CUPÓN:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Borrar
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.cupon.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "OK" });
  } catch (error) {
    return NextResponse.json({ error: "Error borrando" }, { status: 500 });
  }
}