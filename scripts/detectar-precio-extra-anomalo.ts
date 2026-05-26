// @ts-nocheck
/**
 * Detecta productos erróneos identificándolos por la señal:
 *   tamano='80x180'  y  precio_extra=210.55 en alguna de sus combinaciones.
 *
 * Una vez detectados, exporta TODAS las combinaciones de esos productos
 * a un CSV listo para reimportar con los precios corregidos.
 *
 * Uso:
 *   npx tsx scripts/detectar-precio-extra-anomalo.ts
 *   npx tsx scripts/detectar-precio-extra-anomalo.ts --tamano "80x180" --precio-anomalo 210.55
 *
 * Salida: importacion/correccion-precio-extra-<timestamp>.csv
 * → Rellena la columna precio_extra con los valores correctos antes de importar.
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

function getArg(name: string, fallback?: string): string | undefined {
  const args = process.argv.slice(2);
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith("--")) return args[idx + 1];
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  return fallback;
}

function toCsvField(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function formatPrecio(n: number | null | undefined): string {
  if (n === null || n === undefined) return "0";
  return n.toFixed(2).replace(".", ",");
}

async function main() {
  const tamanoSenal   = getArg("--tamano", "80x180") ?? "80x180";
  const precioAnomalo = parseFloat(getArg("--precio-anomalo", "210.55") ?? "210.55");

  console.log("─".repeat(65));
  console.log("Detector de productos con combinaciones erróneas");
  console.log("─".repeat(65));
  console.log(`  Señal de detección: tamano='${tamanoSenal}' + precio_extra=${precioAnomalo}`);
  console.log("  Exporta TODAS las combinaciones de los productos afectados.");
  console.log("");

  // ── 1. Encontrar IDs de productos afectados ───────────────────────────────
  const variantesSenal = await prisma.variante.findMany({
    where: {
      tamano: tamanoSenal,
      precio_extra: precioAnomalo,
    },
    select: { productoId: true },
    distinct: ["productoId"],
  });

  if (variantesSenal.length === 0) {
    console.log(`✓ No se encontraron productos con la señal indicada.`);
    console.log("  Comprueba que el tamano y precio_extra anómalo son correctos.");
    return;
  }

  const productosAfectadosIds = variantesSenal.map((v) => v.productoId);
  console.log(`⚠  ${productosAfectadosIds.length} productos afectados detectados.`);
  console.log("  Obteniendo todas sus combinaciones...\n");

  // ── 2. Obtener TODAS las combinaciones de esos productos ──────────────────
  const productos = await prisma.producto.findMany({
    where: { id: { in: productosAfectadosIds } },
    select: {
      id: true,
      referencia: true,
      nombre: true,
      variante: {
        orderBy: { id: "asc" },
      },
    },
    orderBy: { referencia: "asc" },
  });

  // ── 3. Mostrar resumen en consola ─────────────────────────────────────────
  let totalVariantes = 0;

  console.log(
    "  " +
      "Ref. producto".padEnd(16) +
      "  " +
      "Nombre".padEnd(40) +
      "  Combinaciones"
  );
  console.log("  " + "─".repeat(74));

  for (const p of productos) {
    const refProd  = p.referencia ?? "(sin ref)";
    const nombre   = (p.nombre ?? "").slice(0, 40);
    const numVars  = p.variante.length;
    totalVariantes += numVars;
    console.log(
      "  " +
        refProd.padEnd(16) +
        "  " +
        nombre.padEnd(40) +
        `  ${numVars}`
    );
  }

  console.log("  " + "─".repeat(74));
  console.log(`  Total: ${totalVariantes} combinaciones en ${productos.length} productos\n`);

  // ── 4. Generar CSV ────────────────────────────────────────────────────────
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const ts =
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes());

  const outDir = path.resolve(process.cwd(), "importacion");
  await fs.promises.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `correccion-precio-extra-${ts}.csv`);

  const lines: string[] = [];
  lines.push(
    "accion;productoReferencia;referencia;stock;precio_extra;imagen;imagenMuestra;imagenesVariante;color;tamano;tirador\n"
  );

  for (const p of productos) {
    for (const v of p.variante) {
      const row = [
        "upsert",
        toCsvField(p.referencia),
        toCsvField(v.referencia),
        toCsvField(v.stock),
        "", // ← precio_extra: déjalo vacío para rellenar manualmente
        toCsvField(v.imagen),
        toCsvField(v.imagenMuestra),
        toCsvField(v.imagenesVariante),
        toCsvField(v.color),
        toCsvField(v.tamano),
        toCsvField(v.tirador),
      ].join(";");
      lines.push(row + "\n");
    }
  }

  await fs.promises.writeFile(outPath, lines.join(""), "utf8");

  console.log("─".repeat(65));
  console.log(`✅ CSV generado: ${path.relative(process.cwd(), outPath)}`);
  console.log("");
  console.log("  PRÓXIMOS PASOS:");
  console.log("  1. Abre el CSV (con Excel u hoja de cálculo)");
  console.log("  2. Rellena la columna precio_extra con los valores correctos");
  console.log("     (usa coma como separador decimal, ej: 195,50)");
  console.log("  3. Guarda como CSV con separador punto y coma (;)");
  console.log("  4. Admin → Importar → Combinaciones → sube el CSV");
  console.log("─".repeat(65));
}

main()
  .catch((e) => {
    console.error("\nError:", e?.message || e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
