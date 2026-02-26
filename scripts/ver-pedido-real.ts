// @ts-nocheck
import mongoose from 'mongoose';

// 👇 ¡PON TU URL REAL AQUÍ!
const MONGO_URI = "mongodb+srv://vicben_db:Fisicayquimica2025@cluster0.ynidino.mongodb.net/?appName=Cluster0";

const dummySchema = new mongoose.Schema({}, { strict: false });
const MongoOrder = mongoose.model('orders', dummySchema, 'pedidos');

async function verPedido() {
  console.log("🕵️ Conectando para espiar un pedido...");
  await mongoose.connect(MONGO_URI);
  
  // Cogemos el último pedido registrado para ver datos recientes
  const pedido = await MongoOrder.findOne().sort({ _id: -1 });

  if (!pedido) {
      console.log("❌ No se encontraron pedidos en Mongo.");
  } else {
      console.log("\n👇 AQUÍ ESTÁ LA ESTRUCTURA REAL DE TU PEDIDO (Copia esto):");
      console.log("---------------------------------------------------------");
      console.log(JSON.stringify(pedido, null, 2));
      console.log("---------------------------------------------------------");
  }

  await mongoose.disconnect();
}

verPedido();