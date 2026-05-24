import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const prisma = new PrismaClient();

// ---------------------------------------------------------
// 1. DEFINIR ESQUEMAS MÍNIMOS DE MONGO (Para leer los datos)
// ---------------------------------------------------------
// No importamos tus modelos para evitar conflictos de dependencias,
// definimos unos temporales solo para leer.

const marcaSchema = new mongoose.Schema({ nombre: String, descripcion: String, logo_url: String });
const MongoMarca = mongoose.models.Marca || mongoose.model('Marca', marcaSchema);

const categoriaSchema = new mongoose.Schema({ nombre: String });
const MongoCategoria = mongoose.models.Categoria || mongoose.model('Categoria', categoriaSchema);

const varianteSchema = new mongoose.Schema({ color: String, imagen: String, tamaño: String, tirador: String, precio_extra: Number });
const productoSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  descripcion_html: String,
  precio: Number,
  stock: Number,
  marca: mongoose.Schema.Types.ObjectId,
  categoria: mongoose.Schema.Types.ObjectId,
  variantes: [varianteSchema],
  imagenes: [String],
  destacado: Boolean
});
const MongoProducto = mongoose.models.Producto || mongoose.model('Producto', productoSchema);

// ---------------------------------------------------------
// 2. FUNCIÓN PRINCIPAL DE MIGRACIÓN
// ---------------------------------------------------------
async function main() {
  console.log('🚀 Iniciando migración...');
  
  // A. Conectar a MongoDB
  if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI en .env");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado a MongoDB');

  // B. Limpiar MariaDB (Opcional: borra todo para empezar limpio y no duplicar)
  console.log('🗑  Limpiando MariaDB...');
  await prisma.variante.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.marca.deleteMany();
  await prisma.categoria.deleteMany();

  // -------------------------------------------------------
  // C. MIGRAR MARCAS
  // -------------------------------------------------------
  console.log('📦 Migrando Marcas...');
  const marcasMongo = await MongoMarca.find();
  const marcasMap = new Map<string, number>(); // Mapa: ID_Mongo -> ID_SQL

  for (const m of marcasMongo) {
    const nuevaMarca = await prisma.marca.create({
      data: {
        nombre: m.nombre,
        descripcion: m.descripcion || '',
        logo_url: m.logo_url || null
      }
    });
    // Guardamos la equivalencia: "65a..." es ahora el ID 1
    marcasMap.set(m.id.toString(), nuevaMarca.id);
  }
  console.log(`✅ ${marcasMap.size} marcas migradas.`);

  // -------------------------------------------------------
  // D. MIGRAR CATEGORÍAS
  // -------------------------------------------------------
  console.log('📦 Migrando Categorías...');
  const catsMongo = await MongoCategoria.find();
  const catsMap = new Map<string, number>();

  for (const c of catsMongo) {
    const nuevaCat = await prisma.categoria.create({
      data: { nombre: c.nombre }
    });
    catsMap.set(c.id.toString(), nuevaCat.id);
  }
  console.log(`✅ ${catsMap.size} categorías migradas.`);

  // -------------------------------------------------------
  // E. MIGRAR PRODUCTOS
  // -------------------------------------------------------
  console.log('📦 Migrando Productos...');
  const productosMongo = await MongoProducto.find();
  let productosContador = 0;

  for (const p of productosMongo) {
    // Buscar los nuevos IDs usando los mapas
    const marcaIdSQL = p.marca ? marcasMap.get(p.marca.toString()) : null;
    const catIdSQL = p.categoria ? catsMap.get(p.categoria.toString()) : null;

    // Crear producto en MariaDB
    await prisma.producto.create({
      data: {
        nombre: p.nombre,
        descripcion: p.descripcion,
        descripcion_html: p.descripcion_html,
        precio: p.precio,
        stock: p.stock || 0,
        destacado: p.destacado || false,
        imagenes: p.imagenes || [], // Prisma lo convierte a JSON automáticamente
        
        // Relaciones (Foreign Keys)
        marcaId: marcaIdSQL,
        categoriaId: catIdSQL,

        // Variantes (Subdocumentos)
        variantes: {
          create: p.variantes.map((v: any) => ({
            color: v.color,
            imagen: v.imagen,
            tamano: v.tamaño, // Ojo: en tu schema pusimos 'tamano'
            tirador: v.tirador,
            precio_extra: v.precio_extra || 0
          }))
        }
      }
    });
    productosContador++;
  }
  console.log(`✅ ${productosContador} productos migrados.`);

  console.log('🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO!');
}

main()
  .catch((e) => {
    console.error('❌ Error en la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await mongoose.disconnect();
  });