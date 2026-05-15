const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const rootDir = process.cwd();
const dumpPath = getArgValue("dump", path.resolve(rootDir, "mysql_data", "prestashop", "1775837276-334a5d4d.sql", "1775837276-334a5d4d.sql"));
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
  const parsed = Number(String(value).replace(",", "."));
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unescapeSqlString(value) {
  return String(value)
    .replace(/''/g, "'")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\")
    .replace(/\\'/g, "'");
}

function parseSqlValue(token) {
  const trimmed = token.trim();

  if (trimmed === "NULL") {
    return null;
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return unescapeSqlString(trimmed.slice(1, -1));
  }

  return trimmed;
}

function splitSqlRow(rowText) {
  const fields = [];
  let current = "";
  let inString = false;

  for (let index = 0; index < rowText.length; index += 1) {
    const char = rowText[index];

    if (inString) {
      current += char;
      if (char === "'") {
        if (rowText[index + 1] === "'") {
          current += rowText[index + 1];
          index += 1;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (char === "'") {
      inString = true;
      current += char;
      continue;
    }

    if (char === ",") {
      fields.push(parseSqlValue(current));
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || rowText.endsWith(",")) {
    fields.push(parseSqlValue(current));
  }

  return fields;
}

function extractInsertBlocks(sql, tableName) {
  const pattern = new RegExp(`INSERT INTO \`${escapeRegExp(tableName)}\` VALUES\\s*([\\s\\S]*?);`, "g");
  const blocks = [];
  let match;

  while ((match = pattern.exec(sql)) !== null) {
    blocks.push(match[1]);
  }

  return blocks;
}

function extractTuples(block) {
  const tuples = [];
  let current = "";
  let depth = 0;
  let inString = false;

  for (let index = 0; index < block.length; index += 1) {
    const char = block[index];

    if (inString) {
      current += char;
      if (char === "'") {
        if (block[index + 1] === "'") {
          current += block[index + 1];
          index += 1;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (char === "'") {
      inString = true;
      current += char;
      continue;
    }

    if (char === "(") {
      depth += 1;
      if (depth === 1) {
        current = "";
        continue;
      }
    }

    if (char === ")" && depth > 0) {
      depth -= 1;
      if (depth === 0) {
        tuples.push(current);
        current = "";
        continue;
      }
    }

    if (depth > 0) {
      current += char;
    }
  }

  return tuples;
}

function extractCreateTableBlock(sql, tableName) {
  const pattern = new RegExp("CREATE TABLE\\s+`" + escapeRegExp(tableName) + "`\\s*\\(([\\s\\S]*?)\\)\\s*ENGINE", "m");
  const match = sql.match(pattern);
  return match ? match[1] : null;
}

function parseCreateTableColumns(sql, tableName) {
  const block = extractCreateTableBlock(sql, tableName);
  if (!block) return [];

  return block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("`"))
    .map((line) => {
      const match = line.match(/^`([^`]+)`/);
      return match ? match[1] : null;
    })
    .filter(Boolean);
}

function parseTableRows(sql, tableName) {
  const columns = parseCreateTableColumns(sql, tableName);
  const rows = [];

  for (const block of extractInsertBlocks(sql, tableName)) {
    for (const tuple of extractTuples(block)) {
      const values = splitSqlRow(tuple);
      const row = {};

      columns.forEach((column, index) => {
        row[column] = values[index] ?? null;
      });

      rows.push(row);
    }
  }

  return rows;
}

function classifyGroup(groupName) {
  const normalized = normalizeComparable(groupName);

  if (!normalized) return null;
  if (normalized.includes("color")) return "color";
  if (normalized.includes("tirador")) return "tirador";
  if (normalized.includes("tamano") || normalized.includes("tamanio") || normalized.includes("medida") || normalized.includes("dimension") || normalized.includes("size")) {
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

function collectAttributeItems(attributeIds, attributeValueById, attributeGroupByAttributeId, groupNameById, groupPositionById, attributePositionById) {
  const seen = new Set();
  const items = [];

  for (const idAttribute of attributeIds) {
    const value = normalizeText(attributeValueById.get(idAttribute));
    if (!value) continue;

    const groupId = attributeGroupByAttributeId.get(idAttribute) ?? "";
    const key = `${groupId}|||${value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const groupName = groupNameById.get(groupId) ?? "";

    items.push({
      id: Number(idAttribute),
      value,
      groupId,
      groupName,
      groupType: classifyGroup(groupName),
      groupPosition: groupPositionById.get(groupId) ?? 0,
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

function splitImageList(value) {
  return String(value ?? "")
    .split(/[|,;\n\r]+/)
    .map((part) => normalizeText(part))
    .filter(Boolean);
}

function pickCoverImage(productImages) {
  if (!Array.isArray(productImages) || !productImages.length) {
    return "";
  }

  const sortedImages = [...productImages].sort((left, right) => {
    if (Boolean(left.esPortada) !== Boolean(right.esPortada)) {
      return left.esPortada ? -1 : 1;
    }

    if ((left.orden ?? 0) !== (right.orden ?? 0)) {
      return (left.orden ?? 0) - (right.orden ?? 0);
    }

    return (left.id ?? 0) - (right.id ?? 0);
  });

  return normalizeText(sortedImages[0]?.url);
}

function deriveProductReferenceFromName(name) {
  const tokens = normalizeText(name)
    .split(/[^A-Za-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (/[A-Za-z]/.test(token) && /\d/.test(token)) {
      return token.toUpperCase();
    }
  }

  for (const token of tokens) {
    if (/^[A-Z0-9]{4,}$/.test(token)) {
      return token.toUpperCase();
    }
  }

  return "";
}

function inferVariantValue(variant, attributePatterns, fallbackFieldValue) {
  const directValue = normalizeText(fallbackFieldValue);
  if (directValue) {
    return directValue;
  }

  const normalizedPatterns = attributePatterns.map((pattern) => normalizeComparable(pattern));

  for (const relation of variant.varianteatributo ?? []) {
    const attributeName = normalizeComparable(relation?.atributovalor?.atributo?.nombre);
    const attributeValue = normalizeText(relation?.atributovalor?.valor);

    if (!attributeName || !attributeValue) {
      continue;
    }

    if (normalizedPatterns.some((pattern) => attributeName.includes(pattern))) {
      return attributeValue;
    }
  }

  return "";
}

async function buildVariantRowsFromAppDatabase(prisma) {
  const variants = await prisma.variante.findMany({
    include: {
      producto: {
        select: {
          referencia: true,
          nombre: true,
          productoimagen: {
            select: {
              id: true,
              url: true,
              orden: true,
              esPortada: true,
            },
          },
        },
      },
      varianteatributo: {
        include: {
          atributovalor: {
            include: {
              atributo: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ productoId: "asc" }, { id: "asc" }],
  });

  const rows = [];
  const usedReferencesByProduct = new Map();
  let skippedWithoutProductReference = 0;
  let fallbackReferenceCount = 0;
  let variantsWithUnrecognizedGroups = 0;

  for (const variant of variants) {
    const productReference = normalizeText(variant.producto?.referencia) || deriveProductReferenceFromName(variant.producto?.nombre);
    if (!productReference) {
      skippedWithoutProductReference += 1;
      continue;
    }

    const usedReferences = usedReferencesByProduct.get(productReference) ?? new Set();
    const rawReference = normalizeText(variant.referencia);
    let variantReference = rawReference || `${productReference}-PA-${variant.id}`;

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

    const color = inferVariantValue(variant, ["color"], variant.color);
    const tamano = inferVariantValue(variant, ["tamano", "tamaño", "tamanio", "size", "medida", "dimension"], variant.tamano);
    const tirador = inferVariantValue(variant, ["tirador", "mango", "manija", "opening"], variant.tirador);
    const variantImages = splitImageList(variant.imagenesVariante);
    const productCoverImage = pickCoverImage(variant.producto?.productoimagen ?? []);
    const imageList = variantImages.length
      ? variantImages
      : splitImageList(variant.imagen).length
        ? splitImageList(variant.imagen)
        : productCoverImage
          ? [productCoverImage]
          : [];

    if (variant.varianteatributo?.length && !color && !tamano && !tirador) {
      variantsWithUnrecognizedGroups += 1;
    }

    rows.push({
      accion: "upsert",
      productoReferencia: productReference,
      referencia: variantReference,
      stock: String(Math.trunc(parseNumber(variant.stock, 0))),
      precio_extra: formatNumber(parseNumber(variant.precio_extra, 0)),
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

  return {
    rows,
    skippedWithoutProductReference,
    fallbackReferenceCount,
    variantsWithUnrecognizedGroups,
  };
}

async function main() {
  if (!fs.existsSync(dumpPath)) {
    throw new Error(`No existe el dump SQL: ${dumpPath}`);
  }

  const prisma = new PrismaClient();

  try {
    const sql = fs.readFileSync(dumpPath, "utf8");
    const appProducts = await prisma.producto.findMany({ select: { referencia: true } });
    const existingProductRefs = new Set(appProducts.map((product) => normalizeText(product.referencia)).filter(Boolean));

    const productRows = parseTableRows(sql, "ps_product");
    const productAttributeRows = parseTableRows(sql, "ps_product_attribute");
    const productAttributeCombinationRows = parseTableRows(sql, "ps_product_attribute_combination");
    const attributeRows = parseTableRows(sql, "ps_attribute");
    const attributeLangRows = parseTableRows(sql, "ps_attribute_lang");
    const attributeGroupRows = parseTableRows(sql, "ps_attribute_group");
    const attributeGroupLangRows = parseTableRows(sql, "ps_attribute_group_lang");
    const productAttributeImageRows = parseTableRows(sql, "ps_product_attribute_image");
    const imageRows = parseTableRows(sql, "ps_image");

    const productRefById = new Map();
    for (const row of productRows) {
      const idProduct = String(row.id_product ?? "").trim();
      const reference = normalizeText(row.reference);
      if (!idProduct || !reference) continue;
      productRefById.set(idProduct, reference);
    }

    const attributeValueById = new Map();
    for (const row of attributeLangRows) {
      const idAttribute = String(row.id_attribute ?? "").trim();
      const idLang = String(row.id_lang ?? "").trim();
      const value = normalizeText(row.name);
      if (!idAttribute || !value) continue;
      if (idLang === "1" || !attributeValueById.has(idAttribute)) {
        attributeValueById.set(idAttribute, value);
      }
    }

    const attributeGroupByAttributeId = new Map();
    const attributePositionById = new Map();
    for (const row of attributeRows) {
      const idAttribute = String(row.id_attribute ?? "").trim();
      const idGroup = String(row.id_attribute_group ?? "").trim();
      if (!idAttribute || !idGroup) continue;
      attributeGroupByAttributeId.set(idAttribute, idGroup);
      attributePositionById.set(idAttribute, parseNumber(row.position, 0));
    }

    const groupNameById = new Map();
    const groupPositionById = new Map();
    for (const row of attributeGroupRows) {
      const idGroup = String(row.id_attribute_group ?? "").trim();
      if (!idGroup) continue;
      groupPositionById.set(idGroup, parseNumber(row.position, 0));
    }
    for (const row of attributeGroupLangRows) {
      const idGroup = String(row.id_attribute_group ?? "").trim();
      const idLang = String(row.id_lang ?? "").trim();
      const name = normalizeText(row.name);
      if (!idGroup || !name) continue;
      if (idLang === "1" || !groupNameById.has(idGroup)) {
        groupNameById.set(idGroup, name);
      }
    }

    const attributeIdsByProductAttributeId = new Map();
    for (const row of productAttributeCombinationRows) {
      const idProductAttribute = String(row.id_product_attribute ?? "").trim();
      const idAttribute = String(row.id_attribute ?? "").trim();
      if (!idProductAttribute || !idAttribute) continue;
      if (!attributeIdsByProductAttributeId.has(idProductAttribute)) {
        attributeIdsByProductAttributeId.set(idProductAttribute, []);
      }
      attributeIdsByProductAttributeId.get(idProductAttribute).push(idAttribute);
    }

    const imageMetaById = new Map();
    const coverImageInfoByProductId = new Map();
    for (const row of imageRows) {
      const idImage = String(row.id_image ?? "").trim();
      const idProduct = String(row.id_product ?? "").trim();
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
    for (const row of productAttributeImageRows) {
      const idProductAttribute = String(row.id_product_attribute ?? "").trim();
      const idImage = String(row.id_image ?? "").trim();
      if (!idProductAttribute || !idImage) continue;
      if (!imageIdsByProductAttributeId.has(idProductAttribute)) {
        imageIdsByProductAttributeId.set(idProductAttribute, []);
      }
      imageIdsByProductAttributeId.get(idProductAttribute).push(idImage);
    }

    let variantRows = [];
    const usedReferencesByProduct = new Map();
    let skippedMissingProduct = 0;
    let skippedMissingAppProduct = 0;
    let fallbackReferenceCount = 0;
    let variantsWithUnrecognizedGroups = 0;

    for (const row of productAttributeRows) {
      const idProductAttribute = String(row.id_product_attribute ?? "").trim();
      const idProduct = String(row.id_product ?? "").trim();
      if (!idProductAttribute || !idProduct) continue;

      const productReference = productRefById.get(idProduct);
      if (!productReference) {
        skippedMissingProduct += 1;
        continue;
      }

      if (!existingProductRefs.has(productReference)) {
        skippedMissingAppProduct += 1;
        continue;
      }

      const rawAttributeIds = attributeIdsByProductAttributeId.get(idProductAttribute) ?? [];
      const attributeItems = collectAttributeItems(
        rawAttributeIds,
        attributeValueById,
        attributeGroupByAttributeId,
        groupNameById,
        groupPositionById,
        attributePositionById
      );

      let color = "";
      let tamano = "";
      let tirador = "";
      let unknownGroups = 0;

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

        if (!item.groupType) {
          unknownGroups += 1;
        }
      }

      if (unknownGroups > 0) {
        variantsWithUnrecognizedGroups += 1;
      }

      const productImageIds = [...new Set(imageIdsByProductAttributeId.get(idProductAttribute) ?? [])];
      if (!productImageIds.length) {
        const coverInfo = coverImageInfoByProductId.get(idProduct);
        if (coverInfo?.idImage) {
          productImageIds.push(coverInfo.idImage);
        }
      }

      const resolvedImages = productImageIds
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

      const reference = normalizeText(row.reference);
      const baseReference = reference || `${productReference}-PA-${idProductAttribute}`;
      const usedReferences = usedReferencesByProduct.get(productReference) ?? new Set();
      let variantReference = baseReference;

      if (usedReferences.has(variantReference)) {
        let counter = 2;
        while (usedReferences.has(`${variantReference}-${counter}`)) {
          counter += 1;
        }
        variantReference = `${variantReference}-${counter}`;
      }

      usedReferences.add(variantReference);
      usedReferencesByProduct.set(productReference, usedReferences);

      if (!reference) {
        fallbackReferenceCount += 1;
      }

      variantRows.push({
        accion: "upsert",
        productoReferencia: productReference,
        referencia: variantReference,
        stock: String(Math.trunc(parseNumber(row.quantity, 0))),
        precio_extra: formatNumber(parseNumber(row.price, 0)),
        imagen: resolvedImages[0] ?? "",
        imagenMuestra: resolvedImages[0] ?? "",
        imagenesVariante: resolvedImages.join("|"),
        color,
        tamano,
        tirador,
      });
    }

    const sqlVariantCount = variantRows.length;

    if (sqlVariantCount === 0) {
      const fallback = await buildVariantRowsFromAppDatabase(prisma);
      variantRows = fallback.rows;
      skippedMissingProduct = fallback.skippedWithoutProductReference;
      skippedMissingAppProduct = 0;
      fallbackReferenceCount = fallback.fallbackReferenceCount;
      variantsWithUnrecognizedGroups = fallback.variantsWithUnrecognizedGroups;
    }

    variantRows.sort((left, right) => {
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
      ...variantRows.map((row) =>
        csvLine([
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
        ])
      ),
    ];

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${csvRows.join("\r\n")}\r\n`, "utf8");

    console.log(`CSV global generado en: ${outputPath}`);
    console.log(`Fuente usada: ${sqlVariantCount > 0 ? "dump Prestashop" : "fallback de la base de datos de la app"}`);
    console.log(`Productos detectados en la app: ${existingProductRefs.size}`);
    console.log(`Combinaciones exportadas: ${variantRows.length}`);
    console.log(`Productos de Prestashop sin referencia en la app: ${skippedMissingAppProduct}`);
    console.log(`Combinaciones sin producto relacionado en Prestashop: ${skippedMissingProduct}`);
    console.log(`Combinaciones con referencia de variante generada por fallback: ${fallbackReferenceCount}`);
    console.log(`Combinaciones con atributos no reconocidos en color/tamano/tirador: ${variantsWithUnrecognizedGroups}`);
    console.log("No hace falta CSV puente: el script intenta leer el .sql directamente y, si el dump no trae las tablas de combinaciones, cae a las variantes reales ya cargadas en la app.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});