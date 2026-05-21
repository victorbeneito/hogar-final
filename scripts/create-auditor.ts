import { PrismaClient } from '../generated/prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const emailProfesor = process.argv[2]?.toLowerCase().trim();
  const nombreProfesor = process.argv[3] || "Profesor";
  const passwordProfesor = process.argv[4] || "Profesor123!";

  if (!emailProfesor || !emailProfesor.includes("@")) {
    console.error("❌ Uso: npx tsx scripts/create-auditor.ts <email> <nombre> <password>");
    console.error("   Ejemplo: npx tsx scripts/create-auditor.ts profesor@universidad.es \"Juan García\" \"MiPassword123!\"");
    process.exit(1);
  }

  try {
    const existe = await prisma.admin.findUnique({ where: { email: emailProfesor } });
    if (existe) {
      console.error(`❌ El email ${emailProfesor} ya existe en el sistema.`);
      process.exit(1);
    }

    const hash = await bcrypt.hash(passwordProfesor, 10);

    const nuevo = await prisma.admin.create({
      data: {
        nombre: nombreProfesor,
        email: emailProfesor,
        password: hash,
        rol: "auditor",
        activo: true,
        updatedAt: new Date(),
      },
      select: { id: true, nombre: true, email: true, rol: true },
    });

    console.log("✅ Usuario auditor creado correctamente:");
    console.log(`   ID: ${nuevo.id}`);
    console.log(`   Email: ${nuevo.email}`);
    console.log(`   Nombre: ${nuevo.nombre}`);
    console.log(`   Rol: ${nuevo.rol}`);
    console.log(`\n📋 Datos de acceso:`);
    console.log(`   Email: ${emailProfesor}`);
    console.log(`   Contraseña: ${passwordProfesor}`);
    console.log(`\n⚠️  Comparte estos datos con el profesor de forma segura.`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
