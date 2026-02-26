import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.cliente.count();
  console.log(`📊 Total de clientes en BD: ${total}`);
  
  if (total > 0) {
    const uno = await prisma.cliente.findFirst();
    console.log('Ejemplo de cliente:', uno);
  }
}

main();