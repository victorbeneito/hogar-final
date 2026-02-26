import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Migrando usuarios de MongoDB a SQL...');

  // 1. Limpiamos la tabla de usuarios para empezar de cero y evitar duplicados
  try {
    await prisma.usuario.deleteMany({});
    console.log('🗑️  Tabla de usuarios limpiada.');
  } catch (e) {
    console.log('Nota: La tabla ya estaba vacía.');
  }

  // 2. Insertamos los 4 usuarios exactos que tenías en Mongo
  // IMPORTANTE: Convertimos "admin" -> "ADMIN" y "user" -> "CLIENTE"
  const usuarios = [
    {
      nombre: 'Administrador',
      email: 'admin@elhogardetusuenos.com',
      password: '$2b$10$8PcLfDaQJxrdgllZ16/0XOtzNLUgdFwgg.U8JuYBbv//5BMmJPhwe', // Admin2025
      rol: 'ADMIN' 
    },
    {
      nombre: 'Victor Beneito',
      email: 'victorblluch@gmail.com',
      password: '$2b$10$96jSeshZZwRQadYrYIaa1Oel4ICr0cr8SNaIPAxMmt82Vg7RKuioG',
      rol: 'CLIENTE'
    },
    {
      nombre: 'Liberio',
      email: 'liberiogasss@gmail.com',
      password: '$2b$10$fMNMVe66QZPMZsyGAz.1KuPi2bPHx.ihavTZvhfthe.PiUC/oJnrS',
      rol: 'CLIENTE'
    },
    {
      nombre: 'Ana Lopez',
      email: 'analopez@gmail.com',
      password: '$2b$10$SzDMvF/pUdfcx75v1K3CAeZpvJ8vqmcAK8L2EKzXm/VYwkaa5UbsW',
      rol: 'ADMIN'
    }
  ];

  for (const u of usuarios) {
    await prisma.usuario.create({
      data: {
        nombre: u.nombre,
        email: u.email,
        password: u.password,
        rol: u.rol as any, // "as any" para evitar que TypeScript se queje si el enum no cuadra exacto ahora mismo
        updatedAt: new Date(),
      }
    });
    console.log(`✅ Usuario creado: ${u.email} (${u.rol})`);
  }

  console.log('🎉 ¡Todos los usuarios migrados correctamente!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });