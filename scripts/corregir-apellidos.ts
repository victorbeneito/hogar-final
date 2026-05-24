// @ts-nocheck
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

// 👇 ¡PON TU URL REAL AQUÍ!
const MONGO_URI = "mongodb+srv://vicben_db:Fisicayquimica2025@cluster0.ynidino.mongodb.net/?appName=Cluster0";
const prisma = new PrismaClient();

const dummySchema = new mongoose.Schema({}, { strict: false });

// 1. Definimos los dos modelos que necesitamos cruzar
const MongoOrder = mongoose.model('orders', dummySchema, 'pedidos');
// IMPORTANTE: Asegúrate de que 'clientes' es el nombre real de tu colección de usuarios en Mongo
const MongoUser = mongoose.model('users_clientes', dummySchema, 'clientes'); 

async function corregirApellidos() {
  console.log("🔌 Conectando...");
  await mongoose.connect(MONGO_URI);
  
  const orders = await MongoOrder.find();
  console.log(`📋 Cruzando datos de ${orders.length} pedidos...`);

  let actualizados = 0;

  for (const o of orders) {
    let nombreCompleto = "";

    // A) Intentamos buscar el cliente original por ID para sacar los apellidos
    if (o.clienteId) {
        const clienteOriginal = await MongoUser.findById(o.clienteId);
        
        if (clienteOriginal) {
            // Si lo encontramos, concatenamos Nombre + Apellidos
            const nombre = clienteOriginal.nombre || "";
            const apellidos = clienteOriginal.apellidos || "";
            nombreCompleto = `${nombre} ${apellidos}`.trim();
        }
    }

    // B) Si no encontramos al usuario (o no tenía ID), usamos el dato del pedido
    if (!nombreCompleto) {
        // Intentamos buscar apellidos dentro del objeto cliente del pedido
        const nombreP = o.cliente?.nombre || o.nombre || "";
        const apellidosP = o.cliente?.apellidos || o.apellidos || "";
        nombreCompleto = `${nombreP} ${apellidosP}`.trim();
    }

    // Si después de todo sigue vacío, ponemos un fallback
    if (!nombreCompleto) nombreCompleto = "Cliente Importado";

    // ----------------------------------------------------
    // Actualizar en MariaDB
    // ----------------------------------------------------
    const idMongo = o._id.toString();
    const numeroBusqueda = `OLD-${idMongo}`;

    // Buscamos el pedido en SQL
    let pedidoSQL = await prisma.pedido.findFirst({
        where: { numeroPedido: numeroBusqueda }
    });
    
    // Fallback por si acaso
    if (!pedidoSQL && o.numeroPedido) {
        pedidoSQL = await prisma.pedido.findFirst({ where: { numeroPedido: o.numeroPedido } });
    }

    if (pedidoSQL) {
        // Solo actualizamos si el nombre es diferente (para ahorrar recursos)
        if (pedidoSQL.nombre !== nombreCompleto) {
            await prisma.pedido.update({
                where: { id: pedidoSQL.id },
                data: { nombre: nombreCompleto }
            });
            console.log(`✅ ${nombreCompleto.padEnd(30)} -> Actualizado en pedido ${numeroBusqueda}`);
            actualizados++;
        }
    }
  }

  console.log(`\n\n✨ PROCESO TERMINADO.`);
  console.log(`📝 Se han actualizado ${actualizados} pedidos con Nombre + Apellidos.`);
}

corregirApellidos()
  .catch(e => console.error(e))
  .finally(async () => {
      await mongoose.disconnect();
      await prisma.$disconnect();
  });