const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log("Creando campo composicion...");
    const result = await prisma.$executeRawUnsafe(
      `ALTER TABLE producto ADD COLUMN composicion LONGTEXT NULL AFTER etiquetas`
    );
    console.log("✅ Campo composicion creado exitosamente");
    process.exit(0);
  } catch (err) {
    if (err.message && err.message.includes("Duplicate column name")) {
      console.log("✅ El campo composicion ya existe");
      process.exit(0);
    }
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
