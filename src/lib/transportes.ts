export type ShippingMode = "above" | "below";

export type ShippingZoneId = "peninsula" | "baleares" | "portugal" | "italia" | "canarias";

export type ShippingZoneConfig = {
  id: ShippingZoneId;
  name: string;
  price: number;
  active: boolean;
  note: string;
  order: number;
  countries: string[];
  provinces: string[];
};

export type ShippingCarrierConfig = {
  id: string;
  name: string;
  image: string;
  transitTime: string;
  trackingUrl: string;
  speed: number;
  active: boolean;
  freeShippingEnabled: boolean;
  freeShippingMode: ShippingMode;
  freeShippingAmount: number;
  zones: ShippingZoneConfig[];
};

export type ShippingConfig = {
  pickupEnabled: boolean;
  pickupName: string;
  pickupDescription: string;
  pickupImage: string;
  carriers: ShippingCarrierConfig[];
};

export type ShippingAddress = {
  pais?: string | null;
  provincia?: string | null;
  codigoPostal?: string | null;
  ciudad?: string | null;
};

export type ShippingOption = {
  id: string;
  metodo: "pickup" | "delivery";
  label: string;
  descripcion: string;
  coste: number;
  gratisAplicado: boolean;
  zonaId?: ShippingZoneId | null;
  zonaNombre?: string | null;
  carrierId?: string | null;
  carrierName?: string | null;
  carrierImage?: string | null;
};

export type ShippingResult = {
  ok: boolean;
  options: ShippingOption[];
  zoneId?: ShippingZoneId | null;
  zoneName?: string | null;
  warning?: string;
  error?: string;
};

const SPANISH_PENINSULA_PROVINCES = [
  "a coruna",
  "araba",
  "alava",
  "albacete",
  "alicante",
  "almeria",
  "asturias",
  "avila",
  "badajoz",
  "barcelona",
  "burgos",
  "caceres",
  "cadiz",
  "cantabria",
  "castellon",
  "ciudad real",
  "cordoba",
  "cuenca",
  "girona",
  "granada",
  "guadalajara",
  "gipuzkoa",
  "guipuzcoa",
  "huelva",
  "huesca",
  "jaen",
  "la rioja",
  "leon",
  "lleida",
  "lugo",
  "madrid",
  "malaga",
  "murcia",
  "navarra",
  "ourense",
  "palencia",
  "pontevedra",
  "salamanca",
  "segovia",
  "sevilla",
  "soria",
  "tarragona",
  "teruel",
  "toledo",
  "valencia",
  "valladolid",
  "bizkaia",
  "vizcaya",
  "zamora",
  "zaragoza",
];

const BALEARIC_PROVINCES = ["islas baleares", "illes balears", "baleares"];
const CANARY_PROVINCES = ["las palmas", "santa cruz de tenerife", "canarias", "islas canarias"];

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isOneOf(value: string, candidates: string[]) {
  const normalized = normalizeText(value);
  return candidates.some((candidate) => normalized === normalizeText(candidate));
}

function slugify(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "carrier";
}

function normalizeList(values: string[] | null | undefined) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    )
  );
}

export function createDefaultShippingZones(): ShippingZoneConfig[] {
  return [
    {
      id: "peninsula",
      name: "Península",
      price: 5.74,
      active: true,
      note: "España peninsular",
      order: 1,
      countries: ["España"],
      provinces: SPANISH_PENINSULA_PROVINCES,
    },
    {
      id: "baleares",
      name: "Baleares",
      price: 12.36,
      active: true,
      note: "Islas Baleares",
      order: 2,
      countries: ["España"],
      provinces: BALEARIC_PROVINCES,
    },
    {
      id: "canarias",
      name: "Canarias",
      price: 0,
      active: false,
      note: "No realizamos envíos a Canarias",
      order: 3,
      countries: ["España"],
      provinces: CANARY_PROVINCES,
    },
    {
      id: "portugal",
      name: "Portugal",
      price: 12.36,
      active: true,
      note: "Solo Portugal",
      order: 4,
      countries: ["Portugal"],
      provinces: [],
    },
    {
      id: "italia",
      name: "Italia",
      price: 16.95,
      active: true,
      note: "Solo Italia",
      order: 5,
      countries: ["Italia"],
      provinces: [],
    },
  ];
}

export function createDefaultCarrierConfig(
  overrides: Partial<ShippingCarrierConfig> & { id?: string; name?: string; image?: string } = {}
): ShippingCarrierConfig {
  const name = overrides.name ?? "Ontime";

  return {
    id: overrides.id ?? slugify(name),
    name,
    image: overrides.image ?? "",
    transitTime: overrides.transitTime ?? "24 - 72 horas desde el envío",
    trackingUrl: overrides.trackingUrl ?? "",
    speed: overrides.speed ?? 4,
    active: overrides.active !== undefined ? overrides.active : true,
    freeShippingEnabled: overrides.freeShippingEnabled !== undefined ? overrides.freeShippingEnabled : true,
    freeShippingMode: overrides.freeShippingMode === "below" ? "below" : "above",
    freeShippingAmount: overrides.freeShippingAmount ?? 59.95,
    zones: normalizeShippingZones(overrides.zones ?? createDefaultShippingZones()),
  };
}

export function createDefaultTransportConfig(): ShippingConfig {
  return {
    pickupEnabled: true,
    pickupName: "Recogida en tienda",
    pickupDescription: "Pásate por nuestra tienda en Sabadell cuando te avisemos.",
    pickupImage: "",
    carriers: [
      createDefaultCarrierConfig({
        id: "ontime",
        name: "Ontime",
        image: "",
        transitTime: "24 - 72 horas desde el envío",
        freeShippingAmount: 59.95,
      }),
    ],
  };
}

export function normalizeShippingZones(rawZones: any[]): ShippingZoneConfig[] {
  const defaultZones = createDefaultShippingZones();

  return rawZones
    .map((zone: any, index: number) => ({
      id: zone.id ?? defaultZones[index]?.id ?? `zona-${index + 1}`,
      name: zone.name ?? defaultZones[index]?.name ?? `Zona ${index + 1}`,
      price: Number(zone.price ?? defaultZones[index]?.price ?? 0),
      active: zone.active !== undefined ? Boolean(zone.active) : (defaultZones[index]?.active ?? true),
      note: zone.note ?? defaultZones[index]?.note ?? "",
      order: Number(zone.order ?? index + 1),
      countries: normalizeList(zone.countries ?? defaultZones[index]?.countries ?? []),
      provinces: normalizeList(zone.provinces ?? defaultZones[index]?.provinces ?? []),
    }))
    .sort((left, right) => left.order - right.order);
}

export function normalizeCarrierConfig(raw: any, index: number = 0): ShippingCarrierConfig {
  const defaultCarrier = createDefaultCarrierConfig();
  const carrierName = raw?.name ?? raw?.carrierName ?? defaultCarrier.name;

  return {
    id: raw?.id ?? slugify(carrierName) ?? `carrier-${index + 1}`,
    name: carrierName,
    image: raw?.image ?? raw?.imageUrl ?? defaultCarrier.image,
    transitTime: raw?.transitTime ?? defaultCarrier.transitTime,
    trackingUrl: raw?.trackingUrl ?? defaultCarrier.trackingUrl,
    speed: Number(raw?.speed ?? defaultCarrier.speed),
    active: raw?.active !== undefined ? Boolean(raw.active) : true,
    freeShippingEnabled: raw?.freeShippingEnabled !== undefined ? Boolean(raw.freeShippingEnabled) : defaultCarrier.freeShippingEnabled,
    freeShippingMode: raw?.freeShippingMode === "below" ? "below" : "above",
    freeShippingAmount: Number(raw?.freeShippingAmount ?? defaultCarrier.freeShippingAmount),
    zones: normalizeShippingZones(Array.isArray(raw?.zones) ? raw.zones : defaultCarrier.zones),
  };
}

export function normalizeShippingConfig(raw: any): ShippingConfig {
  const defaultConfig = createDefaultTransportConfig();

  if (!raw || typeof raw !== "object") return defaultConfig;

  if (Array.isArray(raw.carriers)) {
    return {
      pickupEnabled: raw.pickupEnabled !== undefined ? Boolean(raw.pickupEnabled) : defaultConfig.pickupEnabled,
      pickupName: raw.pickupName ?? defaultConfig.pickupName,
      pickupDescription: raw.pickupDescription ?? defaultConfig.pickupDescription,
      pickupImage: raw.pickupImage ?? defaultConfig.pickupImage,
      carriers: raw.carriers.length
        ? raw.carriers.map((carrier: any, index: number) => normalizeCarrierConfig(carrier, index))
        : defaultConfig.carriers,
    };
  }

  const legacyCarrier = normalizeCarrierConfig({
    id: raw.id ?? raw.carrierId ?? "ontime",
    name: raw.carrierName ?? raw.name ?? "Ontime",
    image: raw.image ?? raw.carrierImage ?? "",
    transitTime: raw.transitTime,
    trackingUrl: raw.trackingUrl,
    speed: raw.speed,
    active: raw.active,
    freeShippingEnabled: raw.freeShippingEnabled,
    freeShippingMode: raw.freeShippingMode,
    freeShippingAmount: raw.freeShippingAmount,
    zones: raw.zones,
  });

  return {
    pickupEnabled: raw.pickupEnabled !== undefined ? Boolean(raw.pickupEnabled) : defaultConfig.pickupEnabled,
    pickupName: raw.pickupName ?? defaultConfig.pickupName,
    pickupDescription: raw.pickupDescription ?? defaultConfig.pickupDescription,
    pickupImage: raw.pickupImage ?? defaultConfig.pickupImage,
    carriers: [legacyCarrier],
  };
}

export function shouldApplyFreeShipping(mode: ShippingMode, subtotal: number, amount: number) {
  return mode === "above" ? subtotal >= amount : subtotal <= amount;
}

function getCarrierOption(
  carrier: ShippingCarrierConfig,
  zoneId: ShippingZoneId,
  subtotal: number
): ShippingOption | null {
  const zone = carrier.zones.find((item) => item.id === zoneId);

  if (!carrier.active || !zone || !zone.active) return null;

  const freeApplied = carrier.freeShippingEnabled
    ? shouldApplyFreeShipping(carrier.freeShippingMode, subtotal, carrier.freeShippingAmount)
    : false;

  return {
    id: `delivery:${carrier.id}:${zone.id}`,
    metodo: "delivery",
    label: carrier.name,
    descripcion: `${carrier.transitTime} · ${zone.name}`,
    coste: freeApplied ? 0 : Number(zone.price ?? 0),
    gratisAplicado: freeApplied,
    zonaId: zone.id,
    zonaNombre: zone.name,
    carrierId: carrier.id,
    carrierName: carrier.name,
    carrierImage: carrier.image || null,
  };
}

function zoneMatchesAddress(zone: ShippingZoneConfig, address: ShippingAddress) {
  const country = normalizeText(address.pais || "España");
  const province = normalizeText(address.provincia);

  const countryMatches = zone.countries.length === 0
    ? true
    : zone.countries.some((candidate) => normalizeText(candidate) === country);

  const provinceMatches = zone.provinces.length === 0
    ? true
    : zone.provinces.some((candidate) => normalizeText(candidate) === province);

  return countryMatches && provinceMatches;
}

export function calculateShippingResult(
  config: ShippingConfig,
  subtotal: number,
  address: ShippingAddress
): ShippingResult {
  const normalizedConfig = normalizeShippingConfig(config);
  const zoneId = detectShippingZone(address, normalizedConfig);
  const zoneName = normalizedConfig.carriers[0]?.zones.find((item) => item.id === zoneId)?.name ?? null;
  const options: ShippingOption[] = [];

  if (normalizedConfig.pickupEnabled) {
    options.push({
      id: "pickup",
      metodo: "pickup",
      label: normalizedConfig.pickupName,
      descripcion: normalizedConfig.pickupDescription,
      coste: 0,
      gratisAplicado: true,
      zonaId: null,
      zonaNombre: null,
      carrierId: null,
      carrierName: null,
      carrierImage: normalizedConfig.pickupImage || null,
    });
  }

  if (zoneId === null) {
    return {
      ok: options.length > 0,
      options,
      warning: "No realizamos envíos a la zona indicada.",
    };
  }

  const carrierOptions = normalizedConfig.carriers
    .map((carrier) => getCarrierOption(carrier, zoneId, subtotal))
    .filter((option): option is ShippingOption => Boolean(option));

  options.push(...carrierOptions);

  if (!carrierOptions.length) {
    return {
      ok: options.length > 0,
      options,
      zoneId,
      zoneName,
      warning: `No hay transportistas disponibles para ${zoneName ?? zoneId}.`,
    };
  }

  return {
    ok: true,
    options,
    zoneId,
    zoneName,
  };
}

export function shippingConfigToSerializable(config: ShippingConfig) {
  return JSON.parse(JSON.stringify(normalizeShippingConfig(config))) as ShippingConfig;
}

export function detectShippingZone(address: ShippingAddress, config?: ShippingConfig): ShippingZoneId | null {
  const normalizedConfig = config ? normalizeShippingConfig(config) : null;
  const zones = normalizedConfig?.carriers[0]?.zones ?? createDefaultShippingZones();

  const orderedZones = [...zones].sort((left, right) => left.order - right.order);
  const matchedZone = orderedZones.find((zone) => zone.active && zoneMatchesAddress(zone, address));
  return matchedZone?.id ?? null;
}
