import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs' // Asegúrate de tener: npm install bcryptjs @types/bcryptjs

const prisma = new PrismaClient()

async function main() {
  // 1. Limpiar base de datos (Opcional, cuidado en producción)
  await prisma.pedidoProducto.deleteMany()
  await prisma.pedido.deleteMany()
  await prisma.variante.deleteMany()
  await prisma.producto.deleteMany()
  await prisma.marca.deleteMany()
  await prisma.categoria.deleteMany()
  await prisma.usuario.deleteMany()

  console.log('🗑 Base de datos limpia')

  // 2. Crear Categoría y Marca
  const categoria = await prisma.categoria.create({
    data: { nombre: 'Mobiliario' }
  })

  const marca = await prisma.marca.create({
    data: { nombre: 'MarcaTop', descripcion: 'La mejor marca' }
  })

  // 3. Crear un Producto
  await prisma.producto.create({
    data: {
      nombre: 'Silla Ergonómica',
      descripcion: 'Silla muy cómoda para programar',
      precio: 150.00,
      stock: 50,
      marcaId: marca.id,
      categoriaId: categoria.id,
      imagenes: ["silla1.jpg", "silla2.jpg"], // Array JSON
      Variante: {
        create: [
          { color: 'Negro', precio_extra: 0 },
          { color: 'Rojo', precio_extra: 10 }
        ]
      }
    }
  })

  // 4. Crear un Usuario Admin (Password: 123456)
  const hashedPassword = await bcrypt.hash('123456', 10)
  
  await prisma.usuario.create({
    data: {
      nombre: 'Administrador',
      email: 'admin@admin.com',
      password: hashedPassword,
      rol: 'ADMIN'
    }
  })

  console.log('✅ Datos de prueba insertados correctamente')
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