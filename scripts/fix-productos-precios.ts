// @ts-nocheck
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

// 👇 ¡PON TU URL REAL AQUÍ!
const MONGO_URI = "mongodb+srv://vicben_db:Fisicayquimica2025@cluster0.ynidino.mongodb.net/?appName=Cluster0";
const prisma = new PrismaClient();

const dummySchema = new mongoose.Schema({}, { strict: false });
const MongoOrder = mongoose.model('orders', dummySchema, 'pedidos');

async function arreglarPreciosProductos() {
  console.log("🔌 Conectando...");
  await mongoose.connect(MONGO_URI);
  
  const orders = await MongoOrder.find();
  console.log(`📋 Revisando productos de ${orders.length} pedidos...`);

  let actualizados = 0;

  for (const o of orders) {
    const idMongo = o._id.toString();
    const numeroBusqueda = `OLD-${idMongo}`;

    // 1. Buscamos el pedido en MariaDB
    let pedidoSQL = await prisma.pedido.findFirst({
        where: { numeroPedido: numeroBusqueda },
        include: { productos: true } // Vemos qué productos tiene ahora
    });

    if (!pedidoSQL && o.numeroPedido) {
        pedidoSQL = await prisma.pedido.findFirst({
             where: { numeroPedido: o.numeroPedido },
             include: { productos: true }
        });
    }

    if (pedidoSQL) {
        // 2. Preparamos los productos BIEN desde Mongo
        // Usamos 'precioUnitario' que es el campo correcto que vimos en tu JSON
        const productosCorrectos = (o.productos || []).map((p: any) => ({
             nombre: p.nombre || "Producto Importado",
             cantidad: parseInt(p.cantidad) || 1,
             // 👇 AQUÍ ESTÁ LA CLAVE: Leemos precioUnitario, no precio
             precioUnitario: parseFloat(p.precioUnitario || p.precio || 0),
             subtotal: parseFloat(p.subtotal || 0)
        }));

        // Solo actuamos si encontramos productos en Mongo
        if (productosCorrectos.length > 0) {
            
            // 3. ESTRATEGIA: Borrar los viejos (malos) y poner los nuevos (buenos)
            await prisma.pedido.update({
                where: { id: pedidoSQL.id },
                data: {
                    productos: {
                        deleteMany: {}, // 🗑️ Borra los productos existentes (con precio 0)
                        create: productosCorrectos // ✨ Crea los nuevos con precio bien
                    }
                }
            });
            process.stdout.write("✅");
            actualizados++;
        }
    }
  }

  console.log(`\n\n✨ PROCESO TERMINADO.`);
  console.log(`💰 Se han regenerado los precios de los productos en ${actualizados} pedidos.`);
}

arreglarPreciosProductos()
  .catch(e => console.error(e))
  .finally(async () => {
      await mongoose.disconnect();
      await prisma.$disconnect();
  });