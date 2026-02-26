// @ts-nocheck
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

// 👇 ¡PON TU URL DE MONGO AQUÍ!
const MONGO_URI = "mongodb+srv://vicben_db:Fisicayquimica2025@cluster0.ynidino.mongodb.net/?appName=Cluster0";
const prisma = new PrismaClient();

const dummySchema = new mongoose.Schema({}, { strict: false });
const MongoOrder = mongoose.model('orders', dummySchema, 'pedidos');

async function corregirPedidos() {
  console.log("🔌 Conectando a Mongo y SQL...");
  await mongoose.connect(MONGO_URI);
  
  const orders = await MongoOrder.find();
  console.log(`📋 Revisando ${orders.length} pedidos originales...`);

  let actualizados = 0;

  for (const o of orders) {
    // 1. Intentamos recuperar el nombre REAL que se escribió en el envío
    // Probamos varios sitios donde Mongo suele guardar el nombre
    let nombreReal = 
        o.envioInfo?.nombre || 
        o.datosEntrega?.nombre || 
        o.nombre || 
        o.cliente?.nombre || 
        "Cliente Desconocido";

    let apellidos = o.envioInfo?.apellidos || o.apellidos || "";
    
    // Si tenemos apellidos, los juntamos
    if (apellidos) {
        nombreReal = `${nombreReal} ${apellidos}`.trim();
    }

    // 2. Recuperamos el total real
    let totalReal = parseFloat(o.precioTotal || o.total || o.pago?.totalFinal || 0);

    // 3. Buscamos el pedido en MariaDB usando el código "OLD-..."
    const numeroPedidoAntiguo = `OLD-${o._id}`;

    const pedidoExiste = await prisma.pedido.findFirst({
        where: { 
            numeroPedido: numeroPedidoAntiguo 
        }
    });

    if (pedidoExiste) {
        // 4. ACTUALIZAMOS EL PEDIDO con los datos reales
        await prisma.pedido.update({
            where: { id: pedidoExiste.id },
            data: {
                nombre: nombreReal,     // Sobreescribimos "Juan" con el nombre del envío
                totalFinal: totalReal   // Corregimos el 0.00
            }
        });
        process.stdout.write("✅");
        actualizados++;
    } else {
        process.stdout.write("."); // Pedido no encontrado (quizás fue uno de prueba)
    }
  }

  console.log(`\n\n✨ Proceso terminado. Se han corregido ${actualizados} pedidos.`);
  console.log("👉 Ahora actualiza tu panel de administración.");
}

corregirPedidos()
  .catch(e => console.error(e))
  .finally(async () => {
      await mongoose.disconnect();
      await prisma.$disconnect();
  });