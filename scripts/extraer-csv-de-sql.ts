/**
 * Extrae las tablas de PrestaShop necesarias para la importación de pedidos y clientes
 * desde un dump SQL de MariaDB/MySQL y las guarda como archivos CSV.
 *
 * Uso:
 *   npx tsx scripts/extraer-csv-de-sql.ts
 *   npx tsx scripts/extraer-csv-de-sql.ts --sqlFile mysql_data/archivo.sql
 *   npx tsx scripts/extraer-csv-de-sql.ts --sqlFile mysql_data/archivo.sql --outputDir importacion/pedidos
 *
 * Tablas extraídas:
 *   ps_customer, ps_address, ps_orders, ps_order_detail,
 *   ps_order_state, ps_order_state_lang
 *
 * NOTA: El archivo SQL puede ser muy grande. El script lo procesa en streaming
 * sin cargarlo entero en memoria. Cada INSERT de tabla grande se parsea en el momento.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const TARGET_TABLES = [
  "ps_customer",
  "ps_address",
  "ps_orders",
  "ps_order_detail",
  "ps_order_state",
  "ps_order_state_lang",
];

const DEFAULT_SQL_FILE = "mysql_data/hogar_2k25_2026-05-25_08-13-42.sql";
const DEFAULT_OUTPUT_DIR = "importacion/Archivos prestashop/pedidos";

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function toCsvField(value: string): string {
  // Eliminar bytes nulos que MariaDB puede incluir en datos binarios
  const clean = value.replace(/\0/g, "");
  if (clean.includes(";") || clean.includes('"') || clean.includes("\n") || clean.includes("\r")) {
    return '"' + clean.replace(/"/g, '""') + '"';
  }
  return clean;
}

function rowToCsvLine(row: string[]): string {
  return row.map(toCsvField).join(";") + "\n";
}

// ─── SQL VALUES parser ────────────────────────────────────────────────────────
//
// Parsea el contenido de un INSERT INTO ... VALUES (...),(...);
// Maneja: NULL, números, cadenas con escapes MySQL (\', \\, \n, \r, \t, \0),
// cadenas con comillas dobles '', y filas múltiples en un único INSERT.

function parseInsertLine(line: string): string[][] {
  const rows: string[][] = [];

  // Buscar la posición de VALUES (ignorando posibles nombres de columna en el INSERT)
  const valuesMatch = line.match(/ VALUES \(/i);
  if (!valuesMatch || valuesMatch.index === undefined) return rows;

  let i = valuesMatch.index + valuesMatch[0].length - 1; // apunta a '('
  const n = line.length;

  const skip = () => {
    while (i < n && (line[i] === " " || line[i] === "\t" || line[i] === "\n" || line[i] === "\r")) i++;
  };

  const readValue = (): string => {
    skip();
    if (i >= n) return "";

    const ch = line[i];

    // Cadena entre comillas simples
    if (ch === "'") {
      i++;
      let val = "";
      while (i < n) {
        const c = line[i];
        if (c === "\\") {
          const next = line[i + 1];
          switch (next) {
            case "'":  val += "'";  break;
            case "\\":  val += "\\"; break;
            case "n":  val += "\n"; break;
            case "r":  val += "\r"; break;
            case "t":  val += "\t"; break;
            case "0":  val += "";   break; // null byte → ignorar
            case "Z":  val += "";   break; // ctrl-Z → ignorar
            case "b":  val += "\b"; break;
            default:   val += next; break;
          }
          i += 2;
        } else if (c === "'") {
          if (i + 1 < n && line[i + 1] === "'") {
            // Comilla doble escapada ''
            val += "'";
            i += 2;
          } else {
            i++; // cierre de cadena
            break;
          }
        } else {
          val += c;
          i++;
        }
      }
      return val;
    }

    // NULL
    if (line.slice(i, i + 4) === "NULL") {
      i += 4;
      return "";
    }

    // Valor sin comillas (número, fecha sin comillas, hex literal)
    let val = "";
    while (i < n && line[i] !== "," && line[i] !== ")") {
      val += line[i++];
    }
    return val.trim();
  };

  skip();

  while (i < n) {
    skip();
    if (i >= n || line[i] !== "(") break;
    i++; // abrir '('

    const row: string[] = [];

    while (i < n) {
      skip();
      if (line[i] === ")") {
        i++; // cerrar ')'
        break;
      }
      const val = readValue();
      row.push(val);
      skip();
      if (i < n && line[i] === ",") i++; // coma entre valores
    }

    rows.push(row);
    skip();
    if (i < n && line[i] === ",") i++; // coma entre filas
    else break;
  }

  return rows;
}

// ─── Arg helper ───────────────────────────────────────────────────────────────

function getArgValue(args: string[], name: string, fallback?: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith("--")) return args[idx + 1];
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  return fallback;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log([
      "Extractor de tablas PrestaShop desde dump SQL",
      "",
      "Uso:",
      '  npx tsx scripts/extraer-csv-de-sql.ts --sqlFile mysql_data/archivo.sql',
      "",
      "Opciones:",
      "  --sqlFile   <ruta>   Ruta al archivo .sql de PrestaShop",
      "  --outputDir <ruta>   Carpeta de salida para los CSV",
      "  --help               Muestra esta ayuda",
      "",
      "Tablas extraídas:",
      "  ps_customer, ps_address, ps_orders, ps_order_detail,",
      "  ps_order_state, ps_order_state_lang",
    ].join("\n"));
    return;
  }

  const sqlFileArg = getArgValue(args, "--sqlFile", DEFAULT_SQL_FILE) || DEFAULT_SQL_FILE;
  const outputDirArg = getArgValue(args, "--outputDir", DEFAULT_OUTPUT_DIR) || DEFAULT_OUTPUT_DIR;
  const sqlPath = path.isAbsolute(sqlFileArg) ? sqlFileArg : path.resolve(process.cwd(), sqlFileArg);
  const outDir = path.isAbsolute(outputDirArg) ? outputDirArg : path.resolve(process.cwd(), outputDirArg);

  // Verificar que existe el SQL
  try {
    await fs.promises.access(sqlPath);
  } catch {
    console.error(`Error: no se encuentra el archivo SQL: ${sqlPath}`);
    process.exitCode = 1;
    return;
  }

  await fs.promises.mkdir(outDir, { recursive: true });

  const stats = await fs.promises.stat(sqlPath);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(1);

  // Timestamp para los nombres de archivo de salida
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const ts =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes());

  // Preparar escritores CSV
  const writers = new Map<string, fs.WriteStream>();
  const outputPaths = new Map<string, string>();
  const rowCounts = new Map<string, number>();
  const tableColumns = new Map<string, string[]>();

  for (const table of TARGET_TABLES) {
    const outPath = path.join(outDir, `${table}_${ts}.csv`);
    outputPaths.set(table, outPath);
    writers.set(table, fs.createWriteStream(outPath, { encoding: "utf8" }));
    rowCounts.set(table, 0);
  }

  console.log(`SQL: ${path.basename(sqlPath)} (${fileSizeMB} MB)`);
  console.log(`Salida: ${outDir}`);
  console.log("");
  console.log("Procesando...");

  // Estado del parser
  let currentTable = "";       // tabla CREATE TABLE en curso
  let inCreate = false;        // dentro de bloque CREATE TABLE
  let createColumns: string[] = [];

  let bytesRead = 0;
  let lastPrint = Date.now();

  const rl = readline.createInterface({
    input: fs.createReadStream(sqlPath, {
      encoding: "utf8",
      // highWaterMark grande para mejor rendimiento en lectura secuencial
      highWaterMark: 4 * 1024 * 1024,
    }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    bytesRead += Buffer.byteLength(line, "utf8") + 1;

    // Progreso cada 3 segundos
    const t = Date.now();
    if (t - lastPrint > 3000) {
      const pct = ((bytesRead / stats.size) * 100).toFixed(1);
      process.stdout.write(`\r  ${pct}% (${(bytesRead / 1024 / 1024).toFixed(0)} / ${fileSizeMB} MB)`);
      lastPrint = t;
    }

    // ── Detectar CREATE TABLE de una tabla objetivo ──────────────────────────
    if (!inCreate) {
      const createMatch = line.match(/^CREATE TABLE `(ps_[^`]+)`/);
      if (createMatch) {
        const tbl = createMatch[1];
        if ((TARGET_TABLES as string[]).includes(tbl)) {
          currentTable = tbl;
          inCreate = true;
          createColumns = [];
        }
        continue;
      }
    }

    // ── Recoger columnas dentro del bloque CREATE TABLE ──────────────────────
    if (inCreate) {
      if (line.startsWith(")")) {
        // Fin del CREATE TABLE — guardar columnas y escribir cabecera CSV
        tableColumns.set(currentTable, [...createColumns]);
        const writer = writers.get(currentTable);
        if (writer && createColumns.length > 0) {
          writer.write(rowToCsvLine(createColumns));
        }
        inCreate = false;
        currentTable = "";
        createColumns = [];
        continue;
      }

      // Línea de columna: empieza con espacio + backtick + nombre
      // Excluir líneas de KEY, PRIMARY KEY, UNIQUE KEY, CONSTRAINT, INDEX
      const isKey = /^\s+(PRIMARY\s+KEY|UNIQUE\s+KEY|KEY\s|CONSTRAINT\s|FULLTEXT\s|SPATIAL\s|INDEX\s)/i.test(line);
      if (!isKey) {
        const colMatch = line.match(/^\s+`([^`]+)`\s+/);
        if (colMatch) {
          createColumns.push(colMatch[1]);
        }
      }
      continue;
    }

    // ── Detectar INSERT INTO de una tabla objetivo ───────────────────────────
    if (line.startsWith("INSERT INTO `")) {
      const insertMatch = line.match(/^INSERT INTO `(ps_[^`]+)`/);
      if (insertMatch) {
        const tbl = insertMatch[1];
        if ((TARGET_TABLES as string[]).includes(tbl) && tableColumns.has(tbl)) {
          const writer = writers.get(tbl)!;
          const rows = parseInsertLine(line);
          for (const row of rows) {
            writer.write(rowToCsvLine(row));
          }
          const prev = rowCounts.get(tbl) || 0;
          rowCounts.set(tbl, prev + rows.length);
          if (rows.length > 0) {
            process.stdout.write(`\r  Tabla ${tbl}: ${prev + rows.length} filas                 `);
            lastPrint = Date.now();
          }
        }
      }
    }
  }

  process.stdout.write("\n");

  // Cerrar todos los escritores
  for (const [, writer] of writers) {
    await new Promise<void>((resolve, reject) => writer.end((err: any) => (err ? reject(err) : resolve())));
  }

  // Resumen
  console.log("\n" + "─".repeat(65));
  console.log("Archivos generados:");
  let allOk = true;
  for (const table of TARGET_TABLES) {
    const count = rowCounts.get(table) || 0;
    const cols = tableColumns.get(table)?.length || 0;
    const outFile = path.basename(outputPaths.get(table) || "");
    if (cols === 0) {
      console.log(`  ✗ ${table.padEnd(28)} NO ENCONTRADA en el SQL`);
      allOk = false;
    } else {
      console.log(`  ✓ ${outFile.padEnd(42)} ${count.toString().padStart(5)} filas`);
    }
  }

  if (!allOk) {
    console.log("\nATENCIÓN: Algunas tablas no se encontraron. Verifica que el SQL contiene datos de PrestaShop con prefijo 'ps_'.");
  } else {
    console.log("\nListo. Ahora puedes ejecutar:");
    console.log(`  npx tsx scripts/corregir-estados-prestashop.ts --inputDir "${outputDirArg}"`);
    console.log(`  npx tsx scripts/importar-pedidos-prestashop.ts --inputDir "${outputDirArg}" --since 2024-04-10`);
  }
}

main().catch((err) => {
  console.error("\nError:", err?.message || err);
  process.exitCode = 1;
});
