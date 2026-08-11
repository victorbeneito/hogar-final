import { NextResponse, NextRequest } from "next/server";
import { buildPedidoUrl } from "@/lib/pedidoUrl";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sendTemplateEmail, sendRawEmail, buildAdminOrderEmail, loadEmailSettings } from "@/lib/emailService";
import { canEdit } from "@/lib/adminAuth";
import { calcularTotalesPedido, ErrorCalculoPedido, type TotalesPedido } from "@/lib/checkoutPricing";
import { getBaseUrl } from "@/lib/urls";
import { idsProductosSinControlDeStock } from "@/lib/stock";

async function getEstadoInicialPorMetodo(metodoPago: string, tx: any): Promise<{ nombre: string; color: string; clave: string }> {
  const metodo = (metodoPago || "").toLowerCase().trim();

  let patrones: string[] = [];
  switch (metodo) {
    case "transferencia":
      patrones = ["transferencia", "espera"];
      break;
    case "bizum":
      patrones = ["bizum"];
      break;
    case "contrareembolso":
      patrones = ["preparaci", "contrareembolso"];
      break;
    case "tarjeta":
    case "paypal":
    default:
      patrones = ["pendiente"];
      break;
  }

  // Buscar el estado por patrón (sin case-sensitivity)
  const estadosActivos = await tx.estadopedido.findMany({
    where: { activo: true },
    select: { nombre: true, color: true, clave: true },
    orderBy: { orden: "asc" },
  });

  for (const patron of patrones) {
    const estado = estadosActivos.find((e: any) =>
      e.nombre.toLowerCase().includes(patron.toLowerCase())
    );
    if (estado) return estado;
  }

  // Si no encuentra por patrón, retornar estado por defecto
  const estadoDefault = estadosActivos.find((e: any) =>
    e.nombre.toLowerCase().includes("pendiente")
  );

  return estadoDefault || { nombre: "PENDIENTE", color: "#6b7280", clave: "PENDIENTE" };
}

export const dynamic = "force-dynamic";

function buildBillingSnapshot(datosCliente: any = {}) {
  return {
    facturacionNombre: datosCliente.facturacion?.nombre ?? datosCliente.nombre ?? null,
    facturacionApellidos: datosCliente.facturacion?.apellidos ?? datosCliente.apellidos ?? null,
    facturacionEmpresa: datosCliente.facturacion?.empresa ?? datosCliente.empresa ?? null,
    facturacionNif: datosCliente.facturacion?.nif ?? datosCliente.nif ?? null,
    facturacionTelefono: datosCliente.facturacion?.telefono ?? datosCliente.telefono ?? null,
    facturacionDireccion: datosCliente.facturacion?.direccion ?? datosCliente.direccion ?? null,
    facturacionDireccionComplementaria:
      datosCliente.facturacion?.direccionComplementaria ?? datosCliente.direccionComplementaria ?? null,
    facturacionCodigoPostal:
      datosCliente.facturacion?.codigoPostal ?? datosCliente.cp ?? datosCliente.codigoPostal ?? null,
    facturacionCiudad: datosCliente.facturacion?.ciudad ?? datosCliente.ciudad ?? null,
    facturacionProvincia: datosCliente.facturacion?.provincia ?? datosCliente.provincia ?? null,
    facturacionPais: datosCliente.facturacion?.pais ?? datosCliente.pais ?? "España",
  };
}

// ======================================================================
// GET: LISTAR PEDIDOS
// ======================================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");
    const id = searchParams.get("id");
    const origen = searchParams.get("origen")?.trim();
    const referencia = searchParams.get("referencia")?.trim();
    const cliente = searchParams.get("cliente")?.trim();
    const estado = searchParams.get("estado")?.trim();
    const estadoPago = searchParams.get("estadoPago")?.trim();
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const sortBy = searchParams.get("sortBy") || "fechaPedido";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
    const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const prestashopImportMarker = "[Importado de Prestashop]";

    console.log(`🔍 [GET Pedidos] Buscando para ClienteID: ${clienteId || "TODOS"}`);

    const whereClause: any = {};
    if (clienteId && !Number.isNaN(parseInt(clienteId, 10))) {
      whereClause.clienteId = parseInt(clienteId, 10);
    }
    if (id && !Number.isNaN(parseInt(id, 10))) {
      whereClause.id = parseInt(id, 10);
    }
    if (estado) whereClause.estado = estado;
    if (estadoPago) whereClause.estadoPago = estadoPago;
    if (cliente) {
      whereClause.OR = [
        { nombre: { contains: cliente } },
        { apellidos: { contains: cliente } },
        { email: { contains: cliente } },
        { numeroPedido: { contains: cliente } },
        { transportistaNombre: { contains: cliente } },
      ];
    }
    if (referencia) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { numeroPedido: { contains: referencia } },
            { nombre: { contains: referencia } },
            { email: { contains: referencia } },
            { transportistaNombre: { contains: referencia } },
          ],
        },
      ];
    }
    if (fechaDesde || fechaHasta) {
      whereClause.fechaPedido = {};
      if (fechaDesde) whereClause.fechaPedido.gte = new Date(fechaDesde);
      if (fechaHasta) whereClause.fechaPedido.lte = new Date(fechaHasta);
    }

    const appendAndFilter = (condition: any) => {
      whereClause.AND = [...(whereClause.AND || []), condition];
    };

    if (origen === "prestashop") {
      appendAndFilter({ notas: { contains: prestashopImportMarker } });
    } else if (origen === "actuales") {
      appendAndFilter({
        OR: [
          { notas: null },
          { NOT: { notas: { contains: prestashopImportMarker } } },
        ],
      });
    }

    const orderMap: Record<string, any> = {
      id: { id: sortDir },
      numeroPedido: { numeroPedido: sortDir },
      totalFinal: { totalFinal: sortDir },
      estado: { estado: sortDir },
      estadoPago: { estadoPago: sortDir },
      fechaPedido: { fechaPedido: sortDir },
    };

    const pedidosRaw = await prisma.pedido.findMany({
      where: whereClause,
      select: {
        id: true,
        numeroPedido: true,
        clienteId: true,
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        nif: true,
        direccion: true,
        direccionComplementaria: true,
        ciudad: true,
        provincia: true,
        cp: true,
        pais: true,
        facturacionNombre: true,
        facturacionApellidos: true,
        facturacionEmpresa: true,
        facturacionNif: true,
        facturacionTelefono: true,
        facturacionDireccion: true,
        facturacionDireccionComplementaria: true,
        facturacionCodigoPostal: true,
        facturacionCiudad: true,
        facturacionProvincia: true,
        facturacionPais: true,
        envioMetodo: true,
        envioCoste: true,
        transportistaNombre: true,
        numeroSeguimiento: true,
        trackingUrl: true,
        fechaEnvio: true,
        fechaEntrega: true,
        pagoMetodo: true,
        pagoRecargo: true,
        estadoPago: true,
        subtotal: true,
        descuento: true,
        totalFinal: true,
        estado: true,
        cuponCodigo: true,
        cuponDescuento: true,
        notas: true,
        fechaPedido: true,
        updatedAt: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            telefono: true,
            empresa: true,
            nif: true,
            direccion: true,
            direccionComplementaria: true,
            codigoPostal: true,
            ciudad: true,
            provincia: true,
            pais: true,
          },
        },
        pedidoproducto: {
          select: {
            id: true,
            productoIdRef: true,
            varianteIdRef: true,
            nombre: true,
            varianteInfo: true,
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
          },
        },
        factura: {
          select: { id: true, numeroFactura: true, fechaFactura: true, total: true },
        },
      },
      orderBy: orderMap[sortBy] || { fechaPedido: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.pedido.count({ where: whereClause });

    // Cargar config de estados para resolver color y nombre correctamente
    const allEstados = await prisma.estadopedido.findMany({
      select: { clave: true, nombre: true, color: true },
    });
    const estadoByKey = new Map<string, { nombre: string; color: string }>();
    for (const e of allEstados) {
      estadoByKey.set(e.clave.toLowerCase(), { nombre: e.nombre, color: e.color });
      estadoByKey.set(e.nombre.toLowerCase(), { nombre: e.nombre, color: e.color });
    }

    const pedidosFormateados = pedidosRaw.map((p: any) => {
      const configMatch = estadoByKey.get((p.estado || "").toLowerCase());
      const colorEstado = configMatch?.color || "#6b7280";
      const nombreEstado = configMatch?.nombre || p.estado || "";

      return {
        id: p.id,
        numeroPedido: p.numeroPedido,
        clienteId: p.clienteId,
        nombre: p.nombre,
        apellidos: p.apellidos,
        email: p.email,
        telefono: p.telefono,
        nif: p.nif,
        direccion: p.direccion,
        direccionComplementaria: p.direccionComplementaria,
        ciudad: p.ciudad,
        provincia: p.provincia,
        cp: p.cp,
        pais: p.pais,
        direccionEntrega: {
          nombre: p.nombre || p.cliente?.nombre || "",
          apellidos: p.apellidos || p.cliente?.apellidos || "",
          empresa: p.cliente?.empresa || "",
          nif: p.nif || "",
          telefono: p.telefono || "",
          direccion: p.direccion || "",
          direccionComplementaria: p.direccionComplementaria || "",
          codigoPostal: p.cp || "",
          ciudad: p.ciudad || "",
          provincia: p.provincia || "",
          pais: p.pais || "España",
        },
        direccionFacturacion: {
          nombre: p.facturacionNombre || p.nombre || "",
          apellidos: p.facturacionApellidos || p.apellidos || "",
          empresa: p.facturacionEmpresa || "",
          nif: p.facturacionNif || p.nif || "",
          telefono: p.facturacionTelefono || p.telefono || "",
          direccion: p.facturacionDireccion || p.direccion || "",
          direccionComplementaria: p.facturacionDireccionComplementaria || p.direccionComplementaria || "",
          codigoPostal: p.facturacionCodigoPostal || p.cp || "",
          ciudad: p.facturacionCiudad || p.ciudad || "",
          provincia: p.facturacionProvincia || p.provincia || "",
          pais: p.facturacionPais || p.pais || "España",
        },
        envioMetodo: p.envioMetodo,
        envioCoste: Number(p.envioCoste),
        transportistaNombre: p.transportistaNombre,
        numeroSeguimiento: p.numeroSeguimiento,
        trackingUrl: p.trackingUrl,
        fechaEnvio: p.fechaEnvio ? p.fechaEnvio.toISOString() : null,
        fechaEntrega: p.fechaEntrega ? p.fechaEntrega.toISOString() : null,
        pagoMetodo: p.pagoMetodo,
        pagoRecargo: Number(p.pagoRecargo),
        estadoPago: p.estadoPago,
        subtotal: Number(p.subtotal),
        descuento: Number(p.descuento),
        totalFinal: Number(p.totalFinal),
        estado: p.estado,
        colorEstado: colorEstado,
        nombreEstado: nombreEstado,
        cuponCodigo: p.cuponCodigo,
        cuponDescuento: p.cuponDescuento ? Number(p.cuponDescuento) : null,
        notas: p.notas,
        fechaPedido: p.fechaPedido ? p.fechaPedido.toISOString() : null,
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
        cliente: {
          id: p.cliente?.id,
          nombre: p.cliente?.nombre,
          apellidos: p.cliente?.apellidos,
          email: p.cliente?.email,
          telefono: p.cliente?.telefono,
          empresa: p.cliente?.empresa,
          nif: p.cliente?.nif,
          direccion: p.cliente?.direccion,
          direccionComplementaria: p.cliente?.direccionComplementaria,
          codigoPostal: p.cliente?.codigoPostal,
          ciudad: p.cliente?.ciudad,
          provincia: p.cliente?.provincia,
          pais: p.cliente?.pais,
        },
        productos: p.pedidoproducto.map((prod: any) => ({
          id: prod.id,
          productoIdRef: prod.productoIdRef,
          varianteIdRef: prod.varianteIdRef,
          nombre: prod.nombre,
          varianteInfo: prod.varianteInfo || null,
          cantidad: prod.cantidad,
          precioUnitario: Number(prod.precioUnitario),
          subtotal: Number(prod.subtotal),
        })),
        factura: p.factura
          ? { id: p.factura.id, numeroFactura: p.factura.numeroFactura, fechaFactura: p.factura.fechaFactura, total: p.factura.total }
          : null,
      };
    });

    return NextResponse.json({ pedidos: pedidosFormateados, total, page, limit });

  } catch (error: any) {
    console.error("❌ Error GET Pedidos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ======================================================================
// POST: CREAR PEDIDO (CON LOGS DE DEPURACIÓN)
// ======================================================================
export async function POST(req: Request) {
  // Solo admin y superadmin pueden crear pedidos desde el admin
  const nextReq = req as NextRequest;
  if (nextReq.headers.get("x-admin-create") && !canEdit(nextReq)) {
    return NextResponse.json({ ok: false, error: "No tienes permiso para crear pedidos" }, { status: 403 });
  }

  console.log("🚨 --- INICIO PROCESO DE PEDIDO ---");

  try {
    const body = await req.json();
    console.log("📦 Body recibido:", JSON.stringify(body, null, 2));
    const carritoSessionId = typeof body.carritoSessionId === "string" ? body.carritoSessionId.trim() : "";

    let clienteId: number | null = null;
    const datosCliente = body.cliente || {};
    // Compra como invitado: sin cuenta, identificado sólo por el email de contacto
    const esCompraInvitado = body.invitado === true;
    const emailCliente = typeof datosCliente.email === "string" ? datosCliente.email.trim().toLowerCase() : "";
    const cpCliente = datosCliente.codigoPostal || datosCliente.cp || "";

    // Validar que tenemos los datos mínimos
    if (!emailCliente && !body.clienteId) {
      console.error("❌ ERROR: No hay email ni clienteId proporcionados");
      return NextResponse.json({ error: "Datos de cliente incompletos" }, { status: 400 });
    }

    if (esCompraInvitado && !emailCliente) {
      return NextResponse.json({ error: "El email es obligatorio para comprar como invitado" }, { status: 400 });
    }

    // 1. Intentar vincular cliente
    let clienteExistenteEsInvitado = false;
    if (emailCliente) {
      const c = await prisma.cliente.findUnique({
        where: { email: emailCliente },
        select: { id: true, email: true, esInvitado: true },
      });
      if (c) {
          // Un invitado no puede colgar pedidos de una cuenta registrada ajena
          if (esCompraInvitado && !c.esInvitado) {
            console.warn("⛔ Compra como invitado con email de cuenta registrada:", c.email);
            return NextResponse.json(
              {
                error: "Ya existe una cuenta con este email. Inicia sesión para completar tu compra.",
                cuentaExistente: true,
              },
              { status: 409 }
            );
          }
          clienteId = c.id;
          clienteExistenteEsInvitado = c.esInvitado;
          console.log("✅ Cliente encontrado por email:", c.email, "ID:", c.id, c.esInvitado ? "(invitado)" : "");
      } else {
          console.warn("⚠️ No existe cliente con email:", emailCliente);
      }
    }

    if (!clienteId && !esCompraInvitado && body.clienteId) {
        clienteId = parseInt(body.clienteId);
        console.log("✅ Cliente encontrado por ID directo:", clienteId);
    }

    // 1.b Invitado: reutilizar su ficha si ya compró antes, o crearla ahora.
    // Se guarda con `esInvitado: true` y sin NIF (el campo es único en cliente
    // y el NIF real queda registrado en el propio pedido).
    if (esCompraInvitado) {
      const datosInvitado = {
        nombre: datosCliente.nombre || "Cliente",
        apellidos: datosCliente.apellidos || "",
        telefono: datosCliente.telefono || "",
        empresa: datosCliente.empresa || null,
        direccion: datosCliente.direccion || "",
        direccionComplementaria: datosCliente.direccionComplementaria || null,
        codigoPostal: cpCliente,
        ciudad: datosCliente.ciudad || "",
        provincia: datosCliente.provincia || "",
        pais: datosCliente.pais || "España",
        aceptaMarketing: Boolean(datosCliente.aceptaMarketing),
      };

      if (clienteId && clienteExistenteEsInvitado) {
        // Compra repetida del mismo invitado: refrescamos sus datos de envío
        await prisma.cliente.update({
          where: { id: clienteId },
          data: { ...datosInvitado, updatedAt: new Date() },
        });
        console.log("♻️ Ficha de invitado reutilizada y actualizada. ID:", clienteId);
      } else if (!clienteId) {
        const passwordAleatoria = `Inv${Math.random().toString(36).slice(2, 12)}!${Date.now().toString(36)}`;
        const nuevoInvitado = await prisma.cliente.create({
          data: {
            ...datosInvitado,
            email: emailCliente,
            password: await bcrypt.hash(passwordAleatoria, 10),
            esInvitado: true,
            role: "cliente",
            updatedAt: new Date(),
          },
          select: { id: true, email: true },
        });
        clienteId = nuevoInvitado.id;
        console.log("✅ Cliente invitado creado:", nuevoInvitado.email, "ID:", nuevoInvitado.id);
      }
    }

    if (!clienteId && body.origen === "admin-manual" && datosCliente.email) {
        const tempPassword = `Tmp${Math.random().toString(36).slice(2, 10)}!`;
        const nuevoCliente = await prisma.cliente.create({
          data: {
            nombre: datosCliente.nombre || "Cliente",
            apellidos: datosCliente.apellidos || "",
            email: datosCliente.email,
            password: await bcrypt.hash(tempPassword, 10),
            telefono: datosCliente.telefono || "",
            empresa: datosCliente.empresa || null,
            nif: datosCliente.nif || "",
            direccion: datosCliente.direccion || "",
            direccionComplementaria: datosCliente.direccionComplementaria || null,
            codigoPostal: datosCliente.codigoPostal || datosCliente.cp || "",
            ciudad: datosCliente.ciudad || "",
            provincia: datosCliente.provincia || "",
            pais: datosCliente.pais || "España",
            role: "cliente",
            updatedAt: new Date(),
          },
          select: { id: true, email: true },
        });
        clienteId = nuevoCliente.id;
        console.log("✅ Cliente creado automáticamente para pedido manual:", nuevoCliente.email, "ID:", nuevoCliente.id);
    }

    const carritoExistente = carritoSessionId
      ? await prisma.carritocompra.findFirst({
          where: { sessionId: carritoSessionId },
          select: { id: true },
        })
      : null;

    // VALIDACIÓN CRÍTICA: Si aún no hay clienteId, devolver error en lugar de usar fallback
    if (!clienteId) {
        console.error("❌ ERROR CRÍTICO: No se pudo identificar el cliente después de todos los intentos");
        console.error("   - Email enviado:", datosCliente.email);
        console.error("   - ID enviado:", body.clienteId);
        return NextResponse.json({ error: "No se pudo identificar el cliente. Por favor, inicia sesión." }, { status: 400 });
    }

    console.log("📌 Creando pedido para clienteId:", clienteId);

    // Capturar comentario del cliente antes de la transacción
    const comentarioCliente = body.notas || "";

    // 2. Preparar productos
    const listaItems = body.carrito || body.productos || body.items || [];
    if (listaItems.length === 0) {
        console.error("❌ ERROR: El carrito está vacío.");
        return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }

    // El carrito vive en localStorage: sus precios son manipulables desde el
    // navegador. Para pedidos de tienda recalculamos todos los importes contra
    // la BD. Los pedidos manuales del admin (ya protegidos por canEdit) sí
    // pueden llevar precios a medida, así que conservan el cálculo antiguo.
    const esPedidoManualAdmin = body.origen === "admin-manual";

    let totales: TotalesPedido | null = null;
    let productosParaInsertar;

    if (esPedidoManualAdmin) {
      productosParaInsertar = listaItems.map((p: any) => {
        // Construir varianteInfo desde los campos del carrito
        const partes: string[] = [];
        if (p.tamanoSeleccionado) partes.push(`Tamaño : ${p.tamanoSeleccionado}`);
        if (p.colorSeleccionado)  partes.push(`Color : ${p.colorSeleccionado}`);
        if (p.tiradorSeleccionado) partes.push(`Tirador : ${p.tiradorSeleccionado}`);
        const varianteInfo = p.varianteInfo ?? p.atributo ?? (partes.length > 0 ? partes.join("- ") : null);
        // Incluir la variante en el nombre para compatibilidad con datos históricos
        const nombreCompleto = partes.length > 0 ? `${p.nombre} - ${partes.join("- ")}` : p.nombre;
        return {
          nombre: nombreCompleto,
          cantidad: p.cantidad,
          precioUnitario: parseFloat(p.precioFinal ?? p.precio),
          subtotal: parseFloat(p.precioFinal ?? p.precio) * p.cantidad,
          productoIdRef: p.id,
          varianteIdRef: p.varianteId ?? null,
          varianteInfo,
        };
      });
    } else {
      try {
        totales = await calcularTotalesPedido({
          items: listaItems,
          direccion: {
            pais: datosCliente.pais || "España",
            provincia: datosCliente.provincia,
            codigoPostal: cpCliente,
            ciudad: datosCliente.ciudad,
          },
          metodoEnvioId: body.metodoEnvio?.id ?? body.envioMetodo?.id ?? null,
          metodoPago: body.metodoPago?.metodo || body.pagoMetodo?.metodo || "tarjeta",
          cuponCodigo: body.cuponCodigo || body.cupon?.codigo || null,
          clienteId,
        });
      } catch (err) {
        if (err instanceof ErrorCalculoPedido) {
          console.error("❌ Recálculo de pedido rechazado:", err.message);
          return NextResponse.json({ error: err.message }, { status: err.status });
        }
        throw err;
      }

      if (totales.avisos.length > 0) {
        console.warn("⚠️ Ajustes en el recálculo del pedido:", totales.avisos.join(" | "));
      }

      const totalCliente = parseFloat(body.totalFinal || 0);
      if (Math.abs(totalCliente - totales.totalFinal) > 0.01) {
        console.warn(
          `⚠️ El total enviado por el cliente (${totalCliente.toFixed(2)} €) no coincide con el calculado en servidor (${totales.totalFinal.toFixed(2)} €). Se cobra el del servidor.`
        );
      }

      productosParaInsertar = totales.lineas;
    }

    // 3. Ejecutar Transacción
    console.log("💾 Iniciando transacción en Prisma...");
    
    // Leer configuración de referencia
    const refConfigRows = await prisma.configuracion.findMany({
      where: { clave: { in: ["pedidos.refPrefijo","pedidos.refSeparador","pedidos.refPadding","pedidos.refIncluirAno","pedidos.refUltimoNumero"] } }
    });
    const refMap: Record<string, string> = {};
    for (const r of refConfigRows) refMap[r.clave] = r.valor ?? "";
    const refPrefijo   = refMap["pedidos.refPrefijo"]   || "PED";
    const refSep       = refMap["pedidos.refSeparador"] !== undefined ? refMap["pedidos.refSeparador"] : "-";
    const refPadding   = Math.max(1, parseInt(refMap["pedidos.refPadding"] || "4"));
    const refIncluirAno = (refMap["pedidos.refIncluirAno"] ?? "true") !== "false";
    const refUltimo    = refMap["pedidos.refUltimoNumero"] ? parseInt(refMap["pedidos.refUltimoNumero"]) : 0;

    // Obtener estado inicial ANTES de la transacción para que sea accesible después
    const metodoPagoStr = String(body.metodoPago?.metodo || body.pagoMetodo?.metodo || "tarjeta");
    const estadoInicial = await getEstadoInicialPorMetodo(metodoPagoStr, prisma);

    const result = await prisma.$transaction(async (tx: any) => {
      // Generar numeroPedido usando la configuración
      const anio = new Date().getFullYear();
      const fullPrefix = refIncluirAno ? `${refPrefijo}${refSep}${anio}${refSep}` : `${refPrefijo}${refSep}`;
      const todos = await tx.pedido.findMany({
        where: { numeroPedido: { startsWith: fullPrefix } },
        select: { numeroPedido: true },
      });
      let maxSeq = 0;
      for (const p of todos) {
        if (!p.numeroPedido) continue;
        const n = parseInt(p.numeroPedido.slice(fullPrefix.length), 10);
        if (!isNaN(n) && n > maxSeq) maxSeq = n;
      }
      // Si hay override manual, respetarlo; si el número ya existe, caer de nuevo en maxSeq+1
      const secDeseada = refUltimo > 0 ? refUltimo + 1 : maxSeq + 1;
      const secExists = todos.some((p: any) => parseInt(p.numeroPedido?.slice(fullPrefix.length), 10) === secDeseada);
      const sec = secExists ? maxSeq + 1 : secDeseada;
      const numeroGenerado = `${fullPrefix}${sec.toString().padStart(refPadding, '0')}`;

      console.log("🔢 Número de pedido generado:", numeroGenerado);

        const pedido = await tx.pedido.create({
          data: {
            numeroPedido: numeroGenerado,
            clienteId: clienteId!,
            nombre: datosCliente.nombre || "Cliente Sin Nombre",
            apellidos: datosCliente.apellidos || null,
            email: emailCliente || datosCliente.email,
            telefono: datosCliente.telefono,
            nif: datosCliente.nif || null,
            direccion: datosCliente.direccion,
            direccionComplementaria: datosCliente.direccionComplementaria || null,
            ciudad: datosCliente.ciudad,
            provincia: datosCliente.provincia || null,
            cp: cpCliente || null,
            pais: datosCliente.pais || "España",
            envioMetodo: totales
              ? (totales.envio?.metodo ?? "estándar")
              : String(body.metodoEnvio?.metodo || body.envioMetodo?.metodo || "estándar"),
            envioCoste: totales
              ? totales.envioCoste
              : parseFloat(String(body.metodoEnvio?.coste || body.envioMetodo?.coste || 0)),
            pagoMetodo: metodoPagoStr,
            pagoRecargo: totales ? totales.recargoPago : parseFloat(String(body.pagoRecargo || 0)),
            estadoPago: body.estadoPago || "PENDIENTE",
            subtotal: totales ? totales.subtotal : parseFloat(body.subtotal || 0),
            descuento: totales
              ? totales.descuento
              : parseFloat(body.descuento || body.descuentoAplicado || body.cuponDescuento || 0),
            totalFinal: totales ? totales.totalFinal : parseFloat(body.totalFinal || 0),
            estado: estadoInicial.nombre,
            cuponCodigo: totales
              ? (totales.cupon?.codigo ?? null)
              : body.cuponCodigo || body.cupon?.codigo || null,
            cuponDescuento: totales
              ? (totales.cupon?.descuento ?? null)
              : body.cuponDescuento || body.descuentoAplicado || body.cupon?.descuento || null,
            notas: null,
            fechaPedido: new Date(),
            updatedAt: new Date(),
            pedidoproducto: {
              create: productosParaInsertar,
            },
          },
          select: {
            id: true,
            numeroPedido: true,
            clienteId: true,
            nombre: true,
            apellidos: true,
            email: true,
            telefono: true,
            nif: true,
            direccion: true,
            direccionComplementaria: true,
            ciudad: true,
            provincia: true,
            cp: true,
            pais: true,
            envioMetodo: true,
            envioCoste: true,
            pagoMetodo: true,
            pagoRecargo: true,
            estadoPago: true,
            subtotal: true,
            descuento: true,
            totalFinal: true,
            estado: true,
            cuponCodigo: true,
            cuponDescuento: true,
            notas: true,
            fechaPedido: true,
            updatedAt: true,
            pedidoproducto: true,
          },
        });

      // ── Descontar existencias ──────────────────────────────────────────────
      // Va DENTRO de la transacción del pedido a propósito: o se crea el pedido y
      // se descuenta el stock, o no ocurre ninguna de las dos cosas. Y como el
      // pedido se crea una sola vez, no hace falta protección extra contra
      // reintentos de la pasarela: éstos confirman un pedido ya existente, no
      // vuelven a pasar por aquí.
      //
      // Se descuenta al CREAR el pedido, antes de que se complete el pago, para
      // que dos clientes no puedan comprar la misma unidad mientras uno está en
      // la pasarela. La contrapartida es que un pago abandonado retiene stock
      // hasta que se cancele el pedido (ver nota de reposición más abajo).
      //
      // updateMany y no update: si una línea apunta a un producto o variante que
      // ya no existe, update lanzaría P2025 y tumbaría TODA la transacción, es
      // decir, el cliente no podría comprar por un id obsoleto. updateMany no
      // encuentra nada y sigue, que es justo el comportamiento que queremos.
      //
      // Los estores digitales quedan fuera: se fabrican bajo pedido y su stock es
      // un número decorativo. Ver src/lib/stock.ts.
      const idsDeLineas = [
        ...new Set(
          productosParaInsertar
            .map((l: any) => l.productoIdRef)
            .filter((id: any): id is number => typeof id === "number")
        ),
      ];
      const sinControlDeStock = await idsProductosSinControlDeStock(tx, idsDeLineas);

      for (const linea of productosParaInsertar) {
        const cantidad = Number(linea.cantidad) || 0;
        if (cantidad <= 0) continue;
        if (linea.productoIdRef && sinControlDeStock.has(linea.productoIdRef)) continue;

        if (linea.varianteIdRef) {
          // Producto con combinaciones: las existencias viven en la variante.
          await tx.variante.updateMany({
            where: { id: linea.varianteIdRef },
            data: { stock: { decrement: cantidad } },
          });
        } else if (linea.productoIdRef) {
          await tx.producto.updateMany({
            where: { id: linea.productoIdRef },
            data: { stock: { decrement: cantidad } },
          });
        }
      }

      return pedido;
    });

    // Insertar estado inicial en historial
    try {
      await prisma.historialestadopedido.create({
        data: { pedidoId: result.id, estado: estadoInicial.nombre, color: estadoInicial.color, fecha: new Date() },
      });
      console.log("✅ Historial inicial creado para estado:", estadoInicial.nombre, "Color:", estadoInicial.color);
    } catch (err: any) {
      console.warn("⚠️ No se pudo insertar historial inicial:", err?.message);
    }

    // Crear mensaje del cliente si hay comentario
    if (comentarioCliente && comentarioCliente.trim()) {
      try {
        console.log("📝 Creando mensaje del cliente para pedido", result.id, "con comentario:", comentarioCliente.substring(0, 50));
        const nuevoMensaje = await prisma.pedido_mensaje.create({
          data: {
            pedidoId: result.id,
            autor: "cliente",
            autorNombre: result.nombre || "Cliente",
            mensaje: comentarioCliente.trim(),
            privado: false,
            updatedAt: new Date(),
          },
        });
        console.log("✅ Mensaje del cliente creado exitosamente:", nuevoMensaje.id);
      } catch (err: any) {
        console.error("❌ Error al crear mensaje del cliente:", err?.message, err);
      }
    } else {
      console.log("ℹ️ No hay comentario del cliente para crear mensaje");
    }

    console.log("✨ ¡ÉXITO! Pedido guardado");
    console.log("   - ID:", result.id);
    console.log("   - Número:", result.numeroPedido);
    console.log("   - Cliente ID:", result.clienteId);
    console.log("   - Total:", result.totalFinal);
    console.log("   - Estado Pago:", result.estadoPago);

    const appUrl = getBaseUrl();

    // Emails diferidos: todos los métodos esperan confirmación del usuario excepto ninguno directo.
    // tarjeta/paypal: webhook/capture confirma. transferencia/bizum/contrareembolso: usuario confirma en pantalla.
    const esPasarela = ["tarjeta", "paypal", "transferencia", "bizum", "contrareembolso"].includes(metodoPagoStr);

    if (!esPasarela) {
      // Otros métodos no contemplados: enviar email inmediatamente
      if (result.email) {
        sendTemplateEmail({
          to: result.email,
          templateSlug: "order-placed",
          variables: {
            nombre: result.nombre || "Cliente",
            numeroPedido: result.numeroPedido,
            total: `${Number(result.totalFinal).toFixed(2)} €`,
            pedidoUrl: await buildPedidoUrl(appUrl, result),
          },
        }).catch((err) => console.error("❌ Email confirmación pedido:", err?.message));
      }

      loadEmailSettings().then((emailSettings) => {
        if (!emailSettings.adminEmail) return;
        const htmlAdmin = buildAdminOrderEmail({ ...result, mensajeCliente: comentarioCliente }, datosCliente, { brandName: emailSettings.brandName, appUrl });
        const nombreCliente = `${result.nombre || ""} ${result.apellidos || ""}`.trim() || "Cliente";
        return sendRawEmail({
          to: emailSettings.adminEmail,
          subject: `[${emailSettings.brandName}] Nuevo pedido: ${result.numeroPedido} — ${nombreCliente}`,
          html: htmlAdmin,
        });
      }).catch((err) => console.error("❌ Email notificación admin:", err?.message));
    }

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
