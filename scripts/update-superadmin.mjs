// Ejecutar con: npx tsx scripts/update-superadmin.mjs
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const todos = await prisma.admin.findMany({
    select: { id: true, nombre: true, email: true, rol: true },
    orderBy: { id: 'asc' },
  });

  console.log('📋 Usuarios admin actuales:');
  todos.forEach(u => console.log(`   [${u.id}] ${u.email} → rol: ${u.rol}`));
  console.log('');

  const emailObjetivo = 'admin@elhogardetusuenos.com';
  const usuario = todos.find(u => u.email === emailObjetivo) || todos[0];

  if (!usuario) {
    console.error('❌ No se encontró ningún admin en la base de datos.');
    process.exit(1);
  }

  const actualizado = await prisma.admin.update({
    where: { id: usuario.id },
    data: { rol: 'superadmin' },
    select: { id: true, nombre: true, email: true, rol: true },
  });

  console.log('✅ Usuario actualizado a superadmin:');
  console.log(`   [${actualizado.id}] ${actualizado.email} → rol: ${actualizado.rol}`);
  console.log('\nReinicia el servidor y vuelve a hacer login.');
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
}).finally(() => prisma.$disconnect());
