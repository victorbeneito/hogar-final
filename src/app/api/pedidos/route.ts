import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ======================================================================
// GET: LISTAR PEDIDOS
// ======================================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");

    console.log(`🔍 [GET Pedidos] Buscando para ClienteID: ${clienteId || "TODOS"}`);

    const whereClause = clienteId ? { clienteId: parseInt(clienteId) } : {};

    const pedidosRaw = await prisma.pedido.findMany({
      where: whereClause,
      include: { 
        PedidoProducto: true, 
        Cliente: true         
      }, 
     orderBy: { fechaPedido: 'desc' }, // 🔥 IMPORTANTE: Ordenar por fecha creación
    });

    const pedidosFormateados = pedidosRaw.map((p: any) => ({
      id: p.id,
      numeroPedido: p.numeroPedido,
      pagoMetodo: p.pagoMetodo,
      envioMetodo: p.envioMetodo,
      envioCoste: Number(p.envioCoste),
      totalFinal: parseFloat(p.totalFinal),
      estado: p.estado,
      fecha: p.fechaPedido ? p.fechaPedido.toISOString() : p.createdAt.toISOString(),
      fechaPedido: p.fechaPedido ? p.fechaPedido.toISOString() : null,
      
      // Datos cliente
      nombre: p.nombre,
      cliente: {
        nombre: p.nombre || p.Cliente?.nombre || "Cliente Visitante",
        email: p.email || p.Cliente?.email || "Sin email"
      },
      
      // Productos
      productos: p.PedidoProducto.map((prod: any) => ({
        nombre: prod.nombreProducto || prod.nombre,
        cantidad: prod.cantidad,
        precioUnitario: Number(prod.precioUnitario),
        subtotal: Number(prod.subtotal),
      })),
    }));

    return NextResponse.json({ pedidos: pedidosFormateados });

  } catch (error: any) {
    console.error("❌ Error GET Pedidos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ======================================================================
// POST: CREAR PEDIDO (CON LOGS DE DEPURACIÓN)
// ======================================================================
export async function POST(req: Request) {
  console.log("🚨 --- INICIO PROCESO DE PEDIDO ---");
  
  try {
    const body = await req.json();
    console.log("📦 Body recibido:", JSON.stringify(body, null, 2));

    let clienteId: number | null = null;
    const datosCliente = body.cliente || {};

    // 1. Intentar vincular cliente
    if (datosCliente.email) {
      const c = await prisma.cliente.findUnique({ where: { email: datosCliente.email } });
      if (c) {
          clienteId = c.id;
          console.log("✅ Cliente encontrado por email:", c.email, "ID:", c.id);
      }
    }
    
    if (!clienteId && body.clienteId) {
        clienteId = parseInt(body.clienteId);
        console.log("✅ Cliente encontrado por ID directo:", clienteId);
    }
    
    // Fallback de seguridad (SOLO PARA PRUEBAS, QUITAR EN PRODUCCIÓN)
    if (!clienteId) {
        console.warn("⚠️ NO SE ENCONTRÓ CLIENTE. Asignando al primer cliente de la BD (Fallback).");
        const firstClient = await prisma.cliente.findFirst();
        if (firstClient) clienteId = firstClient.id;
        else {
             console.error("❌ ERROR CRÍTICO: No hay ningún cliente en la base de datos.");
             return NextResponse.json({ error: "No hay clientes en la BD" }, { status: 400 });
        }
    }

    // 2. Preparar productos
    const listaItems = body.carrito || body.productos || body.items || [];
    if (listaItems.length === 0) {
        console.error("❌ ERROR: El carrito está vacío.");
        return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }

    const productosParaInsertar = listaItems.map((p: any) => ({
      nombre: p.nombre,
      cantidad: p.cantidad,
      precioUnitario: parseFloat(p.precioFinal ?? p.precio),
      subtotal: (parseFloat(p.precioFinal ?? p.precio)) * p.cantidad,
      // Si tu esquema requiere productoId, añádelo aquí:
      productoIdRef: p.id // Asegúrate de que esto coincide con tu schema
    }));

    // 3. Ejecutar Transacción
    console.log("💾 Iniciando transacción en Prisma...");
    
    const result = await prisma.$transaction(async (tx: any) => {
      // Generar numeroPedido
      const anio = new Date().getFullYear();
      const prefijo = `PED-${anio}-`;
      const ultimo = await tx.pedido.findFirst({
        where: { numeroPedido: { startsWith: prefijo } },
        orderBy: { id: 'desc' }
      });
      
      let sec = 1;
      if (ultimo && ultimo.numeroPedido) {
        const partes = ultimo.numeroPedido.split('-');
        if (partes.length === 3) sec = parseInt(partes[2]) + 1;
      }
      const numeroGenerado = `${prefijo}${sec.toString().padStart(4, '0')}`;
      
      console.log("🔢 Número de pedido generado:", numeroGenerado);

      // Crear
      const pedido = await tx.pedido.create({
        data: {
          numeroPedido: numeroGenerado,
          clienteId: clienteId!,
          nombre: datosCliente.nombre || "Cliente Sin Nombre",
          email: datosCliente.email,
          telefono: datosCliente.telefono,
          direccion: datosCliente.direccion,
          ciudad: datosCliente.ciudad,
          cp: datosCliente.cp,
          
          envioMetodo: String(body.metodoEnvio?.metodo || body.envioMetodo?.metodo || "estándar"),
          envioCoste: parseFloat(String(body.metodoEnvio?.coste || body.envioMetodo?.coste || 0)),
          pagoMetodo: String(body.metodoPago?.metodo || body.pagoMetodo?.metodo || "tarjeta"),
          
          subtotal: parseFloat(body.subtotal || 0),
          descuento: parseFloat(body.descuento || 0),
          totalFinal: parseFloat(body.totalFinal || 0),
          estado: "PENDIENTE",
          
          fechaPedido: new Date(), 
          updatedAt: new Date(), // 🔥 Importante para que no salga null
          
          PedidoProducto: {
            create: productosParaInsertar
          }
        },
        include: { PedidoProducto: true }
      });

      return pedido;
    });

    console.log("✨ ¡ÉXITO! Pedido guardado con ID:", result.id);
    return NextResponse.json({ ok: true, pedido: result });

  } catch (error: any) {
    console.error("🔥 ERROR FATAL AL GUARDAR PEDIDO 🔥");
    console.error(error); // Esto imprimirá el error exacto de Prisma en la terminal
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }
}
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export const dynamic = "force-dynamic";

// // ----------------------------------------------------------------------
// // POST: Crear un nuevo Pedido
// // ----------------------------------------------------------------------
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     console.log("📦 [MariaDB] Creando pedido...");

//     // 1. Identificar Cliente
//     let clienteId: number | null = null;
//     const datosCliente = body.cliente || {};

//     if (datosCliente.email) {
//       const clienteExiste = await prisma.cliente.findUnique({
//         where: { email: datosCliente.email },
//       });
//       if (clienteExiste) clienteId = clienteExiste.id;
//     }

//     if (!clienteId && body.clienteId) {
//       const idParsed = parseInt(body.clienteId);
//       if (!isNaN(idParsed)) clienteId = idParsed;
//     }

//     if (!clienteId) clienteId = 1; 

//     // 2. Preparar Strings de Envío/Pago
//     let envioNombre = "Estándar";
//     let envioCoste = 0;

//     if (body.envioMetodo && typeof body.envioMetodo === 'object') {
//         envioNombre = body.envioMetodo.metodo || "Estándar";
//         envioCoste = parseFloat(body.envioMetodo.coste || 0);
//     } else {
//         envioNombre = String(body.envioMetodo || body.envio?.metodo || "Estándar");
//         envioCoste = parseFloat(body.envioCoste || body.envio?.coste || 0);
//     }

//     let pagoNombre = "Tarjeta";
//     if (body.pagoMetodo && typeof body.pagoMetodo === 'object') {
//         pagoNombre = body.pagoMetodo.metodo || "Tarjeta";
//     } else {
//         pagoNombre = String(body.pagoMetodo || body.pago?.metodo || "Tarjeta");
//     }

//     // 3. Preparar productos
//     const productosParaInsertar = (body.carrito || body.productos || []).map((p: any) => ({
//       nombre: p.nombre,
//       cantidad: p.cantidad,
//       precioUnitario: parseFloat(p.precioFinal ?? p.precio),
//       subtotal: (p.precioFinal ?? p.precio) * p.cantidad,
//     }));

//     // --------------------------------------------------------------
//     // 3.5 CALCULAR NÚMERO DE PEDIDO (Formato PED-2026-0001)
//     // --------------------------------------------------------------
//     const fechaActual = new Date();
//     const anioActual = fechaActual.getFullYear();
//     const prefijo = `PED-${anioActual}-`;

//     // Buscamos el último pedido creado este año
//     const ultimoPedido = await prisma.pedido.findFirst({
//       where: {
//         numeroPedido: {
//           startsWith: prefijo // Que empiece por PED-2026-
//         }
//       },
//       orderBy: {
//         id: 'desc' // Ordenamos para coger el último
//       }
//     });

//     let secuencia = 1; // Si no hay ninguno, empezamos por el 1

//     if (ultimoPedido) {
//       // El formato es PED-2026-XXXX. Partimos por guiones.
//       const partes = ultimoPedido.numeroPedido.split('-'); 
//       // partes[0]="PED", partes[1]="2026", partes[2]="0001"
      
//       if (partes.length === 3) {
//         const ultimoNumero = parseInt(partes[2]);
//         if (!isNaN(ultimoNumero)) {
//           secuencia = ultimoNumero + 1;
//         }
//       }
//     }

//     // Rellenamos con ceros a la izquierda (1 -> 0001, 15 -> 0015)
//     const numeroPedidoGenerado = `${prefijo}${secuencia.toString().padStart(4, '0')}`;
//     // --------------------------------------------------------------


//     // 4. Crear el Pedido
//     const nuevoPedido = await prisma.pedido.create({
//       data: {

       
//         numeroPedido: numeroPedidoGenerado, // <--- AQUÍ USAMOS EL NUEVO NÚMERO
//         clienteId: clienteId,
        
//         nombre: datosCliente.nombre || "Cliente",
//         email: datosCliente.email || "no-email@tienda.com",
//         telefono: datosCliente.telefono,
//         direccion: datosCliente.direccion,
//         ciudad: datosCliente.ciudad,
//         cp: datosCliente.cp || datosCliente.codigoPostal,

//         envioMetodo: envioNombre,
//         envioCoste: envioCoste,
//         pagoMetodo: pagoNombre,
        
//         subtotal: parseFloat(body.subtotal || 0),
//         descuento: parseFloat(body.descuento || body.cuponDescuento || 0),
//         totalFinal: parseFloat(body.totalFinal || 0),
        
//         estado: body.estado || "PENDIENTE",
        
//         cuponCodigo: body.cuponCodigo || body.cupon?.codigo || null,
//         cuponDescuento: parseFloat(body.descuento || body.cupon?.descuento || 0),

//         PedidoProducto: {
//           create: productosParaInsertar
//         }
//       },
//       include: {
//         PedidoProducto: true, 
//       }
//     });

//     return NextResponse.json({
//       ok: true,
//       message: "Pedido creado correctamente ✅",
//       pedido: nuevoPedido,
//     });

//   } catch (error: any) {
//     console.error("❌ Error al crear pedido:", error);
//     return NextResponse.json(
//       { ok: false, error: "Error al crear pedido", detalle: error.message },
//       { status: 500 }
//     );
//   }
// }

// // ----------------------------------------------------------------------
// // GET: Obtener pedidos de un cliente
// // ----------------------------------------------------------------------
// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const clienteId = searchParams.get("clienteId");

//     if (!clienteId) {
//       return NextResponse.json({ error: "Falta clienteId" }, { status: 400 });
//     }

//     const pedidosRaw = await prisma.pedido.findMany({
//       where: {
//         clienteId: parseInt(clienteId),
//       },
//       include: {
//         PedidoProducto: true, 
//       },
//       // 👇 CORREGIDO: Ordenamos por ID (el más alto primero)
//       orderBy: {
//         id: 'desc', 
//       },
//     });

//     // --- TRADUCTOR ---
//     const pedidosFormateados = pedidosRaw.map((p:any) => ({
//       ...p,
//       // Si en tu BD se llama 'fechaPedido', lo usamos. Si no, updatedAt.
//       createdAt: p.fechaPedido || p.updatedAt, 
//       productos: p.PedidoProducto.map((prod: any) => ({
//         nombre: prod.nombre,
//         cantidad: prod.cantidad,
//         precioUnitario: Number(prod.precioUnitario),
//         subtotal: Number(prod.subtotal),
//       })),
//       PedidoProducto: undefined, 
//     }));

//     return NextResponse.json({ pedidos: pedidosFormateados });

//   } catch (error: any) {
//     console.error("❌ Error obteniendo pedidos:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// // ----------------------------------------------------------------------
// // POST: Crear un nuevo Pedido
// // ----------------------------------------------------------------------
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     console.log("📦 [MariaDB] Creando pedido. Datos recibidos...");

//     // 1. Validar e identificar al Cliente
//     let clienteId: number | null = null;
//     const datosCliente = body.cliente || {};

//     // Estrategia A: Buscar por email
//     if (datosCliente.email) {
//       const clienteExiste = await prisma.cliente.findUnique({
//         where: { email: datosCliente.email },
//       });
//       if (clienteExiste) clienteId = clienteExiste.id;
//     }

//     // Estrategia B: Buscar por ID explícito
//     if (!clienteId && body.clienteId) {
//       const idParsed = parseInt(body.clienteId);
//       if (!isNaN(idParsed)) clienteId = idParsed;
//     }

//     if (!clienteId) {
//       // Si permites compra como invitado, puedes quitar este return y dejar clienteId en null
//       // return NextResponse.json(
//       //   { ok: false, error: "No se pudo identificar al cliente. Por favor, inicia sesión." },
//       //   { status: 400 }
//       // );
//       // Opción B: Asignar a un "Cliente Invitado" genérico si tienes uno creado (ej: ID 1)
//       clienteId = 1; 
//     }

//     // 2. CORRECCIÓN DE OBJETOS A STRING (Envío y Pago)
//     let envioNombre = "Estándar";
//     let envioCoste = 0;

//     if (body.envioMetodo && typeof body.envioMetodo === 'object') {
//         envioNombre = body.envioMetodo.metodo || "Estándar";
//         envioCoste = parseFloat(body.envioMetodo.coste || 0);
//     } else {
//         envioNombre = String(body.envioMetodo || body.envio?.metodo || "Estándar");
//         envioCoste = parseFloat(body.envioCoste || body.envio?.coste || 0);
//     }

//     let pagoNombre = "Tarjeta";
//     if (body.pagoMetodo && typeof body.pagoMetodo === 'object') {
//         pagoNombre = body.pagoMetodo.metodo || "Tarjeta";
//     } else {
//         pagoNombre = String(body.pagoMetodo || body.pago?.metodo || "Tarjeta");
//     }

//     // 3. Preparar productos
//     const productosParaInsertar = (body.carrito || body.productos || []).map((p: any) => ({
//       nombre: p.nombre,
//       cantidad: p.cantidad,
//       precioUnitario: parseFloat(p.precioFinal ?? p.precio),
//       subtotal: (p.precioFinal ?? p.precio) * p.cantidad,
//     }));

//     // 4. Crear el Pedido
//     const nuevoPedido = await prisma.pedido.create({
//       data: {
//         numeroPedido: `PED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
//         clienteId: clienteId,
        
//         // Datos de cliente snapshot
//         nombre: datosCliente.nombre || "Cliente",
//         email: datosCliente.email,
//         telefono: datosCliente.telefono,
//         direccion: datosCliente.direccion,
//         ciudad: datosCliente.ciudad,
//         cp: datosCliente.cp || datosCliente.codigoPostal,

//         // Datos limpios
//         envioMetodo: envioNombre,
//         envioCoste: envioCoste,
//         pagoMetodo: pagoNombre,
        
//         // Totales
//         subtotal: parseFloat(body.subtotal || 0),
//         descuento: parseFloat(body.descuento || body.cuponDescuento || 0),
//         totalFinal: parseFloat(body.totalFinal || 0), // Aseguramos que no sea NaN
        
//         estado: body.estado || "PENDIENTE", // Forzamos mayúsculas si es necesario
        
//         cuponCodigo: body.cuponCodigo || body.cupon?.codigo || null,
//         cuponDescuento: parseFloat(body.descuento || body.cupon?.descuento || 0),

//         productos: {
//           create: productosParaInsertar
//         }
//       },
//       include: {
//         productos: true,
//       }
//     });

//     console.log("✅ Pedido creado ID:", nuevoPedido.id);

//     return NextResponse.json({
//       ok: true,
//       message: "Pedido creado correctamente ✅",
//       pedido: nuevoPedido,
//     });

//   } catch (error: any) {
//     console.error("❌ Error al crear pedido:", error);
//     return NextResponse.json(
//       { ok: false, error: "Error al crear pedido", detalle: error.message },
//       { status: 500 }
//     );
//   }
// }

// // ----------------------------------------------------------------------
// // GET: Listar Pedidos
// // ----------------------------------------------------------------------
// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const clienteIdParam = searchParams.get("clienteId");

//     const whereClause: any = {};
    
//     if (clienteIdParam) {
//       const parsedId = parseInt(clienteIdParam);
//       if (!isNaN(parsedId)) {
//         whereClause.clienteId = parsedId;
//       }
//     }

//     const pedidos = await prisma.pedido.findMany({
//       where: whereClause,
//       include: {
//         // CORREGIDO: 'Cliente' con mayúscula (como en tu schema)
//         Cliente: {
//           select: {
//             nombre: true,
//             email: true
//           }
//         },
//         // CORREGIDO: 'PedidoProducto' (como en tu schema, no 'productos')
//         PedidoProducto: true,
//       },
//       orderBy: {
//         id: 'desc', 
//       },
//     });

//     return NextResponse.json({ ok: true, pedidos });

//   } catch (error: any) {
//     console.error("❌ Error al listar pedidos:", error);
//     return NextResponse.json(
//       { ok: false, error: "Error al obtener pedidos", detalle: error.message },
//       { status: 500 }
//     );
//   }
// }