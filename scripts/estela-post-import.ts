/**
 * Script post-importación para productos Estela
 *
 * Realiza dos tareas después de importar las combinaciones de Estela:
 *
 * 1. Crea las categorías de Dormitorio si no existen en la BD
 * 2. Marca tieneVariantes=true en todos los productos que tienen combinaciones
 *
 * Uso:
 *   npx tsx scripts/estela-post-import.ts
 *   npx tsx scripts/estela-post-import.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

const CATEGORIAS_ESTELA = [
  { nombre: "Dormitorio",          descripcion: "Productos para el dormitorio" },
  { nombre: "Fundas Nórdicas",     descripcion: "Fundas nórdicas Estela" },
  { nombre: "Ropa de cama",        descripcion: "Ropa de cama Estela" },
  { nombre: "Edredones",           descripcion: "Edredones Estela" },
  { nombre: "Fundas de cojin",     descripcion: "Fundas de cojín Estela" },
  { nombre: "Colchas",             descripcion: "Colchas Estela" },
  { nombre: "Multiusos y plaids",  descripcion: "Multiusos y plaids Estela" },
];

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function crearCategorias() {
  console.log("\n── Paso 1: Categorías ──────────────────────────────────");
  for (const cat of CATEGORIAS_ESTELA) {
    const existe = await prisma.categoria.findFirst({ where: { nombre: cat.nombre } });
    if (existe) {
      console.log(`  ✓ Ya existe: "${cat.nombre}"`);
    } else {
      if (!DRY_RUN) {
        const slug = toSlug(cat.nombre);
        await prisma.categoria.create({
          data: {
            nombre: cat.nombre,
            slug,
            descripcion: cat.descripcion,
            activa: true,
          },
        });
        console.log(`  + Creada: "${cat.nombre}" (slug: ${slug})`);
      } else {
        console.log(`  [DRY] Crearía: "${cat.nombre}" (slug: ${toSlug(cat.nombre)})`);
      }
    }
  }
}

async function marcarTieneVariantes() {
  console.log("\n── Paso 2: tieneVariantes=true ─────────────────────────");

  const productosConVariantes = await prisma.variante.groupBy({
    by: ["productoId"],
  });

  const productoIds = productosConVariantes.map((v) => v.productoId);
  console.log(`  Productos con variantes encontrados: ${productoIds.length}`);

  if (productoIds.length === 0) {
    console.log("  (ninguno — asegúrate de haber importado las combinaciones primero)");
    return;
  }

  const sinMarca = await prisma.producto.findMany({
    where: {
      id: { in: productoIds },
      tieneVariantes: false,
    },
    select: { id: true, referencia: true },
  });

  console.log(`  Sin tieneVariantes=true todavía: ${sinMarca.length}`);

  if (!DRY_RUN) {
    if (sinMarca.length > 0) {
      const result = await prisma.producto.updateMany({
        where: { id: { in: sinMarca.map((p) => p.id) } },
        data: { tieneVariantes: true },
      });
      console.log(`  ✓ Actualizados: ${result.count} productos`);
    }
  } else {
    for (const p of sinMarca.slice(0, 10)) {
      console.log(`  [DRY] Marcaría tieneVariantes=true: ${p.referencia}`);
    }
    if (sinMarca.length > 10) {
      console.log(`  [DRY] ... y ${sinMarca.length - 10} más`);
    }
  }
}

async function main() {
  console.log(`\n=== Script post-importación Estela ===`);
  console.log(`Modo: ${DRY_RUN ? "DRY RUN (sin cambios en BD)" : "REAL"}`);

  await crearCategorias();
  await marcarTieneVariantes();

  console.log("\n✓ Completado.\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
