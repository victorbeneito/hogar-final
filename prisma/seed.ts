import { PrismaClient } from '../generated/prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10)
  
  await prisma.admin.create({
    data: {
      nombre: 'Administrador',
      email: 'admin@admin.com',
      password: hashedPassword,
      rol: 'admin',
      updatedAt: new Date()
    }
  })

  console.log('✅ Admin user created')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
