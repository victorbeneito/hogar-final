// @ts-nocheck
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

// 👇 ¡PON TU URL REAL AQUÍ!
const MONGO_URI = "mongodb+srv://vicben_db:Fisicayquimica2025@cluster0.ynidino.mongodb.net/?appName=Cluster0";
const prisma = new PrismaClient();

const dummySchema = new mongoose.Schema({}, { strict: false });
const MongoOrder = mongoose.model('orders', dummySchema, 'pedidos');

async function corregirNombres() {
  console.log("🔌 Conectando...");
  await mongoose.connect(MONGO_URI);
  
  const orders = await MongoOrder.find();
  console.log(`📋 Revisando ${orders.length} pedidos de Mongo...`);

  let arreglados = 0;
  let noEncontrados = 0;

  for (const o of orders) {
    // 1. Extraer el nombre REAL (basado en tu estructura confirmada)
    // Buscamos en 'cliente.nombre' que es donde vimos que estaba "Laia"
    const nombreReal = o.cliente?.nombre || o.nombre || o.envioInfo?.nombre || "Cliente Importado";
    const emailReal = o.cliente?.email || o.email || "noemail@importado.com";
    
    // Dirección
    const direccionReal = o.cliente?.direccion || o.direccion || "";
    const ciudadReal = o.cliente?.ciudad || o.ciudad || "";
    const cpReal = o.cliente?.cp || o.cp || "";

    // Total
    const totalReal = parseFloat(o.totalFinal || o.total || 0);

    // 2. Generar el ID "OLD-..." para buscarlo en MariaDB
    const idMongo = o._id.toString();
    const numeroBusqueda = `OLD-${idMongo}`;

    // 3. Buscar y Actualizar
    // Primero buscamos por el código OLD
    let pedidoSQL = await prisma.pedido.findFirst({
        where: { numeroPedido: numeroBusqueda }
    });

    // Si no, buscamos por el número de pedido original (ej: PED-2026-...)
    if (!pedidoSQL && o.numeroPedido) {
        pedidoSQL = await prisma.pedido.findFirst({
            where: { numeroPedido: o.numeroPedido }
        });
    }

    if (pedidoSQL) {
        // ACTUALIZAMOS
        await prisma.pedido.update({
            where: { id: pedidoSQL.id },
            data: {
                nombre: nombreReal,     // 👈 Aquí forzamos el nombre "Laia", "Ana", etc.
                email: emailReal,
                direccion: direccionReal,
                ciudad: ciudadReal,
                cp: cpReal,
                totalFinal: totalReal
            }
        });
        console.log(`✅ Pedido ${numeroBusqueda.padEnd(30)} -> Nombre corregido a: "${nombreReal}"`);
        arreglados++;
    } else {
        // console.log(`⚠️ No encontrado en SQL: ${numeroBusqueda}`);
        noEncontrados++;
    }
  }

  console.log(`\n\n✨ RESUMEN:`);
  console.log(`✅ Se han corregido ${arreglados} pedidos con sus nombres reales.`);
  console.log(`⚠️ Hubo ${noEncontrados} pedidos de Mongo que no existen en SQL (quizás se borraron).`);
}

corregirNombres();