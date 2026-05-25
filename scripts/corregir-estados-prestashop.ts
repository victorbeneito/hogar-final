/**
 * Corrige el estado (estado + estadoPago) de los pedidos ya importados de PrestaShop.
 *
 * Uso:
 *   npx tsx scripts/corregir-estados-prestashop.ts --inputDir "importacion/Archivos prestashop/pedidos"
 *
 * Archivos esperados en la carpeta:
 *   ps_orders*.csv           (requerido)
 *   ps_order_state*.csv      (recomendado para mapeo por ID)
 *   ps_order_state_lang*.csv (recomendado para nombres en español)
 *
 * Opciones:
 *   --inputDir <ruta>   Carpeta con los CSV de PrestaShop
 *   --since <fecha>     Limita la corrección a pedidos con fecha_add >= fecha (opcional)
 *   --dry-run           Muestra qué cambiaría sin escribir en la base de datos
 *   --help              Muestra esta ayuda
 *
 * NOTA: Este script NO envía correos. Usa Prisma directamente, sin pasar por la API.
 */

import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import dotenv from "dotenv";
import Papa from "papaparse";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const DEFAULT_INPUT_DIR = "importacion/Archivos prestashop/pedidos";

let prismaInstance: any = null;

type CsvRow = Record<string, string>;
type OrderStatus = "PENDIENTE" | "PROCESANDO" | "ENVIADO" | "ENTREGADO" | "CUESTIONARIO" | "CANCELADO" | "DEVUELTO";
type OrderPaymentStatus = "PENDIENTE" | "PAGADO" | "FALLIDO" | "REEMBOLSADO";

// ─── Utilidades básicas ───────────────────────────────────────────────────────

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function parseBool(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "si", "sí", "s", "yes", "y", "activo"].includes(normalizeText(value).toLowerCase());
}

function parseDate(value: unknown): Date | null {
  const normalized = normalizeText(value);
  if (!normalized || normalized.startsWith("0000-00-00")) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function detectDelimiter(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 5);
  const candidates = [";", ",", "\t", "|"];
  let best = ";";
  let bestScore = -1;
  for (const c of candidates) {
    const score = lines.reduce((sum, l) => sum + Math.max(0, l.split(c).length - 1), 0);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore > 0 ? best : ";";
}

async function readCsvRows(filePath: string): Promise<CsvRow[]> {
  const text = await fs.readFile(filePath, "utf8");
  const delimiter = detectDelimiter(text);
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
    transformHeader: (h: string) => h.replace(/^﻿/, "").trim(),
  });
  if (parsed.errors.length > 0) {
    throw new Error(`Error leyendo ${path.basename(filePath)}: ${parsed.errors[0].message}`);
  }
  return (parsed.data || []).filter((row: CsvRow) => Object.values(row).some((v) => normalizeText(v)));
}

async function findCsvFile(inputDir: string, regexes: RegExp[], required = true): Promise<string | null> {
  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name).sort((a, b) => a.localeCompare(b));
  for (const regex of regexes) {
    const matches = files.filter((f) => regex.test(f));
    if (matches.length > 0) return path.join(inputDir, matches[matches.length - 1]);
  }
  if (required) throw new Error(`No se encontró CSV que coincida con: ${regexes.map((r) => r.toString()).join(" | ")}`);
  return null;
}

function getArgValue(args: string[], name: string, fallback?: string) {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith("--")) return args[idx + 1];
  const equalsArg = args.find((a) => a.startsWith(`${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 1);
  return fallback;
}

// ─── Progress reporter minimalista ───────────────────────────────────────────

function createProgressReporter(isInteractive: boolean) {
  let total = 0;
  let completed = 0;

  const clear = () => {
    if (!isInteractive) return;
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  };

  const render = (label: string) => {
    if (!isInteractive) return;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    clear();
    process.stdout.write(`[${pct.toString().padStart(3)}%] ${completed}/${total} | ${label}`);
  };

  return {
    start(t: number) { total = t; completed = 0; },
    tick(label: string) { completed++; render(label); },
    note(msg: string) {
      if (isInteractive) { clear(); process.stdout.write("\n"); }
      console.log(msg);
      if (isInteractive) render("");
    },
    finish(msg: string) {
      if (isInteractive) { clear(); process.stdout.write("\n"); }
      console.log(msg);
    },
  };
}

// ─── Mapeo de estados PrestaShop ──────────────────────────────────────────────

type PrestashopStateMeta = {
  id: number;
  name: string;
  color: string | null;
  shipped: boolean;
  paid: boolean;
};

// Mapeo explícito por ID (cubre los estados detectados en los CSV exportados)
const PRESTASHOP_ESTADO_MAP: Record<number, { estado: OrderStatus; estadoPago: OrderPaymentStatus }> = {
  1:  { estado: "PENDIENTE",    estadoPago: "PENDIENTE"   }, // En espera de pago por cheque
  2:  { estado: "PROCESANDO",   estadoPago: "PAGADO"      }, // Pago aceptado
  3:  { estado: "PROCESANDO",   estadoPago: "PAGADO"      }, // Preparación en curso
  4:  { estado: "ENVIADO",      estadoPago: "PAGADO"      }, // Enviado
  5:  { estado: "ENTREGADO",    estadoPago: "PAGADO"      }, // Entregado
  6:  { estado: "CANCELADO",    estadoPago: "PENDIENTE"   }, // Cancelado
  7:  { estado: "DEVUELTO",     estadoPago: "REEMBOLSADO" }, // Reembolsado
  8:  { estado: "PENDIENTE",    estadoPago: "FALLIDO"     }, // Error en pago
  9:  { estado: "PROCESANDO",   estadoPago: "PAGADO"      }, // Sin stock (pagado)
  10: { estado: "PENDIENTE",    estadoPago: "PENDIENTE"   }, // En espera de transferencia
  11: { estado: "PROCESANDO",   estadoPago: "PAGADO"      }, // Pago remoto aceptado
  12: { estado: "PENDIENTE",    estadoPago: "PENDIENTE"   }, // Sin stock (no pagado)
  13: { estado: "PENDIENTE",    estadoPago: "PENDIENTE"   }, // Contra reembolso pendiente
  17: { estado: "ENTREGADO",    estadoPago: "PAGADO"      }, // Pedido finalizado
  18: { estado: "CUESTIONARIO", estadoPago: "PAGADO"      }, // Cuestionario
  19: { estado: "PENDIENTE",    estadoPago: "PENDIENTE"   }, // CONFLICTO
  20: { estado: "DEVUELTO",     estadoPago: "REEMBOLSADO" }, // Devolución
  21: { estado: "CANCELADO",    estadoPago: "PENDIENTE"   }, // Aliexpress Cancelado
  22: { estado: "PROCESANDO",   estadoPago: "PAGADO"      }, // Aliexpress Esperando Envío
  23: { estado: "PROCESANDO",   estadoPago: "PAGADO"      }, // Aliexpress Esperando Envío parcial
  24: { estado: "ENVIADO",      estadoPago: "PAGADO"      }, // Aliexpress Esperando recepción cliente
  25: { estado: "PENDIENTE",    estadoPago: "PENDIENTE"   }, // Aliexpress Incidencia
  26: { estado: "CANCELADO",    estadoPago: "PENDIENTE"   }, // Aliexpress Bloqueado
  29: { estado: "ENTREGADO",    estadoPago: "PAGADO"      }, // Aliexpress Finalizado
  30: { estado: "ENTREGADO",    estadoPago: "PAGADO"      }, // Aliexpress Completado
  31: { estado: "PROCESANDO",   estadoPago: "PAGADO"      }, // Pago Tarjeta
  33: { estado: "PROCESANDO",   estadoPago: "PAGADO"      }, // Aliexpress Pago aceptado
  34: { estado: "ENVIADO",      estadoPago: "PAGADO"      }, // Aliexpress Enviado pedido
  35: { estado: "CANCELADO",    estadoPago: "PENDIENTE"   }, // Aliexpress Cancelado pedido
  36: { estado: "ENTREGADO",    estadoPago: "PAGADO"      }, // Aliexpress Pedido recibido
  37: { estado: "PENDIENTE",    estadoPago: "PENDIENTE"   }, // Bizum (pendiente confirmación)
};

function buildStateMeta(stateRows: CsvRow[], stateLangRows: CsvRow[]): Map<number, PrestashopStateMeta> {
  const selectedLang = stateLangRows.some((r) => normalizeText(r.id_lang) === "1") ? "1" : stateLangRows[0]?.id_lang ?? null;
  const labels = new Map<number, string>();
  for (const row of stateLangRows) {
    const id = Number(normalizeText(row.id_order_state));
    if (!Number.isInteger(id)) continue;
    if (selectedLang && normalizeText(row.id_lang) !== selectedLang) continue;
    const name = normalizeText(row.name);
    if (name && !labels.has(id)) labels.set(id, name);
  }

  const meta = new Map<number, PrestashopStateMeta>();
  for (const row of stateRows) {
    const id = Number(normalizeText(row.id_order_state));
    if (!Number.isInteger(id)) continue;
    meta.set(id, {
      id,
      name: labels.get(id) || `Estado ${id}`,
      color: normalizeText(row.color) || null,
      shipped: parseBool(row.shipped),
      paid: parseBool(row.paid),
    });
  }
  return meta;
}

function resolveStatus(orderRow: CsvRow, stateMeta: Map<number, PrestashopStateMeta>): {
  estado: OrderStatus;
  estadoPago: OrderPaymentStatus;
  label: string;
  color: string | null;
  stateId: number;
} {
  const stateId = Number(normalizeText(orderRow.current_state));
  const meta = Number.isInteger(stateId) ? stateMeta.get(stateId) : undefined;
  const label = meta?.name || `Estado ${normalizeText(orderRow.current_state) || "desconocido"}`;

  // Mapeo explícito por ID (fuente primaria)
  const explicit = Number.isInteger(stateId) ? PRESTASHOP_ESTADO_MAP[stateId] : undefined;
  if (explicit) {
    return { ...explicit, label, color: meta?.color ?? null, stateId };
  }

  // Fallback por palabras clave en el nombre del estado
  const normalized = label.toLowerCase();
  const valid = parseBool(orderRow.valid, false);
  let estado: OrderStatus = "PENDIENTE";
  if (normalized.includes("cuestionario")) {
    estado = "CUESTIONARIO";
  } else if (normalized.includes("entreg") || normalized.includes("finalizado") || normalized.includes("completado")) {
    estado = "ENTREGADO";
  } else if (normalized.includes("enviad") || meta?.shipped) {
    estado = "ENVIADO";
  } else if (normalized.includes("cancel")) {
    estado = "CANCELADO";
  } else if (normalized.includes("reembols") || normalized.includes("devol") || normalized.includes("refund")) {
    estado = "DEVUELTO";
  } else if (normalized.includes("prepar") || normalized.includes("acept") || meta?.paid) {
    estado = "PROCESANDO";
  }

  let estadoPago: OrderPaymentStatus = valid || meta?.paid ? "PAGADO" : "PENDIENTE";
  if (normalized.includes("error") || normalized.includes("fall")) estadoPago = "FALLIDO";
  else if (normalized.includes("reembols") || normalized.includes("devol") || normalized.includes("refund")) estadoPago = "REEMBOLSADO";

  return { estado, estadoPago, label, color: meta?.color ?? null, stateId };
}

function resolveOrderNumber(orderRow: CsvRow) {
  return normalizeText(orderRow.reference) || `PS-${normalizeText(orderRow.id_order) || "?"}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log([
      "Corrector de estados de pedidos PrestaShop",
      "",
      "Uso:",
      "  npx tsx scripts/corregir-estados-prestashop.ts --inputDir \"importacion/Archivos prestashop/pedidos\"",
      "",
      "Archivos esperados:",
      "  ps_orders*.csv           (requerido)",
      "  ps_order_state*.csv      (recomendado)",
      "  ps_order_state_lang*.csv (recomendado)",
      "",
      "Opciones:",
      "  --inputDir <ruta>   Carpeta con los CSV exportados de PrestaShop",
      "  --since <fecha>     Solo corrige pedidos con date_add >= fecha (YYYY-MM-DD)",
      "  --dry-run           Muestra cambios sin escribir en la base de datos",
      "  --help              Muestra esta ayuda",
      "",
      "NOTA: Este script NO envía correos ni modifica clientes ni direcciones.",
    ].join("\n"));
    return;
  }

  const inputDirArg = getArgValue(args, "--inputDir", DEFAULT_INPUT_DIR) || DEFAULT_INPUT_DIR;
  const sinceArg = getArgValue(args, "--since");
  const dryRun = args.includes("--dry-run") || args.includes("--dryRun");
  const inputDir = path.isAbsolute(inputDirArg) ? inputDirArg : path.resolve(process.cwd(), inputDirArg);
  const sinceDate = sinceArg ? parseDate(sinceArg) : null;

  if (sinceArg && !sinceDate) throw new Error(`Fecha --since inválida: ${sinceArg}`);

  const orderFile = await findCsvFile(inputDir, [/^ps_orders.*\.csv$/i]);
  const stateFile = await findCsvFile(inputDir, [/^ps_order_state[^_].*\.csv$/i, /^ps_order_state\.csv$/i], false);
  const stateLangFile = await findCsvFile(inputDir, [/^ps_order_state_lang.*\.csv$/i], false);

  console.log(`Input dir: ${inputDir}`);
  console.log(`Pedidos:   ${path.basename(orderFile!)}`);
  if (stateFile) console.log(`Estados:   ${path.basename(stateFile)}`);
  else console.log("Estados:   NO encontrado — se usará mapeo por palabras clave");
  if (stateLangFile) console.log(`Estados idioma: ${path.basename(stateLangFile)}`);
  if (sinceDate) console.log(`Desde:     ${sinceArg}`);
  if (dryRun) console.log("Modo:      DRY-RUN — no se escribirá nada en la base de datos");
  console.log("");

  const [orderRows, stateRows, stateLangRows] = await Promise.all([
    readCsvRows(orderFile!),
    stateFile ? readCsvRows(stateFile) : Promise.resolve<CsvRow[]>([]),
    stateLangFile ? readCsvRows(stateLangFile) : Promise.resolve<CsvRow[]>([]),
  ]);

  const stateMeta = buildStateMeta(stateRows, stateLangRows);

  // Filtrar por fecha si se especificó --since
  let filteredOrders = orderRows;
  if (sinceDate) {
    filteredOrders = orderRows.filter((row) => {
      const d = parseDate(row.date_add);
      return d && d >= sinceDate;
    });
    console.log(`Pedidos en CSV: ${orderRows.length} | Filtrados desde ${sinceArg}: ${filteredOrders.length}`);
  } else {
    console.log(`Pedidos en CSV: ${orderRows.length}`);
  }
  console.log("");

  if (!dryRun) {
    const prismaModule = await import("../generated/prisma/client.ts");
    prismaInstance = new prismaModule.PrismaClient();
  }

  const counts = {
    updated: 0,
    alreadyCorrect: 0,
    notFound: 0,
    errors: 0,
  };

  const stateChangeSummary = new Map<string, number>(); // "VIEJO→NUEVO" → count

  const progress = createProgressReporter(Boolean(process.stdout.isTTY));
  progress.start(filteredOrders.length);

  for (const orderRow of filteredOrders) {
    const numeroPedido = resolveOrderNumber(orderRow);
    progress.tick(numeroPedido);

    try {
      const { estado, estadoPago, label, stateId } = resolveStatus(orderRow, stateMeta);

      if (dryRun) {
        // En dry-run solo mostramos el mapeo cada 200 pedidos o el primero de cada estado
        const key = `${stateId}→${estado}`;
        if (!stateChangeSummary.has(key)) {
          progress.note(`[dry-run] id_state=${stateId} (${label}) → estado=${estado} | estadoPago=${estadoPago}`);
        }
        stateChangeSummary.set(key, (stateChangeSummary.get(key) ?? 0) + 1);
        counts.updated++;
        continue;
      }

      // Buscar el pedido en la base de datos
      const existingRows = await prismaInstance.$queryRaw<Array<{ id: number; estado: string; estadoPago: string }>>`
        SELECT id, estado, estadoPago
        FROM pedido
        WHERE numeroPedido = ${numeroPedido}
        LIMIT 1
      `;

      if (existingRows.length === 0) {
        counts.notFound++;
        continue;
      }

      const existing = existingRows[0];
      const estadoActual = normalizeText(existing.estado);
      const estadoPagoActual = normalizeText(existing.estadoPago);

      if (estadoActual === estado && estadoPagoActual === estadoPago) {
        counts.alreadyCorrect++;
        continue;
      }

      // Registrar el cambio en el resumen
      const changeKey = `${estadoActual}→${estado}`;
      stateChangeSummary.set(changeKey, (stateChangeSummary.get(changeKey) ?? 0) + 1);

      await prismaInstance.$executeRaw`
        UPDATE pedido
        SET
          estado     = ${estado},
          estadoPago = ${estadoPago},
          updatedAt  = ${new Date()}
        WHERE id = ${existing.id}
      `;

      counts.updated++;
    } catch (error: any) {
      counts.errors++;
      progress.note(`Error en ${numeroPedido}: ${error?.message || error}`);
    }
  }

  progress.finish("");

  console.log("─".repeat(60));
  console.log(dryRun ? "Resumen (DRY-RUN — sin cambios reales):" : "Resumen:");
  if (!dryRun) {
    console.log(`  Actualizados:        ${counts.updated}`);
    console.log(`  Ya correctos:        ${counts.alreadyCorrect}`);
    console.log(`  No encontrados en BD: ${counts.notFound}`);
    if (counts.errors > 0) console.log(`  Errores:             ${counts.errors}`);
  } else {
    console.log(`  Pedidos que se actualizarían: ${counts.updated}`);
  }

  if (stateChangeSummary.size > 0) {
    console.log("");
    console.log(dryRun ? "Mapeo de estados (ID PrestaShop → estado en la app):" : "Cambios de estado realizados:");
    for (const [key, count] of [...stateChangeSummary.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${key.padEnd(30)} × ${count}`);
    }
  }
}

main()
  .catch((error: any) => {
    console.error("\nError corrigiendo estados:");
    console.error(error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaInstance?.$disconnect) {
      await prismaInstance.$disconnect();
    }
  });
