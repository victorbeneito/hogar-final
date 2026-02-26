const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');

// Cargar modelos dinámicamente
const mongooseModels = [
  'Admin', 'Categoria', 'Cliente', 'Cupon', 
  'Marca', 'Pedido', 'Producto', 'Usuario'
];

mongooseModels.forEach(modelName => {
  mongoose.models[modelName] = mongoose.models[modelName] || 
    mongoose.model(modelName, new mongoose.Schema({}, { strict: false }));
});

const prisma = new PrismaClient();

async function migrar() {
  try {
    console.log('🔄 Conectando a MariaDB...');
    await prisma.$connect();
    
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('🚀 Iniciando migración completa...');

    // 1. MARCAS
    console.log('📦 Migrando MARCAS...');
    const Marca = mongoose.model('Marca');
    const marcas = await Marca.find();
    for (const m of marcas) {
      await prisma.marca.upsert({
        where: { nombre: m.nombre },
        update: {},
        create: { 
          nombre: m.nombre || '',
          descripcion: m.descripcion || '',
          logo_url: m.logo_url || ''
        }
      });
      console.log(`  ✅ ${m.nombre}`);
    }
    console.log(`✅ ${marcas.length} marcas completadas`);

    // 2. CATEGORÍAS
    console.log('📂 Migrando CATEGORÍAS...');
    const Categoria = mongoose.model('Categoria');
    const categorias = await Categoria.find();
    for (const c of categorias) {
      await prisma.categoria.upsert({
        where: { nombre: c.nombre },
        update: {},
        create: { nombre: c.nombre || '' }
      });
      console.log(`  ✅ ${c.nombre}`);
    }
    console.log(`✅ ${categorias.length} categorías completadas`);

    // 3. PRODUCTOS (🎯 EL MÁS IMPORTANTE)
    console.log('🛍️ Migrando PRODUCTOS...');
    const Producto = mongoose.model('Producto');
    const productos = await Producto.find();
    
    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];
      
      // Buscar marca y categoría por ObjectId convertido a string
      let marcaId = null, categoriaId = null;
      if (p.marca) {
        const marca = await prisma.marca.findFirst({ 
          where: { nombre: String(p.marca).split('"')[1] || String(p.marca) } 
        });
        marcaId = marca?.id || null;
      }
      
      if (p.categoria) {
        const categoria = await prisma.categoria.findFirst({ 
          where: { nombre: String(p.categoria).split('"')[1] || String(p.categoria) } 
        });
        categoriaId = categoria?.id || null;
      }

      // Crear producto
      const nuevoProducto = await prisma.producto.create({
        data: {
          nombre: p.nombre || 'Sin nombre',
          descripcion: p.descripcion || '',
          descripcion_html: p.descripcion_html || '',
          precio: Number(p.precio) || 0,
          stock: Number(p.stock) || 0,
          destacado: Boolean(p.destacado) || false,
          imagenes: JSON.stringify(p.imagenes || []),
          marcaId,
          categoriaId
        }
      });

      // VARIANTEs
      if (p.variantes && Array.isArray(p.variantes)) {
        for (const v of p.variantes) {
          await prisma.variante.create({
            data: {
              color: v.color || '',
              imagen: v.imagen || '',
              tamaño: v.tamaño || '',
              tirador: v.tirador || '',
              precio_extra: Number(v.precio_extra) || 0,
              productoId: nuevoProducto.id
            }
          });
        }
      }
      
      if ((i + 1) % 3 === 0 || i === productos.length - 1) {
        console.log(`  📊 Progreso: ${i + 1}/${productos.length} productos`);
      }
    }

    console.log(`🎉 ✅ MIGRACIÓN COMPLETA: ${productos.length} productos + variantes!`);
    console.log('💡 Ahora prueba tu tienda con MariaDB → npm run dev');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
    mongoose.disconnect();
  }
}

migrar();
