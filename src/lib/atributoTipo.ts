export type AtributoTipo = "desplegable" | "miniatura_imagen_color" | "botones_radio";

export type AtributoTipoOption = {
  value: AtributoTipo;
  label: string;
  description: string;
};

export const ATRIBUTO_TIPOS: AtributoTipoOption[] = [
  {
    value: "desplegable",
    label: "Desplegable",
    description: "Lista tradicional para elegir un valor.",
  },
  {
    value: "miniatura_imagen_color",
    label: "Miniatura / imagen / color",
    description: "Selector visual con color o imagen.",
  },
  {
    value: "botones_radio",
    label: "Botones radio",
    description: "Selector en línea con botones visibles.",
  },
];

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function parseBooleanLike(value: unknown) {
  const normalized = normalizeText(value);
  return ["1", "true", "si", "s", "yes", "y", "activo"].includes(normalized);
}

function normalizeAtributoTipoValue(value: unknown): AtributoTipo | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  if (["desplegable", "select", "dropdown", "lista", "combo", "0"].includes(normalized)) {
    return "desplegable";
  }

  if (["miniaturaimagencolor", "miniaturaimagen", "miniatura", "imagencolor", "color", "swatch", "swatches", "image", "imagen"].includes(normalized)) {
    return "miniatura_imagen_color";
  }

  if (["botonesradio", "radio", "botonradio", "radiobuttons", "buttons", "1"].includes(normalized)) {
    return "botones_radio";
  }

  return null;
}

export function normalizeAtributoTipo(value: unknown, fallback: AtributoTipo = "desplegable"): AtributoTipo {
  return normalizeAtributoTipoValue(value) ?? fallback;
}

export function resolveAtributoTipo(input: {
  tipo?: unknown;
  groupType?: unknown;
  isColorGroup?: unknown;
  fallback?: AtributoTipo;
} = {}) {
  const fallback = input.fallback ?? "desplegable";

  const explicitTipo = normalizeAtributoTipoValue(input.tipo);
  if (explicitTipo) return explicitTipo;

  const groupType = normalizeAtributoTipoValue(input.groupType);
  if (groupType) return groupType;

  if (parseBooleanLike(input.isColorGroup)) return "miniatura_imagen_color";

  return fallback;
}

export function getAtributoTipoLabel(value: unknown) {
  const tipo = normalizeAtributoTipo(value);
  return ATRIBUTO_TIPOS.find((option) => option.value === tipo)?.label ?? "Desplegable";
}