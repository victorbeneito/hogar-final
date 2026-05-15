const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const sourceDir = getArgValue("source-dir", "y:\\WebHogar\\NovaWeb\\Importacion\\combinaciones");
const outputPath = getArgValue("output", path.resolve(rootDir, "importacion", "combinaciones_importacion_global.csv"));
const imageBaseUrl = trimTrailingSlash(getArgValue("image-base-url", "https://elhogardetusuenos.com/img/p"));

function getArgValue(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function trimTrailingSlash(value) {
  return String(value ?? "").trim().replace(/\/+$/, "");
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

function parseBool(value) {
  return ["1", "true", "yes", "si", "s", "y"].includes(normalizeComparable(value));
}

function parseNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(String(value).replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function csvLine(fields) {
  return fields.map(csvCell).join(";");
}

function formatNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2).replace(".", ",") : "0,00";
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
  const text = fs.readFileSync(filePath, "utf8");
  const rows = parseDelimitedCsv(text);
  if (!rows.length) return [];

  const header = rows.shift().map((value) => normalizeText(value).replace(/^\uFEFF/, ""));

  return rows
    .filter((row) => row.some((cell) => normalizeText(cell) !== ""))
    .map((row) => {
      const record = {};
      header.forEach((column, index) => {
        record[column] = row[index] ?? "";
      });
      return record;
    });
}

function findLatestCsvFileByPattern(dirPath, pattern) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const matches = entries
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));

  if (!matches.length) {
    return null;
  }

  return path.join(dirPath, matches[matches.length - 1]);
}

function loadCsvTable(dirPath, pattern, label) {
  const filePath = findLatestCsvFileByPattern(dirPath, pattern);
  if (!filePath) {
    throw new Error(`No se encontro el CSV requerido para ${label} en ${dirPath}`);
  }

  return {
    filePath,
    rows: parseCsvFile(filePath),
  };
}

function classifyGroup(groupName, isColorGroup, groupType) {
  const normalized = normalizeComparable(groupName);
  const normalizedType = normalizeComparable(groupType);

  if (isColorGroup || normalizedType === "color") return "color";
  if (!normalized) return null;
  if (normalized.includes("tirador")) return "tirador";
  if (
    normalized.includes("tamano") ||
    normalized.includes("talla") ||
    normalized.includes("size") ||
    normalized.includes("medida") ||
    normalized.includes("dimension") ||
    normalized.includes("ancho") ||
    normalized.includes("alto")
  ) {
    return "tamano";
  }

  return null;
}

function buildPrestashopImagePath(idImage) {
  const numericId = Math.trunc(Number(idImage) || 0);
  const digits = String(numericId).split("").filter(Boolean);
  if (!digits.length) return "";
  return `${digits.join("/")}/${numericId}.jpg`;
}

function buildPrestashopImageUrl(idImage) {
  if (!imageBaseUrl) return "";
  const pathPart = buildPrestashopImagePath(idImage);
  if (!pathPart) return "";
  return `${imageBaseUrl}/${pathPart}`;
}

function collectAttributeItems(attributeIds, attributeValueById, attributeGroupByAttributeId, groupMetaById, attributePositionById) {
  const seen = new Set();
  const items = [];

  for (const idAttribute of attributeIds) {
    const value = normalizeText(attributeValueById.get(idAttribute));
    if (!value) continue;

    const groupId = attributeGroupByAttributeId.get(idAttribute) ?? "";
    const key = `${groupId}|||${value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const groupMeta = groupMetaById.get(groupId) ?? {};

    items.push({
      id: Number(idAttribute),
      value,
      groupId,
      groupName: normalizeText(groupMeta.name),
      groupType: classifyGroup(groupMeta.name, groupMeta.isColorGroup, groupMeta.groupType),
      groupPosition: groupMeta.position ?? 0,
      attributePosition: attributePositionById.get(idAttribute) ?? 0,
    });
  }

  items.sort((left, right) => {
    if (left.groupPosition !== right.groupPosition) return left.groupPosition - right.groupPosition;
    if (left.attributePosition !== right.attributePosition) return left.attributePosition - right.attributePosition;
    return left.id - right.id;
  });

  return items;
}

function pickCoverImage(imageMetaById, coverImageInfoByProductId, productId) {
  const coverInfo = coverImageInfoByProductId.get(productId);
  if (coverInfo?.idImage) {
    return buildPrestashopImageUrl(coverInfo.idImage);
  }

  return "";
}

function resolveProductReference(productRow) {
  const reference = normalizeText(productRow.reference);
  if (reference) return reference;
  const idProduct = normalizeText(productRow.id_product);
  return idProduct ? `PROD-${idProduct}` : "";
}

function resolveVariantReference(productReference, variantRow, sequence) {
  const explicitReference = normalizeText(variantRow.reference);
  if (explicitReference) {
    return explicitReference;
  }

  const suffix = String(sequence).padStart(3, "0");
  return `${productReference}${suffix}`;
}

function chooseVariantImages(variantId, imageIdsByProductAttributeId, imageMetaById, coverImageInfoByProductId, productId) {
  const imageIds = [...new Set(imageIdsByProductAttributeId.get(variantId) ?? [])];
  if (!imageIds.length) {
    const coverInfo = coverImageInfoByProductId.get(productId);
    if (coverInfo?.idImage) {
      imageIds.push(coverInfo.idImage);
    }
  }

  const resolvedImages = imageIds
    .filter((idImage) => imageMetaById.has(idImage))
    .sort((left, right) => {
      const leftMeta = imageMetaById.get(left);
      const rightMeta = imageMetaById.get(right);
      if (leftMeta.cover !== rightMeta.cover) return leftMeta.cover ? -1 : 1;
      if (leftMeta.position !== rightMeta.position) return leftMeta.position - rightMeta.position;
      return Number(left) - Number(right);
    })
    .map((idImage) => buildPrestashopImageUrl(idImage))
    .filter(Boolean);

  return resolvedImages;
}

function mapAttributesForVariant(attributeIds, attributeValueById, attributeGroupByAttributeId, groupMetaById, attributePositionById) {
  const attributeItems = collectAttributeItems(
    attributeIds,
    attributeValueById,
    attributeGroupByAttributeId,
    groupMetaById,
    attributePositionById
  );

  let color = "";
  let tamano = "";
  let tirador = "";

  for (const item of attributeItems) {
    if (item.groupType === "color" && !color) {
      color = item.value;
      continue;
    }

    if (item.groupType === "tamano" && !tamano) {
      tamano = item.value;
      continue;
    }

    if (item.groupType === "tirador" && !tirador) {
      tirador = item.value;
      continue;
    }
  }

  return { color, tamano, tirador };
}

function buildCsvRow(row) {
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

async function main() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`No existe el directorio origen: ${sourceDir}`);
  }

  const tables = {
    product: loadCsvTable(sourceDir, /^ps_product_\d+\.csv$/i, "ps_product"),
    productAttribute: loadCsvTable(sourceDir, /^ps_product_attribute_\d+\.csv$/i, "ps_product_attribute"),
    productAttributeCombination: loadCsvTable(sourceDir, /^ps_product_attribute_combination_\d+\.csv$/i, "ps_product_attribute_combination"),
    attribute: loadCsvTable(sourceDir, /^ps_attribute_\d+\.csv$/i, "ps_attribute"),
    attributeLang: loadCsvTable(sourceDir, /^ps_attribute_lang_\d+\.csv$/i, "ps_attribute_lang"),
    attributeGroup: loadCsvTable(sourceDir, /^ps_attribute_group_\d+\.csv$/i, "ps_attribute_group"),
    attributeGroupLang: loadCsvTable(sourceDir, /^ps_attribute_group_lang_\d+\.csv$/i, "ps_attribute_group_lang"),
    productAttributeImage: loadCsvTable(sourceDir, /^ps_product_attribute_image_\d+\.csv$/i, "ps_product_attribute_image"),
    image: loadCsvTable(sourceDir, /^ps_image_\d+\.csv$/i, "ps_image"),
  };

  const productRefById = new Map();
  for (const row of tables.product.rows) {
    const idProduct = normalizeText(row.id_product);
    const reference = resolveProductReference(row);
    if (!idProduct || !reference) continue;
    productRefById.set(idProduct, reference);
  }

  const attributeValueById = new Map();
  for (const row of tables.attributeLang.rows) {
    const idAttribute = normalizeText(row.id_attribute);
    const idLang = normalizeText(row.id_lang);
    const value = normalizeText(row.name);
    if (!idAttribute || !value) continue;
    if (idLang === "1" || !attributeValueById.has(idAttribute)) {
      attributeValueById.set(idAttribute, value);
    }
  }

  const attributeGroupByAttributeId = new Map();
  const attributePositionById = new Map();
  for (const row of tables.attribute.rows) {
    const idAttribute = normalizeText(row.id_attribute);
    const idGroup = normalizeText(row.id_attribute_group);
    if (!idAttribute || !idGroup) continue;
    attributeGroupByAttributeId.set(idAttribute, idGroup);
    attributePositionById.set(idAttribute, parseNumber(row.position, 0));
  }

  const groupMetaById = new Map();
  for (const row of tables.attributeGroup.rows) {
    const idGroup = normalizeText(row.id_attribute_group);
    if (!idGroup) continue;
    groupMetaById.set(idGroup, {
      ...(groupMetaById.get(idGroup) ?? {}),
      isColorGroup: parseBool(row.is_color_group),
      groupType: normalizeText(row.group_type),
      position: parseNumber(row.position, 0),
    });
  }
  for (const row of tables.attributeGroupLang.rows) {
    const idGroup = normalizeText(row.id_attribute_group);
    const idLang = normalizeText(row.id_lang);
    const name = normalizeText(row.name);
    if (!idGroup || !name) continue;
    const current = groupMetaById.get(idGroup) ?? {};
    if (idLang === "1" || !current.name) {
      groupMetaById.set(idGroup, { ...current, name });
    }
  }

  const attributeIdsByProductAttributeId = new Map();
  for (const row of tables.productAttributeCombination.rows) {
    const idProductAttribute = normalizeText(row.id_product_attribute);
    const idAttribute = normalizeText(row.id_attribute);
    if (!idProductAttribute || !idAttribute) continue;
    if (!attributeIdsByProductAttributeId.has(idProductAttribute)) {
      attributeIdsByProductAttributeId.set(idProductAttribute, []);
    }
    attributeIdsByProductAttributeId.get(idProductAttribute).push(idAttribute);
  }

  const imageMetaById = new Map();
  const coverImageInfoByProductId = new Map();
  for (const row of tables.image.rows) {
    const idImage = normalizeText(row.id_image);
    const idProduct = normalizeText(row.id_product);
    if (!idImage || !idProduct) continue;

    const meta = {
      idImage,
      cover: parseBool(row.cover),
      position: parseNumber(row.position, 0),
    };

    imageMetaById.set(idImage, meta);

    const current = coverImageInfoByProductId.get(idProduct);
    if (!current || meta.cover || meta.position < current.position) {
      coverImageInfoByProductId.set(idProduct, meta);
    }
  }

  const imageIdsByProductAttributeId = new Map();
  for (const row of tables.productAttributeImage.rows) {
    const idProductAttribute = normalizeText(row.id_product_attribute);
    const idImage = normalizeText(row.id_image);
    if (!idProductAttribute || !idImage) continue;
    if (!imageIdsByProductAttributeId.has(idProductAttribute)) {
      imageIdsByProductAttributeId.set(idProductAttribute, []);
    }
    imageIdsByProductAttributeId.get(idProductAttribute).push(idImage);
  }

  const rows = [];
  const usedReferencesByProduct = new Map();
  const sequenceByProduct = new Map();
  let skippedMissingProduct = 0;
  let fallbackReferenceCount = 0;

  for (const variantRow of tables.productAttribute.rows) {
    const idProductAttribute = normalizeText(variantRow.id_product_attribute);
    const idProduct = normalizeText(variantRow.id_product);
    if (!idProductAttribute || !idProduct) continue;

    const productReference = productRefById.get(idProduct);
    if (!productReference) {
      skippedMissingProduct += 1;
      continue;
    }

    const sequence = sequenceByProduct.get(productReference) ?? 0;
    sequenceByProduct.set(productReference, sequence + 1);

    const usedReferences = usedReferencesByProduct.get(productReference) ?? new Set();
    const rawReference = normalizeText(variantRow.reference);
    let variantReference = resolveVariantReference(productReference, variantRow, sequence);
    if (rawReference) {
      variantReference = rawReference;
    }

    if (usedReferences.has(variantReference)) {
      let counter = 2;
      while (usedReferences.has(`${variantReference}-${counter}`)) {
        counter += 1;
      }
      variantReference = `${variantReference}-${counter}`;
    }

    usedReferences.add(variantReference);
    usedReferencesByProduct.set(productReference, usedReferences);

    if (!rawReference) {
      fallbackReferenceCount += 1;
    }

    const attributeIds = attributeIdsByProductAttributeId.get(idProductAttribute) ?? [];
    const { color, tamano, tirador } = mapAttributesForVariant(
      attributeIds,
      attributeValueById,
      attributeGroupByAttributeId,
      groupMetaById,
      attributePositionById
    );

    const imageList = chooseVariantImages(idProductAttribute, imageIdsByProductAttributeId, imageMetaById, coverImageInfoByProductId, idProduct);

    rows.push({
      accion: "upsert",
      productoReferencia: productReference,
      referencia: variantReference,
      stock: String(Math.trunc(parseNumber(variantRow.quantity, 0))),
      precio_extra: formatNumber(parseNumber(variantRow.price, 0)),
      imagen: imageList[0] ?? "",
      imagenMuestra: imageList[0] ?? "",
      imagenesVariante: imageList.join("|"),
      color,
      tamano,
      tirador,
    });
  }

  rows.sort((left, right) => {
    if (left.productoReferencia !== right.productoReferencia) {
      return left.productoReferencia.localeCompare(right.productoReferencia, "es", { numeric: true, sensitivity: "base" });
    }

    return left.referencia.localeCompare(right.referencia, "es", { numeric: true, sensitivity: "base" });
  });

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
    ...rows.map((row) => buildCsvRow(row)),
  ];

  ensureDirectory(outputPath);
  fs.writeFileSync(outputPath, `${csvRows.join("\r\n")}\r\n`, "utf8");

  console.log(`CSV global generated in: ${outputPath}`);
  console.log(`Source dir: ${sourceDir}`);
  console.log(`Products loaded: ${tables.product.rows.length}`);
  console.log(`Variant rows exported: ${rows.length}`);
  console.log(`Product-variant rows skipped due to missing product reference: ${skippedMissingProduct}`);
  console.log(`Variant references generated from fallback sequence: ${fallbackReferenceCount}`);
  console.log(`Files used:`);
  for (const [key, table] of Object.entries(tables)) {
    console.log(`- ${key}: ${path.basename(table.filePath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
