const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const dumpPath = path.resolve(rootDir, "mysql_data", "prestashop", "1775837276-334a5d4d.sql", "1775837276-334a5d4d.sql");
const outputPath = path.resolve(rootDir, "importacion", "atributovalores_importacion_nextjs.csv");

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function csvLine(fields) {
  return fields.map(csvCell).join(";");
}

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unescapeSqlString(value) {
  return value
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
  const pattern = new RegExp(`INSERT INTO ${escapeRegExp("`")}${escapeRegExp(tableName)}${escapeRegExp("`")} VALUES\\s*([\\s\\S]*?);`, "g");
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

function parseDescriptorList(value) {
  return normalizeWhitespace(value)
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.split(":")[0].trim())
    .filter(Boolean);
}

function normalizeGroupName(rawGroupName) {
  const trimmed = normalizeWhitespace(rawGroupName);
  const lettersOnly = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/gi, "")
    .toLowerCase();

  if (lettersOnly === "tama" || lettersOnly === "tamao" || lettersOnly === "tamano" || lettersOnly === "tamanoo" || lettersOnly === "tamanio") {
    return "Tamaño";
  }

  if (lettersOnly === "color") {
    return "Color";
  }

  if (lettersOnly === "tirador") {
    return "Tirador";
  }

  return trimmed;
}

function isSizeLikeGroup(groupName) {
  const normalized = normalizeWhitespace(groupName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    /\d+\s*[xX]\s*\d+/.test(normalized) ||
    /\d+\s*[xX]\s*\d+\s*\+\s*\d+/.test(normalized) ||
    /\d+\s*-\s*\d+\s*[xX]\s*\d+/.test(normalized) ||
    /\d+\s*[xX]\s*\d+\s*cm/.test(normalized)
  );
}

function isPureNumericValue(value) {
  return /^\d+$/.test(normalizeWhitespace(value));
}

function addPair(groupValues, seenRows, rawGroupName, rawValue, sourceLabel) {
  const atributo = normalizeGroupName(rawGroupName);
  const valor = normalizeWhitespace(rawValue);

  if (!atributo || !valor) {
    return;
  }

  if (sourceLabel === "attributes" && isSizeLikeGroup(atributo)) {
    return;
  }

  if (sourceLabel === "attributes" && isPureNumericValue(valor)) {
    return;
  }

  const rowKey = `${atributo}|||${valor}`;
  if (seenRows.has(rowKey)) {
    return;
  }

  seenRows.add(rowKey);

  if (!groupValues.has(atributo)) {
    groupValues.set(atributo, []);
  }

  const values = groupValues.get(atributo);
  if (!values.includes(valor)) {
    values.push(valor);
  }
}

function collectFromComboTable(sql, groupValues, seenRows) {
  const blocks = extractInsertBlocks(sql, "ps_ba_importer_data_1");
  let parsedRows = 0;
  let pairedValues = 0;

  for (const block of blocks) {
    const tuples = extractTuples(block);
    for (const tuple of tuples) {
      const fields = splitSqlRow(tuple);
      if (fields.length < 3) {
        continue;
      }

      parsedRows += 1;

      const groups = parseDescriptorList(fields[1]);
      const values = parseDescriptorList(fields[2]);
      const pairCount = Math.min(groups.length, values.length);
      pairedValues += pairCount;

      for (let index = 0; index < pairCount; index += 1) {
        addPair(groupValues, seenRows, groups[index], values[index], "combo");
      }
    }
  }

  return { parsedRows, pairedValues };
}

function collectFromAttributeTables(sql, groupValues, seenRows) {
  const groupNameById = new Map();
  const attributeGroupById = new Map();
  const attributeNameById = new Map();

  for (const block of extractInsertBlocks(sql, "ps_attribute_group_lang")) {
    const tuples = extractTuples(block);
    for (const tuple of tuples) {
      const fields = splitSqlRow(tuple);
      if (fields.length < 4) {
        continue;
      }

      const idGroup = String(fields[0]);
      const idLang = String(fields[1]);
      if (idLang !== "1") {
        continue;
      }

      const groupName = normalizeGroupName(fields[2]);
      if (!groupNameById.has(idGroup)) {
        groupNameById.set(idGroup, groupName);
      }
    }
  }

  for (const block of extractInsertBlocks(sql, "ps_attribute")) {
    const tuples = extractTuples(block);
    for (const tuple of tuples) {
      const fields = splitSqlRow(tuple);
      if (fields.length < 2) {
        continue;
      }

      attributeGroupById.set(String(fields[0]), String(fields[1]));
    }
  }

  for (const block of extractInsertBlocks(sql, "ps_attribute_lang")) {
    const tuples = extractTuples(block);
    for (const tuple of tuples) {
      const fields = splitSqlRow(tuple);
      if (fields.length < 3) {
        continue;
      }

      const idAttribute = String(fields[0]);
      const idLang = String(fields[1]);
      if (idLang !== "1") {
        continue;
      }

      const valueName = normalizeWhitespace(fields[2]);
      if (!valueName) {
        continue;
      }

      const idGroup = attributeGroupById.get(idAttribute);
      if (!idGroup) {
        continue;
      }

      const groupName = groupNameById.get(idGroup);
      if (!groupName || isSizeLikeGroup(groupName)) {
        continue;
      }

      addPair(groupValues, seenRows, groupName, valueName, "attributes");
    }
  }
}

function main() {
  if (!fs.existsSync(dumpPath)) {
    throw new Error(`No existe el dump de Prestashop: ${dumpPath}`);
  }

  const sql = fs.readFileSync(dumpPath, "utf8");
  const groupValues = new Map();
  const seenRows = new Set();

  const comboStats = collectFromComboTable(sql, groupValues, seenRows);
  collectFromAttributeTables(sql, groupValues, seenRows);

  const rows = [csvLine(["accion", "atributo", "atributoId", "valor", "colorHex", "imagen", "orden"])];

  for (const [atributo, values] of groupValues.entries()) {
    values.forEach((valor, index) => {
      rows.push(csvLine(["upsert", atributo, "", valor, "", "", String(index)]));
    });
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${rows.join("\r\n")}\r\n`, "utf8");

  const totalRows = rows.length - 1;
  const atributos = groupValues.size;
  const sizeRows = [...groupValues.entries()].reduce((count, [atributo, values]) => {
    return count + (atributo === "Tamaño" ? values.length : 0);
  }, 0);

  console.log(`OK: CSV regenerado en ${outputPath}`);
  console.log(`Fuente combinaciones: ${comboStats.parsedRows} filas, ${comboStats.pairedValues} pares leídos.`);
  console.log(`Atributos exportados: ${atributos}. Filas de CSV: ${totalRows}. Tamaño: ${sizeRows}.`);
}

main();