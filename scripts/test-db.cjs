const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log('✅ MariaDB conectada OK');

    // VER TUS DATOS REALES
    const productos = await prisma.producto.findMany({
      take: 5,
      include: { marca: true, categoria: true }
    });
    
    console.log('📦 TUS PRODUCTOS EN MARIADB:');
    productos.forEach(p => {
      console.log(`- ${p.nombre} (${p.precio}€) - ${p.marca?.nombre || 'sin marca'}`);
    });

    const totalProductos = await prisma.producto.count();
    console.log(`\n🎉 TOTAL: ${totalProductos} productos en MariaDB`);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
