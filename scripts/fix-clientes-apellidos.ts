// @ts-nocheck
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

// 👇 ¡PON TU URL REAL AQUÍ!
const MONGO_URI = "mongodb+srv://vicben_db:Fisicayquimica2025@cluster0.ynidino.mongodb.net/?appName=Cluster0";
const prisma = new PrismaClient();

const dummySchema = new mongoose.Schema({}, { strict: false });
// Asegúrate de que 'clientes' es el nombre de la colección donde están los usuarios en Mongo
const MongoUser = mongoose.model('users_clientes_fix', dummySchema, 'clientes'); 

async function arreglarApellidos() {
  console.log("🔌 Conectando...");
  await mongoose.connect(MONGO_URI);
  
  const clientesMongo = await MongoUser.find();
  console.log(`📋 Revisando ${clientesMongo.length} clientes originales...`);

  let actualizados = 0;

  for (const u of clientesMongo) {
    // Si el usuario no tiene email, no podemos cruzar datos
    if (!u.email) continue;

    // Buscamos al cliente en MariaDB por su email
    const clienteSQL = await prisma.cliente.findUnique({
        where: { email: u.email }
    });

    if (clienteSQL) {
        // Obtenemos los datos de Mongo
        const nombreReal = u.nombre || "";
        const apellidosReales = u.apellidos || ""; // Aquí está el dato que faltaba

        // Solo actualizamos si falta el apellido o el nombre está incompleto
        // (Opcional: puedes forzar la actualización siempre quitando el 'if')
        if (!clienteSQL.apellidos || clienteSQL.apellidos === "") {
            
            await prisma.cliente.update({
                where: { id: clienteSQL.id },
                data: {
                    nombre: nombreReal,      // Refrescamos el nombre por si acaso
                    apellidos: apellidosReales // 👇 ¡AQUÍ ESTÁ LA CLAVE!
                }
            });
            console.log(`✅ Cliente ${u.email}: Añadido apellido "${apellidosReales}"`);
            actualizados++;
        }
    }
  }

  console.log(`\n\n✨ PROCESO TERMINADO.`);
  console.log(`📝 Se han completado los apellidos de ${actualizados} clientes.`);
}

arreglarApellidos()
  .catch(e => console.error(e))
  .finally(async () => {
      await mongoose.disconnect();
      await prisma.$disconnect();
  });