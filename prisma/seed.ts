import { PrismaClient } from 'C:/Users/liber/.gemini/tmp/ac0a26ec8609e19e2b8f8c0d0066d110f320a21677e64bf235d4d5778f658a7e/generated/prisma'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10)
  
  await prisma.admin.create({
    data: {
      nombre: 'Administrador',
      email: 'admin@admin.com',
      password: hashedPassword,
      rol: 'admin'
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
