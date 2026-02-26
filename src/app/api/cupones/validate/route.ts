import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { codigo, subtotal } = await req.json(); // Ahora recibimos también subtotal para calcular el descuento real

    if (!codigo) return NextResponse.json({ error: "Código requerido" }, { status: 400 });

    const upperCode = codigo.toUpperCase().trim();

    // 1. Buscar el cupón (sin filtrar por clienteId porque ya no existe esa columna en Cupon)
    const cupon = await prisma.cupon.findUnique({
      where: { codigo: upperCode }
    });

    // 2. Validaciones básicas
    if (!cupon) {
      return NextResponse.json({ valid: false, error: "Cupón no existe" }, { status: 404 });
    }

    if (!cupon.activo) {
      return NextResponse.json({ valid: false, error: "Este cupón está desactivado" }, { status: 400 });
    }

    const ahora = new Date();
    if (ahora < cupon.fechaInicio) {
      return NextResponse.json({ valid: false, error: "El cupón aún no está activo" }, { status: 400 });
    }
    
    // Cambio: fechaExpiracion -> fechaFin
    if (ahora > cupon.fechaFin) {
      return NextResponse.json({ valid: false, error: "El cupón ha caducado" }, { status: 400 });
    }

    // Cambio: usado (bool) -> cantidadUsada vs cantidadTotal
    if (cupon.cantidadUsada >= cupon.cantidadTotal) {
      return NextResponse.json({ valid: false, error: "Se han agotado todos los cupones disponibles" }, { status: 400 });
    }

    // 3. Validación por usuario (Si hay token)
    // Intentamos leer el usuario del token, pero si no hay token, permitimos validar (para usuarios invitados)
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.SECRETO_JWT_CLIENTE!);
        const userId = parseInt(decoded.id);

        // Buscamos si este usuario ya lo ha usado
        const usoCliente = await prisma.cuponUso.findUnique({
  where: {
    // 👇 Prisma requiere el nombre de la clave compuesta
    cuponId_clienteId: {
       cuponId: cupon.id,
       clienteId: userId
    }
  }
});

        // Verificamos límite por usuario
        if (usoCliente && usoCliente.veces >= cupon.limitePorUsuario) {
          return NextResponse.json({ valid: false, error: `Ya has usado este cupón el máximo de veces (${cupon.limitePorUsuario})` }, { status: 400 });
        }
      } catch (e) {
        // Si el token es inválido, ignoramos la comprobación de usuario específico
        // o devolvemos error si quieres ser estricto.
      }
    }

    // 4. Calcular el descuento real (para mostrarlo en el frontend)
    // Cambio: descuento -> valorDescuento y tipoDescuento
    let descuentoCalculado = 0;
    if (cupon.tipoDescuento === 'PORCENTAJE') {
      descuentoCalculado = (subtotal * cupon.valorDescuento) / 100;
    } else {
      descuentoCalculado = cupon.valorDescuento;
    }
    
    // Limitar que el descuento no supere el total
    if (descuentoCalculado > subtotal) descuentoCalculado = subtotal;

    // ✅ Todo correcto
    return NextResponse.json({
      valid: true,
      codigo: cupon.codigo,
      tipo: cupon.tipoDescuento,       // Nuevo campo
      valor: cupon.valorDescuento,     // Nuevo campo
      descuentoCalculado: descuentoCalculado, // Importe exacto a restar
      descripcion: `Descuento de ${cupon.valorDescuento}${cupon.tipoDescuento === 'PORCENTAJE' ? '%' : '€'}`,
    });

  } catch (error) {
    console.error("❌ Error validar cupón:", error);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
