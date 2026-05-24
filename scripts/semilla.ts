import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Borrando datos antiguos...');
  
  // Limpieza total
  try { await prisma.variante.deleteMany({}); } catch (e) {}
  await prisma.producto.deleteMany({});
  await prisma.marca.deleteMany({});
  await prisma.categoria.deleteMany({});

  console.log('🏗️  Creando Marcas y Categorías...');
  
  await prisma.marca.createMany({
    data: [
      { id: 1, nombre: 'Blindecor' }, { id: 2, nombre: 'Belmarti' },
      { id: 3, nombre: 'HappyStor' }, { id: 4, nombre: 'Generica' },
      { id: 5, nombre: 'Martina Home' },
    ],
  });

  await prisma.categoria.createMany({
    data: [
      { id: 1, nombre: 'Estores' }, { id: 2, nombre: 'Fundas de Sofá' },
      { id: 3, nombre: 'Cojines' }, { id: 4, nombre: 'Manteles' },
      { id: 5, nombre: 'Colchas' }, { id: 6, nombre: 'Ropa de Cama' },
    ],
  });

  console.log('📦  Insertando 28 productos...');

  const productos = [
    { id: 1, nombre: 'Estor digital HSCI97004', precio: 73, stock: 61, destacado: false, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/49554-large_default/happystor-mandala.jpg"] },
    { id: 2, nombre: 'Estor digital HSCC20503', precio: 59.99, stock: 100, destacado: true, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/47052-large_default/happystor-hscc20503.jpg"] },
    { id: 3, nombre: 'Funda sofá Malta', precio: 43.7, stock: 60, destacado: false, marcaId: 5, categoriaId: 2, imagenes: ["https://elhogardetusuenos.com/4020-large_default/funda-sofa-elastica.jpg"] },
    { id: 4, nombre: 'Cojin liso Taver', precio: 9.95, stock: 20, destacado: false, marcaId: 1, categoriaId: 3, imagenes: ["https://elhogardetusuenos.com/50243-large_default/funda-de-cojin.jpg"] },
    { id: 5, nombre: 'Estor digital HSCJ6868', precio: 59.99, stock: 100, destacado: true, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/29143-large_default/happystor-hscj6868.jpg"] },
    { id: 6, nombre: 'Estor liso Lira', precio: 34.25, stock: 30, destacado: true, marcaId: 4, categoriaId: 5, imagenes: ["https://elhogardetusuenos.com/17076-large_default/estor-enrollable-lira.jpg"] },
    { id: 7, nombre: 'Funda Sofá Elegant', precio: 51.3, stock: 70, destacado: false, marcaId: 2, categoriaId: 2, imagenes: ["https://elhogardetusuenos.com/18501-large_default/funda-sofa-elastica-elegant.jpg"] },
    { id: 8, nombre: 'Cojin estampado Oasis', precio: 24.6, stock: 30, destacado: true, marcaId: 1, categoriaId: 3, imagenes: ["https://elhogardetusuenos.com/33325-large_default/funda-cojin-oasis.jpg"] },
    { id: 9, nombre: 'Estor digital HSCC91002', precio: 59.99, stock: 100, destacado: false, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/3838-large_default/happystor-hscc91002.jpg"] },
    { id: 10, nombre: 'Funda nórdica Harry', precio: 71.95, stock: 25, destacado: true, marcaId: 1, categoriaId: 6, imagenes: ["https://elhogardetusuenos.com/32592-large_default/funda-nordica-harry.jpg"] },
    { id: 11, nombre: 'Funda sofá Tunez', precio: 37.8, stock: 35, destacado: false, marcaId: 5, categoriaId: 2, imagenes: ["https://elhogardetusuenos.com/4552-large_default/funda-sofa-tunez.jpg"] },
    { id: 12, nombre: 'Funda sofá Toronto', precio: 39.2, stock: 40, destacado: false, marcaId: 2, categoriaId: 2, imagenes: ["https://elhogardetusuenos.com/18494-large_default/funda-sofa-toronto.jpg"] },
    { id: 13, nombre: 'Cojin liso Porto', precio: 12.95, stock: 15, destacado: false, marcaId: 1, categoriaId: 3, imagenes: ["https://elhogardetusuenos.com/50245-large_default/funda-cojin-porto.jpg"] },
    { id: 14, nombre: 'Estor digital HSCI97011', precio: 59.99, stock: 100, destacado: true, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/4016-large_default/happystor-infantil.jpg"] },
    { id: 15, nombre: 'Estor digital HSCZ94008', precio: 59.99, stock: 100, destacado: false, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/28394-large_default/happystor-zen.jpg"] },
    { id: 16, nombre: 'Estor digital HSCP93006', precio: 59.99, stock: 100, destacado: true, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/23255-large_default/happystor-paisajes.jpg"] },
    { id: 17, nombre: 'Estor digital HSCU4144', precio: 59.99, stock: 100, destacado: false, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/33457-large_default/estor-ciudades.jpg"] },
    { id: 18, nombre: 'Estor digital HSCZ4991', precio: 59.99, stock: 100, destacado: false, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/29134-large_default/estor-zen-2.jpg"] },
    { id: 19, nombre: 'Mantel liso Sevilla', precio: 17.45, stock: 20, destacado: true, marcaId: 1, categoriaId: 4, imagenes: ["https://cdn.shopworld.cloud/media/3/Images/Products/56595.jpg"] },
    { id: 20, nombre: 'Estor Digital HSCP20303', precio: 59.99, stock: 67, destacado: true, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/46952-large_default/happystor-paisaje.jpg"] },
    { id: 21, nombre: 'Estor Digital HSCJ48006', precio: 59.99, stock: 27, destacado: false, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/17630-large_default/estor-juvenil.jpg"] },
    { id: 22, nombre: 'Estor digital HSCU92005', precio: 59.99, stock: 57, destacado: false, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/46903-large_default/estor-ciudades.jpg"] },
    { id: 23, nombre: 'Funda de sofá Tivoli', precio: 45.21, stock: 81, destacado: true, marcaId: 5, categoriaId: 2, imagenes: ["https://elhogardetusuenos.com/3810-large_default/funda-tivoli.jpg"] },
    { id: 24, nombre: 'Estor Liso Ara', precio: 23.66, stock: 17, destacado: true, marcaId: 4, categoriaId: 5, imagenes: ["https://elhogardetusuenos.com/3904-large_default/estor-ara.jpg"] },
    { id: 25, nombre: 'Colcha Mijas', precio: 52.15, stock: 37, destacado: true, marcaId: 1, categoriaId: 6, imagenes: ["https://elhogardetusuenos.com/33004-large_default/colcha-mijas.jpg"] },
    { id: 26, nombre: 'Colcha algodon Banus', precio: 47.6, stock: 76, destacado: false, marcaId: 1, categoriaId: 6, imagenes: ["https://elhogardetusuenos.com/55326-large_default/colcha-banus.jpg"] },
    { id: 27, nombre: 'Estor Digital HSCJ27849', precio: 59.95, stock: 61, destacado: false, marcaId: 3, categoriaId: 1, imagenes: ["https://elhogardetusuenos.com/28559-large_default/estor-juvenil-2.jpg"] },
    { id: 28, nombre: 'Estor prueba nuevo', precio: 47, stock: 52, destacado: false, marcaId: 3, categoriaId: 1, imagenes: [] }
  ];

  for (const prod of productos) {
    await prisma.producto.create({
      data: {
        id: prod.id,
        nombre: prod.nombre,
        descripcion: `Descripción de ${prod.nombre}`,
        precio: prod.precio,
        stock: prod.stock,
        destacado: prod.destacado,
        imagenes: prod.imagenes,
        marcaId: prod.marcaId,
        categoriaId: prod.categoriaId
      }
    });
  }

  console.log('✅ ¡Todo insertado correctamente!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });