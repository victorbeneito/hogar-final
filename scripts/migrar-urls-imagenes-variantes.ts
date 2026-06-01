/**
 * Migra las URLs de imágenes de combinaciones/variantes
 * del formato antiguo de PrestaShop
 *   https://elhogardetusuenos.com/img/p/3/9/1/1/3911.jpg
 * al nuevo formato local
 *   /img/p/3/9/1/1/3911-home_default.jpg
 *
 * También convierte el formato sin /img/p/:
 *   https://elhogardetusuenos.com/4438/nombre.jpg
 * al formato local:
 *   /img/p/4/4/3/8/4438-home_default.jpg
 *
 * Campos afectados en la tabla variante: imagen, imagenMuestra, imagenesVariante
 *
 * Uso:
 *   npx tsx scripts/migrar-urls-imagenes-variantes.ts
 *   npx tsx scripts/migrar-urls-imagenes-variantes.ts --dry-run
 *   npx tsx scripts/migrar-urls-imagenes-variantes.ts --size large_default
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SIZE_ARG = args.find((a) => a.startsWith("--size="))?.split("=")[1] ?? "home_default";

const PREFERRED_SIZES = SIZE_ARG === "large_default"
  ? ["large_default", "home_default", "medium_default", "small_default", "cart_default"]
  : ["home_default", "large_default", "medium_default", "small_default", "cart_default"];

const PUBLIC_BASE = path.join(process.cwd(), "public");
const PS_IMG_ROOT = path.join(PUBLIC_BASE, "img", "p");

/** Convierte un ID al path de directorio: 3911 → "3/9/1/1" */
function psIdToPath(id: string): string {
  return id.split("").join(path.sep);
}

/**
 * Intenta resolver una URL de PS a una URL local.
 * Maneja dos formatos:
 *  1. https://elhogardetusuenos.com/img/p/3/9/1/1/3911.jpg  → extrae imageId = 3911
 *  2. https://elhogardetusuenos.com/4438/nombre.jpg          → extrae psId = 4438
 */
function resolveToLocalUrl(url: string): string | null {
  if (!url || !url.includes("elhogardetusuenos.com")) return null;

  try {
    const u = new URL(url);
    const pathname = u.pathname;

    // Formato 1: /img/p/D/I/G/I/T/S/imageId.jpg
    if (pathname.startsWith("/img/p/")) {
      const afterImgP = pathname.replace(/^\/img\/p\//, "");
      const parts = afterImgP.split("/");
      // Último segmento es "imageId.jpg"
      const lastSegment = parts[parts.length - 1];
      const imageId = lastSegment.replace(/\.[^.]+$/, ""); // quitar extensión

      if (!imageId || !/^\d+$/.test(imageId)) return null;

      const dirPath = path.join(PS_IMG_ROOT, psIdToPath(imageId));
      return resolveImageFile(imageId, dirPath);
    }

    // Formato 2: /{psId}/nombre.jpg
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length >= 1 && /^\d+$/.test(segments[0])) {
      const psId = segments[0];
      const dirPath = path.join(PS_IMG_ROOT, psIdToPath(psId));
      return resolveImageFile(psId, dirPath);
    }

  } catch {
    // URL inválida
  }

  return null;
}

/** Busca el archivo de imagen con tamaño preferido */
function resolveImageFile(imageId: string, dirPath: string): string | null {
  if (!fs.existsSync(dirPath)) return null;

  for (const size of PREFERRED_SIZES) {
    const candidate = path.join(dirPath, `${imageId}-${size}.jpg`);
    if (fs.existsSync(candidate)) {
      return `/img/p/${imageId.split("").join("/")}/${imageId}-${size}.jpg`;
    }
  }

  // Último recurso: archivo original sin sufijo de tamaño
  const original = path.join(dirPath, `${imageId}.jpg`);
  if (fs.existsSync(original)) {
    return `/img/p/${imageId.split("").join("/")}/${imageId}.jpg`;
  }

  return null;
}

/** Convierte una lista de URLs separadas por | */
function convertUrlList(raw: string): { converted: string; changed: boolean } {
  const urls = raw.split("|").map((s) => s.trim()).filter(Boolean);
  let changed = false;
  const converted = urls.map((url) => {
    if (!url.includes("elhogardetusuenos.com")) return url;
    const local = resolveToLocalUrl(url);
    if (local && local !== url) {
      changed = true;
      return local;
    }
    return url; // si no se pudo convertir, dejar como está
  });
  return { converted: converted.join("|"), changed };
}

async function main() {
  console.log(`\n=== Migración de URLs de imágenes de Variantes/Combinaciones ===`);
  console.log(`Tamaño preferido: ${PREFERRED_SIZES[0]}`);
  console.log(`Modo: ${DRY_RUN ? "DRY RUN (sin cambios en BD)" : "REAL (actualizando BD)"}\n`);

  // Buscar variantes que tienen al menos un campo con URL de PS
  const variantes = await prisma.variante.findMany({
    where: {
      OR: [
        { imagen: { contains: "elhogardetusuenos.com" } },
        { imagenMuestra: { contains: "elhogardetusuenos.com" } },
        { imagenesVariante: { contains: "elhogardetusuenos.com" } },
      ],
    },
    select: {
      id: true,
      referencia: true,
      imagen: true,
      imagenMuestra: true,
      imagenesVariante: true,
    },
  });

  console.log(`Variantes con URLs de PS: ${variantes.length}\n`);

  let totalActualizadas = 0;
  let totalSinArchivo = 0;
  const errores: Array<{ varianteId: number; referencia: string | null; campo: string; urlOriginal: string; razon: string }> = [];

  for (const variante of variantes) {
    const updates: Record<string, string> = {};
    let hasChanges = false;

    // --- Campo: imagen ---
    if (variante.imagen && variante.imagen.includes("elhogardetusuenos.com")) {
      const local = resolveToLocalUrl(variante.imagen);
      if (local) {
        updates.imagen = local;
        hasChanges = true;
      } else {
        totalSinArchivo++;
        errores.push({ varianteId: variante.id, referencia: variante.referencia, campo: "imagen", urlOriginal: variante.imagen, razon: "Archivo no encontrado" });
      }
    }

    // --- Campo: imagenMuestra ---
    if (variante.imagenMuestra && variante.imagenMuestra.includes("elhogardetusuenos.com")) {
      const local = resolveToLocalUrl(variante.imagenMuestra);
      if (local) {
        updates.imagenMuestra = local;
        hasChanges = true;
      } else {
        totalSinArchivo++;
        errores.push({ varianteId: variante.id, referencia: variante.referencia, campo: "imagenMuestra", urlOriginal: variante.imagenMuestra, razon: "Archivo no encontrado" });
      }
    }

    // --- Campo: imagenesVariante (lista separada por |) ---
    if (variante.imagenesVariante && variante.imagenesVariante.includes("elhogardetusuenos.com")) {
      const { converted, changed } = convertUrlList(variante.imagenesVariante);
      if (changed) {
        updates.imagenesVariante = converted;
        hasChanges = true;
      } else if (variante.imagenesVariante.includes("elhogardetusuenos.com")) {
        // Al menos una URL no se pudo convertir
        totalSinArchivo++;
        errores.push({ varianteId: variante.id, referencia: variante.referencia, campo: "imagenesVariante", urlOriginal: variante.imagenesVariante, razon: "Una o más URLs sin archivo local" });
      }
    }

    if (!hasChanges) continue;

    if (DRY_RUN) {
      console.log(`  [DRY] Variante #${variante.id} (${variante.referencia ?? "sin ref"}):`);
      for (const [campo, valor] of Object.entries(updates)) {
        console.log(`    ${campo}: ${valor.substring(0, 80)}`);
      }
    } else {
      await prisma.variante.update({
        where: { id: variante.id },
        data: updates,
      });
    }

    totalActualizadas++;

    if (totalActualizadas % 200 === 0) {
      process.stdout.write(`\r  Procesadas: ${totalActualizadas}/${variantes.length}...`);
    }
  }

  console.log(`\n\n=== Resultado ===`);
  console.log(`  Variantes actualizadas: ${totalActualizadas}`);
  console.log(`  URLs sin archivo local: ${totalSinArchivo}`);

  if (errores.length > 0) {
    const logFile = path.join(process.cwd(), "scripts", "migrar-urls-variantes-errores.json");
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
