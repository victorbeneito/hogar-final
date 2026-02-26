import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// --- HELPER DE SEGURIDAD "LLAVE MAESTRA" CON LOGS ---
async function verificarPermisos(req: NextRequest, idSolicitado: number) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader && authHeader.split(" ")[1]?.replace(/"/g, ''); 

  if (!token) {
    console.log("⛔ DEBUG: No hay token en el header");
    return { autorizado: false, status: 401, error: "Token requerido" }; 
  }

  // Debug de variables
  const adminSecret = process.env.SECRETO_JWT_ADMIN;
  console.log("🔍 DEBUG ENV: SECRETO_JWT_ADMIN existe?", !!adminSecret);

  let decoded: any = null;

  // 1️⃣ INTENTO DIRECTO CON CLAVE DE ADMIN
  if (adminSecret) {
      try {
          decoded = jwt.verify(token, adminSecret);
          console.log("✅ DEBUG: Token abierto con CLAVE ADMIN. Acceso CONCEDIDO.");
          return { autorizado: true }; 
      } catch (e) {
          // Falló admin, seguimos...
      }
  }

  // 2️⃣ INTENTO CON OTRAS CLAVES
  const clientSecret = process.env.SECRETO_JWT_CLIENTE || process.env.JWT_SECRET || "secreto_super_seguro_tienda";
  try {
      decoded = jwt.verify(token, clientSecret);
      console.log("🔹 DEBUG: Token abierto con CLAVE CLIENTE/OTRA.");
  } catch (e) {
      console.log("⛔ DEBUG: Token no válido con ninguna clave.");
      return { autorizado: false, status: 403, error: "Token inválido" };
  }

  // Si llegamos aquí, validamos propiedad
  if (decoded && String(decoded.id) === String(idSolicitado)) {
      console.log("✅ DEBUG: El cliente modifica su propia cuenta. Acceso CONCEDIDO.");
      return { autorizado: true };
  }
  
  // Si tiene rol ADMIN dentro del token (aunque no usara la llave admin, por si acaso)
  if (decoded && decoded.role === "ADMIN") {
      console.log("✅ DEBUG: Rol ADMIN detectado en el payload.");
      return { autorizado: true };
  }

  console.log("⛔ DEBUG: Token válido pero permisos insuficientes.");
  return { autorizado: false, status: 403, error: "No autorizado" };
}

// --- GET (Ver cliente) ---
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    // Para ver un cliente desde el admin, a veces no queremos ser tan estrictos.
    // Si quieres seguridad total, descomenta la siguiente línea:
    // const permiso = await verificarPermisos(req, id);
    // if (!permiso.autorizado) return NextResponse.json({ error: permiso.error }, { status: 403 });

    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const { password: _, ...clienteSinPassword } = cliente;
    return NextResponse.json({ cliente: clienteSinPassword });

  } catch (error: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// --- PUT (Editar cliente) ---
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const permiso = await verificarPermisos(req, id);
    if (!permiso.autorizado) return NextResponse.json({ error: permiso.error }, { status: 403 });

    const body = await req.json();

    const datosParaActualizar: any = {
        nombre: body.nombre,
        apellidos: body.apellidos,
        email: body.email,
        telefono: body.telefono,
        direccion: body.direccion,
        ciudad: body.ciudad,
        provincia: body.provincia,
        pais: body.pais,
        codigoPostal: body.cp || body.codigoPostal,
        nif: body.nif || body.dni,
        empresa: body.empresa,
        updatedAt: new Date()
    };

    if (body.password && body.password.length > 0) {
      datosParaActualizar.password = await bcrypt.hash(body.password, 10);
    }

    Object.keys(datosParaActualizar).forEach(key => 
        (datosParaActualizar[key] === undefined || datosParaActualizar[key] === null) && delete datosParaActualizar[key]
    );

    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: datosParaActualizar,
    });

    const { password: _, ...clienteFinal } = clienteActualizado;

    return NextResponse.json({
      ok: true,
      message: "Cliente actualizado correctamente",
      cliente: clienteFinal,
    });

  } catch (error: any) {
    console.error("❌ Error PUT:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

// --- DELETE (Borrar cliente) ---
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    console.log(`🗑️ INTENTO BORRAR ID: ${id}`);

    const permiso = await verificarPermisos(req, id);
    if (!permiso.autorizado) {
        return NextResponse.json({ error: permiso.error }, { status: 403 });
    }

    // BORRADO MANUAL DE DEPENDENCIAS (Para evitar errores de FK)
    try {
        // Borrar productos de pedidos de este cliente
        // (Esto requiere buscar primero los pedidos)
        const pedidos = await prisma.pedido.findMany({ where: { clienteId: id }, select: { id: true }});
        const pedidoIds = pedidos.map(p => p.id);
        
        if (pedidoIds.length > 0) {
            await prisma.pedidoProducto.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
            await prisma.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
        }

        
        // Si tienes tabla de direcciones separada: await prisma.direccion.deleteMany(...)
    } catch(e) {
        console.log("⚠️ Error borrando dependencias (no crítico):", e);
    }

    // Borrado final del cliente
    await prisma.cliente.delete({ where: { id } });

    console.log("✨ CLIENTE BORRADO CORRECTAMENTE");
    return NextResponse.json({ ok: true, message: "Cliente eliminado" });

  } catch (error: any) {
    console.error("🔥 Error CRÍTICO DELETE:", error);
    return NextResponse.json({ error: "Error al eliminar: " + error.message }, { status: 500 });
  }
}