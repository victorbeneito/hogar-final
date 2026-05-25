/**
 * Migra las URLs de productoimagen del formato antiguo de PrestaShop
 * (https://elhogardetusuenos.com/{psId}/nombre.jpg)
 * al nuevo formato local (/img/p/{d1}/{d2}/.../id-home_default.jpg)
 *
 * Uso:
 *   npx tsx scripts/migrar-urls-imagenes-prestashop.ts
 *   npx tsx scripts/migrar-urls-imagenes-prestashop.ts --dry-run   (solo muestra, no actualiza)
 *   npx tsx scripts/migrar-urls-imagenes-prestashop.ts --size large_default
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SIZE_ARG = args.find((a) => a.startsWith("--size"))?.split("=")[1] ?? "home_default";

// Tamaños en orden de preferencia si el principal no existe
const SIZE_FALLBACKS = ["home_default", "large_default", "medium_default", "small_default", "cart_default"];
const PREFERRED_SIZES = SIZE_ARG === "large_default"
  ? ["large_default", "home_default", "medium_default", "small_default", "cart_default"]
  : ["home_default", "large_default", "medium_default", "small_default", "cart_default"];

const PUBLIC_BASE = path.join(process.cwd(), "public");
const PS_IMG_ROOT = path.join(PUBLIC_BASE, "img", "p");

/** Convierte un ID de PS al path de directorio: 4349 → "4/3/4/9" */
function psIdToPath(id: string): string {
  return id.split("").join(path.sep);
}

/** Extrae el ID de PS de una URL del tipo https://elhogardetusuenos.com/4349/nombre.jpg */
function extractPsId(url: string): string | null {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length >= 1 && /^\d+$/.test(segments[0])) {
      return segments[0];
    }
  } catch {
    // URL inválida
  }
  return null;
}

/** Busca el archivo de imagen real en public/img/p/{d1}/{d2}/... y devuelve la URL relativa */
function resolveImageUrl(psId: string): string | null {
  const dirPath = path.join(PS_IMG_ROOT, psIdToPath(psId));
  if (!fs.existsSync(dirPath)) return null;

  for (const size of PREFERRED_SIZES) {
    const candidate = path.join(dirPath, `${psId}-${size}.jpg`);
    if (fs.existsSync(candidate)) {
      return `/img/p/${psId.split("").join("/")}/${psId}-${size}.jpg`;
    }
  }

  // Último recurso: el archivo original sin sufijo
  const original = path.join(dirPath, `${psId}.jpg`);
  if (fs.existsSync(original)) {
    return `/img/p/${psId.split("").join("/")}/${psId}.jpg`;
  }

  return null;
}

async function main() {
  console.log(`\n=== Migración de URLs de imágenes PrestaShop → local ===`);
  console.log(`Tamaño preferido: ${PREFERRED_SIZES[0]}`);
  console.log(`Modo: ${DRY_RUN ? "DRY RUN (sin cambios en BD)" : "REAL (actualizando BD)"}\n`);

  const total = await prisma.productoimagen.count();
  console.log(`Total de registros en productoimagen: ${total}`);

  // Solo procesamos URLs del dominio viejo
  const imagenes = await prisma.productoimagen.findMany({
    where: {
      url: { contains: "elhogardetusuenos.com" },
    },
    select: { id: true, url: true, productoId: true },
  });

  console.log(`URLs con dominio antiguo: ${imagenes.length}\n`);

  let actualizadas = 0;
  let sinArchivo = 0;
  let sinPsId = 0;
  const errores: Array<{ id: number; url: string; razon: string }> = [];

  for (const img of imagenes) {
    const psId = extractPsId(img.url);

    if (!psId) {
      sinPsId++;
      errores.push({ id: img.id, url: img.url, razon: "No se pudo extraer ID de PS" });
      continue;
    }

    const nuevaUrl = resolveImageUrl(psId);

    if (!nuevaUrl) {
      sinArchivo++;
      errores.push({ id: img.id, url: img.url, razon: `Archivo no encontrado para PS ID ${psId}` });
      continue;
    }

    if (!DRY_RUN) {
      await prisma.productoimagen.update({
        where: { id: img.id },
        data: { url: nuevaUrl },
      });
    } else {
      console.log(`  [DRY] #${img.id} (prod ${img.productoId}): ${img.url.substring(0, 60)}... → ${nuevaUrl}`);
    }

    actualizadas++;

    if (actualizadas % 100 === 0) {
      process.stdout.write(`\r  Procesadas: ${actualizadas}/${imagenes.length}...`);
    }
  }

  console.log(`\n\n=== Resultado ===`);
  console.log(`  Actualizadas: ${actualizadas}`);
  console.log(`  Sin archivo en disco: ${sinArchivo}`);
  console.log(`  Sin ID de PS en URL: ${sinPsId}`);

  if (errores.length > 0) {
    const logFile = path.join(process.cwd(), "scripts", "migrar-urls-imagenes-errores.json");
    fs.writeFileSync(logFile, JSON.stringify(errores, null, 2), "utf-8");
    console.log(`\n  Errores guardados en: ${logFile}`);
  }

  if (DRY_RUN) {
    console.log(`\n  (Ejecuta sin --dry-run para aplicar los cambios)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
