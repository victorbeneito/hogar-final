const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const sourcePath = getArgValue(
  "source",
  "y:\\WebHogar\\NovaWeb\\Importacion\\Prestashop CSV Importador Combinaciones.csv"
);
const equivalencePath = getArgValue(
  "equivalence",
  "y:\\WebHogar\\NovaWeb\\Importacion\\equivalencia idProducto_referencia.csv"
);
const globalPath = getArgValue("global", path.resolve(rootDir, "importacion", "combinaciones_importacion_global.csv"));
const outputPath = getArgValue("output", path.resolve(rootDir, "importacion", "stock_lisos_importacion.csv"));
const unresolvedPath = getArgValue(
  "unresolved-output",
  path.resolve(rootDir, "importacion", "stock_lisos_importacion_sin_mapeo.csv")
);
const manualProductReferenceOverrides = new Map([
  ["943", "9003"],
]);

function getArgValue(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeComparable(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(String(value).replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2).replace(".", ",") : "0,00";
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function csvLine(fields) {
  return fields.map(csvCell).join(";");
}

function decodingPenalty(text) {
  const replacementChars = (text.match(/�/g) || []).length;
  const mojibakeChars = (text.match(/[ÃÂ]/g) || []).length;
  return replacementChars * 5 + mojibakeChars;
}

function readTextFileSmart(filePath) {
  const buffer = fs.readFileSync(filePath);
  const utf8Text = buffer.toString("utf8");
  const latin1Text = buffer.toString("latin1");

  const utf8Penalty = decodingPenalty(utf8Text);
  const latin1Penalty = decodingPenalty(latin1Text);

  if (utf8Penalty === latin1Penalty) {
    return utf8Text;
  }

  return utf8Penalty < latin1Penalty ? utf8Text : latin1Text;
}

function parseDelimitedCsv(text, delimiter = ";") {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function parseCsvFile(filePath) {
  const text = readTextFileSmart(filePath);
  const rows = parseDelimitedCsv(text);
  if (!rows.length) return { header: [], rows: [] };

  const header = rows.shift().map((value) => normalizeText(value).replace(/^\uFEFF/, ""));
  const records = rows
    .filter((row) => row.some((cell) => normalizeText(cell) !== ""))
    .map((row) => {
      const record = {};
      header.forEach((column, index) => {
        record[column] = row[index] ?? "";
      });
      return record;
    });

  return { header, rows: records };
}

function findHeaderIndex(header, candidates) {
  const normalizedHeader = header.map((column) => normalizeComparable(column));

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeComparable(candidate);
    const exactIndex = normalizedHeader.indexOf(normalizedCandidate);
    if (exactIndex >= 0) return exactIndex;

    const partialIndex = normalizedHeader.findIndex((column) => column.includes(normalizedCandidate));
    if (partialIndex >= 0) return partialIndex;
  }

  return -1;
}

function splitTokens(value) {
  return String(value ?? "")
    .split(/\s*,\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitImageUrls(value) {
  const matches = String(value ?? "").match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  const unique = [];
  const seen = new Set();

  for (const url of matches) {
    const cleanUrl = url.trim().replace(/[),.;]+$/g, "");
    if (!cleanUrl || seen.has(cleanUrl)) continue;
    seen.add(cleanUrl);
    unique.push(cleanUrl);
  }

  return unique;
}

function classifyAttributeName(name) {
  const normalized = normalizeComparable(name);
  if (!normalized) return null;
  if (normalized.includes("color")) return "color";
  if (
    normalized.includes("tamano") ||
    normalized.includes("talla") ||
    normalized.includes("size") ||
    normalized.includes("medida") ||
    normalized.includes("ancho") ||
    normalized.includes("alto")
  ) {
    return "tamano";
  }
  if (normalized.includes("tirador")) return "tirador";
  return null;
}

function buildEquivalenceMaps(rows) {
  const exactByPrestashopId = new Map();
  const numericEntries = [];

  for (const row of rows) {
    const prestashopId = normalizeText(row.IdPrestashop);
    const reference = normalizeText(row.Referencia);
    if (!prestashopId || !reference) continue;

    exactByPrestashopId.set(prestashopId, reference);

    const numericId = Number(prestashopId);
    const numericRef = Number(reference);
    if (Number.isFinite(numericId) && Number.isFinite(numericRef)) {
      numericEntries.push({ id: numericId, reference: numericRef });
    }
  }

  numericEntries.sort((left, right) => left.id - right.id);

  const inferredByPrestashopId = new Map();
  for (let index = 1; index < numericEntries.length; index += 1) {
    const previous = numericEntries[index - 1];
    const current = numericEntries[index];
    const idGap = current.id - previous.id;
    const referenceGap = current.reference - previous.reference;

    if (idGap <= 1) continue;
    if (referenceGap !== idGap) continue;

    for (let missingId = previous.id + 1; missingId < current.id; missingId += 1) {
      if (exactByPrestashopId.has(String(missingId))) continue;
      inferredByPrestashopId.set(String(missingId), String(previous.reference + (missingId - previous.id)));
    }
  }

  return { exactByPrestashopId, inferredByPrestashopId };
}

function parseAttributePairs(attributeCell, valueCell) {
  const attributes = splitTokens(attributeCell);
  const values = splitTokens(valueCell);

  let color = "";
  let tamano = "";
  let tirador = "";

  const total = Math.max(attributes.length, values.length);
  for (let index = 0; index < total; index += 1) {
    const attributeToken = attributes[index] ?? "";
    const valueToken = values[index] ?? "";
    const attributeName = normalizeText(attributeToken.split(":")[0]);
    const attributeValue = normalizeText(valueToken.split(":")[0]);
    if (!attributeValue) continue;

    const kind = classifyAttributeName(attributeName);
    if (kind === "color" && !color) {
      color = attributeValue;
      continue;
    }

    if (kind === "tamano" && !tamano) {
      tamano = attributeValue;
      continue;
    }

    if (kind === "tirador" && !tirador) {
      tirador = attributeValue;
      continue;
    }
  }

  return { color, tamano, tirador };
}

function buildRowCsv(row) {
  return csvLine([
    row.accion,
    row.productoReferencia,
    row.referencia,
    row.stock,
    row.precio_extra,
    row.imagen,
    row.imagenMuestra,
    row.imagenesVariante,
    row.color,
    row.tamano,
    row.tirador,
  ]);
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`No existe el archivo origen: ${sourcePath}`);
  }
  if (!fs.existsSync(equivalencePath)) {
    throw new Error(`No existe el archivo de equivalencia: ${equivalencePath}`);
  }

  const source = parseCsvFile(sourcePath);
  const equivalence = parseCsvFile(equivalencePath);

  const sourceProductIdIndex = findHeaderIndex(source.header, ["Product ID", "Product ID*"]);
  const sourceAttributeIndex = findHeaderIndex(source.header, ["Attribute (Name:Type:Position)", "Attribute"]);
  const sourceValueIndex = findHeaderIndex(source.header, ["Value (Value:Position)", "Value"]);
  const sourceReferenceIndex = findHeaderIndex(source.header, ["Reference"]);
  const sourceImpactIndex = findHeaderIndex(source.header, ["Impact on price"]);
  const sourceQuantityIndex = findHeaderIndex(source.header, ["quantity", "Quantity"]);
  const sourceImageUrlIndex = findHeaderIndex(source.header, ["Image URL"]);

  if (sourceProductIdIndex < 0 || sourceReferenceIndex < 0 || sourceQuantityIndex < 0 || sourceImpactIndex < 0) {
    throw new Error("No se han encontrado las columnas base necesarias en el CSV de Prestashop");
  }

  const { exactByPrestashopId: equivalenceByPrestashopId, inferredByPrestashopId } = buildEquivalenceMaps(equivalence.rows);

  const globalRows = fs.existsSync(globalPath) ? parseCsvFile(globalPath) : { rows: [] };
  const globalByReference = new Map();
  for (const row of globalRows.rows ?? []) {
    const reference = normalizeText(row.referencia);
    if (!reference) continue;
    globalByReference.set(normalizeComparable(reference), row);
  }

  const outputRows = [];
  const unresolvedRows = [];
  let resolvedByEquivalence = 0;
  let resolvedByGlobal = 0;
  let skippedRows = 0;

  source.rows.forEach((row, index) => {
    const prestashopId = normalizeText(row[source.header[sourceProductIdIndex]]);
    const sourceReference = normalizeText(row[source.header[sourceReferenceIndex]]);
    const productReferenceById = prestashopId
      ? manualProductReferenceOverrides.get(prestashopId) || equivalenceByPrestashopId.get(prestashopId) || inferredByPrestashopId.get(prestashopId) || ""
      : "";
    const globalFallback = sourceReference ? globalByReference.get(normalizeComparable(sourceReference)) : null;

    const productoReferencia = productReferenceById || normalizeText(globalFallback?.productoReferencia) || "";
    if (!productoReferencia) {
      skippedRows += 1;
      unresolvedRows.push({
        prestashopId,
        referencia: sourceReference,
        motivo: "No se pudo resolver productoReferencia con equivalencia ni global",
      });
      return;
    }

    if (productReferenceById) {
      resolvedByEquivalence += 1;
    } else {
      resolvedByGlobal += 1;
    }

    const parsedAttributes =
      sourceAttributeIndex >= 0 && sourceValueIndex >= 0
        ? parseAttributePairs(row[source.header[sourceAttributeIndex]], row[source.header[sourceValueIndex]])
        : { color: "", tamano: "", tirador: "" };

    const imageTail = sourceImageUrlIndex >= 0 ? row[source.header[sourceImageUrlIndex]] ?? "" : "";
    const tailFromImageColumn = sourceImageUrlIndex >= 0 ? Object.values(row).slice(sourceImageUrlIndex).join(" ") : "";
    const images = splitImageUrls(`${imageTail} ${tailFromImageColumn}`);
    const globalImages = splitImageUrls(normalizeText(globalFallback?.imagenesVariante));
    const finalImages = images.length ? images : globalImages;
    const primaryImage = finalImages[0] || normalizeText(globalFallback?.imagen) || "";

    outputRows.push({
      accion: "upsert",
      productoReferencia,
      referencia: sourceReference || normalizeText(globalFallback?.referencia) || `${productoReferencia}-${index + 1}`,
      stock: String(Math.trunc(parseNumber(row[source.header[sourceQuantityIndex]], 0))),
      precio_extra: formatNumber(parseNumber(row[source.header[sourceImpactIndex]], 0)),
      imagen: primaryImage,
      imagenMuestra: primaryImage,
      imagenesVariante: finalImages.join("|"),
      color: parsedAttributes.color || normalizeText(globalFallback?.color),
      tamano: parsedAttributes.tamano || normalizeText(globalFallback?.tamano),
      tirador: parsedAttributes.tirador || normalizeText(globalFallback?.tirador),
    });
  });

  ensureDirectory(outputPath);
  const csvRows = [
    csvLine([
      "accion",
      "productoReferencia",
      "referencia",
      "stock",
      "precio_extra",
      "imagen",
      "imagenMuestra",
      "imagenesVariante",
      "color",
      "tamano",
      "tirador",
    ]),
    ...outputRows.map((row) => buildRowCsv(row)),
  ];

  fs.writeFileSync(outputPath, `${csvRows.join("\r\n")}\r\n`, "utf8");

  if (unresolvedRows.length) {
    const unresolvedCsv = [
      csvLine(["prestashopId", "referencia", "motivo"]),
      ...unresolvedRows.map((row) => csvLine([row.prestashopId, row.referencia, row.motivo])),
    ];
    ensureDirectory(unresolvedPath);
    fs.writeFileSync(unresolvedPath, `${unresolvedCsv.join("\r\n")}\r\n`, "utf8");
  } else if (fs.existsSync(unresolvedPath)) {
    try {
      fs.unlinkSync(unresolvedPath);
    } catch (error) {
      console.warn(`No se pudo borrar el reporte antiguo de sin mapeo: ${error.message}`);
    }
  }

  console.log(`CSV de stock generado en: ${outputPath}`);
  console.log(`CSV origen: ${sourcePath}`);
  console.log(`CSV equivalencia: ${equivalencePath}`);
  console.log(`CSV global usado como respaldo: ${fs.existsSync(globalPath) ? globalPath : "(no encontrado)"}`);
  console.log(`Filas origen: ${source.rows.length}`);
  console.log(`Filas exportadas: ${outputRows.length}`);
  console.log(`Resueltas por equivalencia: ${resolvedByEquivalence}`);
  console.log(`Resueltas por global: ${resolvedByGlobal}`);
  console.log(`Filas sin resolver: ${skippedRows}`);
  if (unresolvedRows.length) {
    console.log(`Reporte de filas sin resolver: ${unresolvedPath}`);
  }
}

main();