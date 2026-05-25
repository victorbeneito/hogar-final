/**
 * Genera un archivo SQL con los UPDATE necesarios para migrar las URLs
 * de productoimagen al formato local /img/p/...
 *
 * Uso: npx tsx scripts/generar-sql-imagenes.ts
 * Luego importa el archivo generado en phpMyAdmin de producción.
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const PREFERRED_SIZES = ["home_default", "large_default", "medium_default", "small_default", "cart_default"];
const PUBLIC_BASE = path.join(process.cwd(), "public");
const PS_IMG_ROOT = path.join(PUBLIC_BASE, "img", "p");

function extractPsId(url: string): string | null {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length >= 1 && /^\d+$/.test(segments[0])) return segments[0];
  } catch {}
  return null;
}

function resolveImageUrl(psId: string): string | null {
  const dirPath = path.join(PS_IMG_ROOT, psId.split("").join(path.sep));
  if (!fs.existsSync(dirPath)) return null;
  for (const size of PREFERRED_SIZES) {
    const candidate = path.join(dirPath, `${psId}-${size}.jpg`);
    if (fs.existsSync(candidate)) {
      return `/img/p/${psId.split("").join("/")}/${psId}-${size}.jpg`;
    }
  }
  const original = path.join(dirPath, `${psId}.jpg`);
  if (fs.existsSync(original)) return `/img/p/${psId.split("").join("/")}/${psId}.jpg`;
  return null;
}

async function main() {
  // La BD local ya fue migrada: buscamos los que YA tienen la URL nueva /img/p/
  // Los IDs son los mismos en producción, así que estos UPDATEs funcionarán allí
  const imagenes = await prisma.productoimagen.findMany({
    where: { url: { startsWith: "/img/p/" } },
    select: { id: true, url: true },
  });

  console.log(`Registros migrados en BD local: ${imagenes.length}`);

  const lines: string[] = [
    "-- Migración URLs productoimagen: PrestaShop → local",
    `-- Generado: ${new Date().toISOString()}`,
    "-- Ejecutar en phpMyAdmin sobre la BD de producción (mi_tienda)",
    "",
  ];

  let ok = 0, skip = 0;

  for (const img of imagenes) {
    const escaped = img.url.replace(/'/g, "\\'");
    lines.push(`UPDATE productoimagen SET url='${escaped}' WHERE id=${img.id};`);
    ok++;
  }

  lines.push("", `-- Total actualizadas: ${ok}, omitidas: ${skip}`);

  const outFile = path.join(process.cwd(), "scripts", "migrar-imagenes-produccion.sql");
  fs.writeFileSync(outFile, lines.join("\n"), "utf-8");
  console.log(`\nArchivo generado: ${outFile}`);
  console.log(`Updates generados: ${ok} | Omitidos: ${skip}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
