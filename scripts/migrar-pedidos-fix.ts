// @ts-nocheck
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

// 👇 ¡PON TU URL REAL AQUÍ!
const MONGO_URI = "mongodb+srv://vicben_db:Fisicayquimica2025@cluster0.ynidino.mongodb.net/?appName=Cluster0";
const prisma = new PrismaClient();

const dummySchema = new mongoose.Schema({}, { strict: false });
const MongoOrder = mongoose.model('orders', dummySchema, 'pedidos');
const MongoUser = mongoose.model('users', dummySchema, 'clientes');

async function migrarPedidos() {
  console.log("🔌 Conectando...");
  await mongoose.connect(MONGO_URI);
  
  // 1. Obtener un ID de cliente válido por defecto
  const defaultClient = await prisma.cliente.findFirst();
  const defaultClientId = defaultClient ? defaultClient.id : 1;

  const orders = await MongoOrder.find();
  console.log(`📋 Procesando ${orders.length} pedidos...`);

  for (const o of orders) {
    try {
        // --- LOGICA DE TRADUCCIÓN DE ESTADO ---
        let estadoFinal = "PENDIENTE"; 
        const estadoMongo = (o.estado || "").toLowerCase();

        if (estadoMongo.includes("entregado")) {
            estadoFinal = "ENTREGADO";
        } else if (estadoMongo.includes("enviado")) {
            estadoFinal = "ENVIADO";
        } else if (estadoMongo.includes("cancelado")) {
            estadoFinal = "CANCELADO";
        } else if (estadoMongo.includes("pagado")) {
            estadoFinal = "PAGADO";
        }

        // Mapear Items
        const items = (o.pedidoItems || o.productos || []).map((item: any) => ({
            nombre: item.nombre || "Producto",
            cantidad: parseInt(item.cantidad) || 1,
            precioUnitario: parseFloat(item.precio || 0),
            subtotal: (parseFloat(item.precio || 0) * (parseInt(item.cantidad) || 1))
        }));

        // Buscar ID del cliente real
        let clienteId = defaultClientId;
        const emailCliente = o.envioInfo?.email || o.email;
        if (emailCliente) {
            const found = await prisma.cliente.findUnique({ where: { email: emailCliente } });
            if (found) clienteId = found.id;
        }

        await prisma.pedido.create({
          data: {
            numeroPedido: o.id_pedido || `OLD-${o._id}`,
            clienteId: clienteId,
            
            nombre: o.envioInfo?.nombre || "Cliente Importado",
            email: emailCliente || "noemail@import.com",
            telefono: o.envioInfo?.telefono || "",
            direccion: o.envioInfo?.direccion || "",
            ciudad: o.envioInfo?.ciudad || "",
            cp: o.envioInfo?.cp || "",
            
            envioMetodo: "Estándar",
            envioCoste: parseFloat(o.precioEnvio || 0),
            
            pagoMetodo: o.pagoInfo?.metodo || "Tarjeta",
            
            subtotal: parseFloat(o.precioItems || 0),
            totalFinal: parseFloat(o.precioTotal || 0),
            
            estado: estadoFinal as any,
            
            // 👇 CORREGIDO: Usamos 'fechaPedido' en lugar de 'createdAt'
            fechaPedido: o.createdAt ? new Date(o.createdAt) : new Date(),
            
            productos: { create: items }
          }
        });
        process.stdout.write("✅");
    } catch (e) {
        console.log(`\n❌ Error en pedido ${o._id}:`, e.message);
    }
  }
  console.log("\nFIN.");
}

migrarPedidos();