// @ts-nocheck
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

// 👇 ¡PON TU URL REAL AQUÍ!
const MONGO_URI = "mongodb+srv://vicben_db:Fisicayquimica2025@cluster0.ynidino.mongodb.net/?appName=Cluster0";
const prisma = new PrismaClient();

const dummySchema = new mongoose.Schema({}, { strict: false });
const MongoOrder = mongoose.model('orders', dummySchema, 'pedidos');

async function migrarPedidosFinal() {
  console.log("🔌 Conectando...");
  await mongoose.connect(MONGO_URI);
  
  // Buscamos el cliente por defecto (ID 1) por si acaso
  const defaultClient = await prisma.cliente.findFirst();
  const defaultClientId = defaultClient ? defaultClient.id : 1;

  const orders = await MongoOrder.find();
  console.log(`📋 Procesando ${orders.length} pedidos con la estructura CORRECTA...`);

  for (const o of orders) {
    try {
        // -------------------------------------------------------
        // 1. MAPEO EXACTO BASADO EN TU JSON
        // -------------------------------------------------------
        const datosCliente = o.cliente || {}; // Aquí están tus datos reales
        const datosEnvio = o.envio || {};
        const datosPago = o.pago || {};

        // Nombre y Apellidos
        const nombreReal = datosCliente.nombre || "Cliente Sin Nombre";
        
        // Dirección (según tu JSON: "Daniel Gil, 27")
        const direccionReal = datosCliente.direccion || "";
        const ciudadReal = datosCliente.ciudad || "";
        const cpReal = datosCliente.cp || "";
        const telefonoReal = datosCliente.telefono || "";
        const emailReal = datosCliente.email || "noemail@importado.com";

        // Total
        const totalReal = parseFloat(o.totalFinal || 0);

        // Estado (Traducción a Mayúsculas para Prisma)
        let estadoFinal = "PENDIENTE"; 
        const estadoMongo = (o.estado || "").toLowerCase();
        if (estadoMongo.includes("entregado")) estadoFinal = "ENTREGADO";
        else if (estadoMongo.includes("enviado")) estadoFinal = "ENVIADO";
        else if (estadoMongo.includes("cancelado")) estadoFinal = "CANCELADO";
        else if (estadoMongo.includes("pagado")) estadoFinal = "PAGADO";

        // -------------------------------------------------------
        // 2. BUSCAR EL PEDIDO EN MARIADB
        // -------------------------------------------------------
        // Como el script anterior los creó como "OLD-[_id]", buscamos por ahí
        const idMongo = o._id.toString();
        
        // Intentamos buscar por el número generado anteriormente
        let pedidoExiste = await prisma.pedido.findFirst({
            where: { numeroPedido: `OLD-${idMongo}` }
        });

        // Si no lo encuentra, buscamos por si acaso ya se guardó con el numero real "PED-..."
        if (!pedidoExiste && o.numeroPedido) {
             pedidoExiste = await prisma.pedido.findFirst({
                where: { numeroPedido: o.numeroPedido }
            });
        }

        // -------------------------------------------------------
        // 3. DATOS A GUARDAR
        // -------------------------------------------------------
        const datosParaGuardar = {
            nombre: nombreReal,
            email: emailReal,
            telefono: telefonoReal,
            direccion: direccionReal,
            ciudad: ciudadReal,
            cp: cpReal,
            totalFinal: totalReal,
            subtotal: parseFloat(o.subtotal || totalReal), // Si subtotal es 0, usamos total
            envioMetodo: datosEnvio.metodo || "Estándar",
            envioCoste: parseFloat(datosEnvio.coste || 0),
            pagoMetodo: datosPago.metodo || "Tarjeta",
            estado: estadoFinal as any,
            // Guardamos el número bonito si existe ("PED-2026-0002")
            numeroPedido: o.numeroPedido || `OLD-${idMongo}`, 
            // Fecha
            fechaPedido: o.fechaPedido ? new Date(o.fechaPedido) : (o.createdAt ? new Date(o.createdAt) : new Date())
        };

        if (pedidoExiste) {
            // ---> ACTUALIZAR (Corregir el que estaba vacío)
            await prisma.pedido.update({
                where: { id: pedidoExiste.id },
                data: datosParaGuardar
            });
            process.stdout.write("🔄"); // Icono de actualizado
        } else {
            // ---> CREAR (Si faltaba alguno)
            
            // Intentar vincular cliente real por email
            let clienteId = defaultClientId;
            const foundClient = await prisma.cliente.findUnique({ where: { email: emailReal } });
            if (foundClient) clienteId = foundClient.id;

            // Mapear productos
            const items = (o.productos || []).map((item: any) => ({
                nombre: item.nombre || "Producto Importado",
                cantidad: parseInt(item.cantidad) || 1,
                precioUnitario: parseFloat(item.precioUnitario || 0),
                subtotal: parseFloat(item.subtotal || 0)
            }));

            await prisma.pedido.create({
                data: {
                    ...datosParaGuardar,
                    clienteId: clienteId,
                    productos: { create: items }
                }
            });
            process.stdout.write("✅"); // Icono de creado
        }

    } catch (e) {
        console.log(`\n❌ Error en pedido ${o._id}:`, e.message);
    }
  }
  console.log("\n\n🎉 ¡MIGRACIÓN DEFINITIVA TERMINADA!");
}

migrarPedidosFinal();