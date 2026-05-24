const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  await prisma.$connect();
  
  // 2 PRODUCTOS DE PRUEBA
  await prisma.marca.create({
    data: { nombre: 'Test Marca', descripcion: 'Prueba' }
  });
  
  await prisma.categoria.create({
    data: { nombre: 'Test Categoría' }
  });
  
  const marca = await prisma.marca.findFirst();
  const categoria = await prisma.categoria.findFirst();
  
  await prisma.producto.create({
    data: {
      nombre: 'Sofá de Prueba',
      precio: 299.99,
      stock: 10,
      destacado: true,
      imagenes: JSON.stringify(['https://via.placeholder.com/300']),
      marcaId: marca.id,
      categoriaId: categoria.id
    }
  });
  
  console.log('✅ 1 producto de prueba creado');
  console.log('🔄 Reinicia Prisma Studio: npx prisma studio');
}

seed();
