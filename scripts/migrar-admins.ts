// @ts-nocheck
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';

// ------------------------------------------------------------------
// 1. CONFIGURACIÓN
// ------------------------------------------------------------------
// 👇 ¡PON TU URL REAL DEL .ENV OTRA VEZ!
const MONGO_URI = "mongodb+srv://vicben_db:Fisicayquimica2025@cluster0.ynidino.mongodb.net/?appName=Cluster0";
const prisma = new PrismaClient();

// ------------------------------------------------------------------
// 2. DEFINICIÓN DE MODELO MONGO
// ------------------------------------------------------------------
const dummySchema = new mongoose.Schema({}, { strict: false });

// Leemos la colección 'usuarios' (donde están tus admins)
const MongoUsuarioPanel = mongoose.model('users_panel', dummySchema, 'usuarios');

// ------------------------------------------------------------------
// 3. FUNCIÓN DE MIGRACIÓN
// ------------------------------------------------------------------

async function migrarAdmins() {
  try {
    console.log("🔌 Conectando a MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Conectado.");

    console.log("\n🚀 Migrando USUARIOS DEL PANEL (Admins)...");
    
    const usuariosMongo = await MongoUsuarioPanel.find();
    console.log(`📋 Encontrados ${usuariosMongo.length} usuarios en Mongo.`);

    for (const u of usuariosMongo) {
      
      // --------------------------------------------------------
      // 🔧 CORRECCIÓN DEL ROL (ENUM)
      // Traducimos "admin" (texto) -> "ADMIN" (Enum de Prisma)
      // --------------------------------------------------------
      let rolEnum = "USER"; // Valor por defecto (asegúrate de que en tu schema sea USER o CLIENTE)

      const rolOriginal = (u.rol || u.role || "").toLowerCase();

    //   if (rolOriginal.includes("admin")) {
    //     rolEnum = "ADMIN";
    //   } else {
    //     rolEnum = "USER";
    //   }
    if (rolOriginal.includes("admin")) {
        rolEnum = "ADMIN";
      } else {
        rolEnum = "CLIENTE"; // ✅ Probamos con esto
      }

      // --------------------------------------------------------
      // 2. Obtener Nombre
      // --------------------------------------------------------
      let nombreFinal = u.nombre;
      if (!nombreFinal && u.email) {
        nombreFinal = u.email.split('@')[0];
      }

      // --------------------------------------------------------
      // 3. Verificar existencia
      // --------------------------------------------------------
      const existe = await prisma.usuario.findUnique({
        where: { email: u.email }
      });

      if (existe) {
        console.log(`⚠️ El usuario ${u.email} ya existe. Saltando.`);
        continue;
      }

      // --------------------------------------------------------
      // 4. Insertar en tabla Usuario
      // --------------------------------------------------------
      try {
        await prisma.usuario.create({
          data: {
            email: u.email,
            password: u.password, 
            nombre: nombreFinal,
            // 👇 Aquí usamos 'as any' para forzar que acepte el string en mayúsculas
            rol: rolEnum as any 
          }
        });
        process.stdout.write("✅ ");
      } catch (error) {
        console.error(`\n❌ Error al crear ${u.email}:`, error.message);
        console.log("   👉 Pista: Verifica en tu schema.prisma cómo se llaman los valores del enum RolUsuario (¿ADMIN, USER, CLIENTE?)");
      }
    }

    console.log("\n\n🎉 ¡PROCESO FINALIZADO!");

  } catch (error) {
    console.error("❌ Error fatal:", error);
  } finally {
    await mongoose.disconnect();
    await prisma.$disconnect();
  }
}

migrarAdmins();