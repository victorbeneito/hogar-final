const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  try {
    const count = await prisma.producto.count()
    console.log('✅ Producto count:', count)
    await prisma.$disconnect()
  } catch (e) {
    console.log('❌ Error:', e.message)
  }
}

test()
