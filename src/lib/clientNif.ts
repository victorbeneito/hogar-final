export function normalizeClientNif(value: unknown) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
const CIF_CONTROL_LETTERS = "JABCDEFGHI";

const CIF_NUMERIC_CONTROL_PREFIXES = new Set(["A", "B", "E", "H"]);
const CIF_LETTER_CONTROL_PREFIXES = new Set(["K", "P", "Q", "S", "W"]);

const INVALID_CLIENT_NIFS = new Set([
  "",
  "0",
  "1",
  "DNI",
  "NIF",
  "NIE",
  "CIF",
  "IVA",
  "NULO",
  "NULL",
  "NA",
  "N/A",
  "CASA",
  "XXX",
]);

export const SPANISH_FISCAL_DOCUMENT_ERROR =
  "Introduce un DNI/NIE/CIF válido. Si es DNI/NIE se comprueba la letra; si es CIF, el dígito de control.";

function normalizeSpanishDocumentForValidation(value: unknown) {
  const normalized = normalizeClientNif(value);
  if (normalized.startsWith("ES") && normalized.length > 2) {
    return normalized.slice(2);
  }

  return normalized;
}

function isValidDniNie(document: string) {
  const dniMatch = document.match(/^(\d{8})([A-Z])$/);
  if (dniMatch) {
    const digits = Number(dniMatch[1]);
    return DNI_LETTERS[digits % 23] === dniMatch[2];
  }

  const nieMatch = document.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (nieMatch) {
    const niePrefixDigits = { X: "0", Y: "1", Z: "2" }[nieMatch[1] as "X" | "Y" | "Z"];
    const digits = Number(`${niePrefixDigits}${nieMatch[2]}`);
    return DNI_LETTERS[digits % 23] === nieMatch[3];
  }

  return false;
}

function calculateCifControlDigit(bodyDigits: string) {
  let total = 0;

  for (let index = 0; index < bodyDigits.length; index += 1) {
    const digit = Number(bodyDigits[index]);
    if (Number.isNaN(digit)) {
      return null;
    }

    if ((index + 1) % 2 === 0) {
      total += digit;
    } else {
      const doubled = digit * 2;
      total += Math.floor(doubled / 10) + (doubled % 10);
    }
  }

  return (10 - (total % 10)) % 10;
}

export function isValidSpanishDniNie(value: unknown) {
  const document = normalizeSpanishDocumentForValidation(value);
  if (!document) return false;
  return isValidDniNie(document);
}

export function isValidSpanishCif(value: unknown) {
  const document = normalizeSpanishDocumentForValidation(value);
  const match = document.match(/^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/);
  if (!match) return false;

  const prefix = match[1];
  const control = match[3];
  const controlDigit = calculateCifControlDigit(match[2]);
  if (controlDigit === null) return false;

  const controlLetter = CIF_CONTROL_LETTERS[controlDigit];

  if (CIF_NUMERIC_CONTROL_PREFIXES.has(prefix)) {
    return control === String(controlDigit);
  }

  if (CIF_LETTER_CONTROL_PREFIXES.has(prefix)) {
    return control === controlLetter;
  }

  return control === String(controlDigit) || control === controlLetter;
}

export function isValidSpanishFiscalDocument(value: unknown) {
  return isValidSpanishDniNie(value) || isValidSpanishCif(value);
}

export function isPlausibleClientNif(value: unknown) {
  const nif = normalizeClientNif(value);
  if (!nif) return false;
  if (INVALID_CLIENT_NIFS.has(nif)) return false;
  if (nif.length < 8) return false;
  return /^[A-Z0-9]+$/.test(nif);
}

export function buildFallbackNif(email: string) {
  const safeEmail = String(email)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `SIN_NIF_${safeEmail || Date.now()}`;
}