import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS articulo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      titulo VARCHAR(500) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      extracto TEXT,
      contenidoHtml LONGTEXT NOT NULL DEFAULT '',
      imagenPortada VARCHAR(500),
      autor VARCHAR(255) NOT NULL DEFAULT 'El equipo de tu Hogar',
      activo TINYINT(1) NOT NULL DEFAULT 0,
      destacado TINYINT(1) NOT NULL DEFAULT 0,
      metaTitulo VARCHAR(255),
      metaDescripcion TEXT,
      etiquetas VARCHAR(500),
      vistas INT NOT NULL DEFAULT 0,
      fechaPublicacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE INDEX articulo_slug_key (slug),
      INDEX articulo_activo_idx (activo),
      INDEX articulo_fecha_idx (fechaPublicacion)
    )
  `);
  console.log('✅ Tabla articulo creada correctamente');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
