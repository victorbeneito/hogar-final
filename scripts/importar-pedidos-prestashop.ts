import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import dotenv from "dotenv";
import Papa from "papaparse";
import bcrypt from "bcryptjs";
import { buildFallbackNif, isPlausibleClientNif, normalizeClientNif } from "../src/lib/clientNif";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const DEFAULT_INPUT_DIR = "importacion/pedidos";
const DEFAULT_SINCE = "2021-01-01";

let prismaInstance: any = null;

type CsvRow = Record<string, string>;

type PrestashopStateMeta = {
  id: number;
  name: string;
  color: string | null;
  invoice: boolean;
  shipped: boolean;
  paid: boolean;
  delivery: boolean;
  deleted: boolean;
  hidden: boolean;
  logable: boolean;
};

type OrderStatus = "PENDIENTE" | "PROCESANDO" | "ENVIADO" | "ENTREGADO" | "CANCELADO" | "DEVUELTO";
type OrderPaymentStatus = "PENDIENTE" | "PAGADO" | "FALLIDO" | "REEMBOLSADO";

type ImportSummary = {
  customersCreated: number;
  customersUpdated: number;
  addressesCreated: number;
  addressesUpdated: number;
  ordersCreated: number;
  ordersUpdated: number;
  invoicesCreated: number;
  invoicesUpdated: number;
  linesCreated: number;
  linesUpdated: number;
  skippedBeforeSince: number;
};

type ProgressReporter = ReturnType<typeof createProgressReporter>;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function parseBool(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = normalizeText(value).toLowerCase();
  return ["1", "true", "si", "sí", "s", "yes", "y", "activo"].includes(normalized);
}

function parseNumber(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = Number(String(value).replace(",", "."));
  return Number.isFinite(normalized) ? normalized : fallback;
}

function fitText(value: unknown, maxLength = 191) {
  const text = normalizeText(value);
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function fitTextOrNull(value: unknown, maxLength = 191) {
  const text = fitText(value, maxLength);
  return text ? text : null;
}

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function formatDuration(ms: number) {
  const safeSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatProgressBar(completed: number, total: number, width = 24) {
  if (!Number.isFinite(total) || total <= 0) {
    return `[${"=".repeat(width)}]`;
  }

  const ratio = Math.min(1, Math.max(0, completed / total));
  const filled = Math.round(ratio * width);
  return `[${"=".repeat(filled)}${".".repeat(Math.max(0, width - filled))}]`;
}

function truncateProgressText(value: string, maxLength = 56) {
  const text = normalizeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function createProgressReporter(isInteractive: boolean) {
  let phaseName = "";
  let total = 0;
  let completed = 0;
  let activeIndex = 0;
  let activeLabel = "";
  let startedAt = Date.now();
  let activeSince = startedAt;
  let lastRenderAt = 0;
  let heartbeat: NodeJS.Timeout | null = null;

  const clearCurrentLine = () => {
    if (!isInteractive) return;
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  };

  const render = (force = false) => {
    if (!isInteractive) return;

    const now = Date.now();
    if (!force && now - lastRenderAt < 250) return;
    lastRenderAt = now;

    const rate = completed > 0 ? completed / ((now - startedAt) / 1000) : 0;
    const eta = rate > 0 && completed < total ? formatDuration(((total - completed) / rate) * 1000) : "--:--";
    const activeAge = activeIndex > 0 ? formatDuration(now - activeSince) : "00:00";
    const line = `${formatProgressBar(completed, total)} ${phaseName} ${completed}/${total} completados | actual ${activeIndex || completed}/${total} | ${truncateProgressText(activeLabel || "preparando")} | transcurrido ${formatDuration(now - startedAt)} | ETA ${eta} | en curso ${activeAge}`;

    clearCurrentLine();
    process.stdout.write(line);
  };

  const startHeartbeat = () => {
    if (!isInteractive) return;
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = setInterval(() => {
      if (activeIndex > 0 && completed < total) {
        render(true);
      }
    }, 5000);
    heartbeat.unref?.();
  };

  const phase = (label: string, phaseTotal: number) => {
    phaseName = label;
    total = Math.max(0, phaseTotal);
    completed = 0;
    activeIndex = 0;
    activeLabel = "";
    startedAt = Date.now();
    activeSince = startedAt;

    if (isInteractive) {
      process.stdout.write("\n");
      console.log(`>> ${label}: ${phaseTotal} registros`);
      render(true);
    } else {
      console.log(`>> ${label}: ${phaseTotal} registros`);
    }

    startHeartbeat();
  };

  const startItem = (index: number, label: string) => {
    activeIndex = index;
    activeLabel = truncateProgressText(label);
    activeSince = Date.now();
    render(true);
  };

  const completeItem = () => {
    completed = Math.max(completed, activeIndex);
  };

  const note = (message: string) => {
    if (isInteractive) {
      clearCurrentLine();
      process.stdout.write("\n");
      console.log(message);
      render(true);
      return;
    }

    console.log(message);
  };

  const finish = (message?: string) => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }

    if (message) {
      note(message);
      return;
    }

    if (isInteractive) {
      clearCurrentLine();
      process.stdout.write("\n");
    }
  };

  return {
    phase,
    startItem,
    completeItem,
    note,
    finish,
    render,
    get completed() {
      return completed;
    },
    get total() {
      return total;
    },
  };
}

function parseDate(value: unknown): Date | null {
  const normalized = normalizeText(value);
  if (!normalized || normalized.startsWith("0000-00-00")) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

function pickText(row: CsvRow, ...keys: string[]) {
  for (const key of keys) {
    const value = normalizeText(row[key]);
    if (value) return value;
  }
  return "";
}

function pickNumber(row: CsvRow, ...keys: string[]) {
  for (const key of keys) {
    const raw = normalizeText(row[key]);
    if (!raw) continue;
    const parsed = parseNumber(raw, NaN);
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}

function detectDelimiter(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  const candidates = [";", ",", "\t", "|"];
  let best = ";";
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = lines.reduce((sum, line) => sum + Math.max(0, line.split(candidate).length - 1), 0);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return bestScore > 0 ? best : ";";
}

async function readCsvRows(filePath: string) {
  const text = await fs.readFile(filePath, "utf8");
  const delimiter = detectDelimiter(text);
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
    transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
  });

  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0];
    throw new Error(`Error leyendo ${path.basename(filePath)}: ${firstError.message}`);
  }

  return (parsed.data || []).filter((row) => Object.values(row).some((value) => normalizeText(value)));
}

async function findCsvFile(inputDir: string, regexes: RegExp[], required = true) {
  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  for (const regex of regexes) {
    const matches = files.filter((file) => regex.test(file));
    if (matches.length > 0) {
      return path.join(inputDir, matches[matches.length - 1]);
    }
  }

  if (required) {
    const expected = regexes.map((regex) => regex.toString()).join(" | ");
    throw new Error(`No se encontró ningún CSV que coincida con: ${expected}`);
  }

  return null;
}

function normalizeCountry(address: CsvRow) {
  const countryId = normalizeText(address.id_country);
  if (!countryId || countryId === "0" || countryId === "6") return "España";
  if (countryId === "21") return "Estados Unidos";
  if (countryId === "143") return "Hungría";
  return `País ${countryId}`;
}

function normalizeProvince(address: CsvRow) {
  const stateId = normalizeText(address.id_state);
  if (!stateId || stateId === "0") return normalizeText(address.city) || "Sin provincia";
  return `Estado ${stateId}`;
}

function buildAddressSnapshot(address: CsvRow | null | undefined, fallbackCustomer: CsvRow | null | undefined) {
  return {
    nombre: fitText(pickText(address ?? {}, "firstname") || pickText(fallbackCustomer ?? {}, "firstname") || "Cliente"),
    apellidos: fitText(pickText(address ?? {}, "lastname") || pickText(fallbackCustomer ?? {}, "lastname") || "Prestashop"),
    empresa: fitText(pickText(address ?? {}, "company") || pickText(fallbackCustomer ?? {}, "company") || "" ) || null,
    nif: fitText(pickText(address ?? {}, "vat_number", "dni") || "") || null,
    telefono: fitText(pickText(address ?? {}, "phone_mobile", "phone") || "") || null,
    direccion: fitText(pickText(address ?? {}, "address1") || "Sin dirección"),
    direccionComplementaria: fitText(pickText(address ?? {}, "address2", "other") || "") || null,
    codigoPostal: fitText(pickText(address ?? {}, "postcode") || "00000", 32),
    ciudad: fitText(pickText(address ?? {}, "city") || "Sin ciudad"),
    provincia: fitText(normalizeProvince(address ?? {})),
    pais: fitText(normalizeCountry(address ?? {})),
  };
}

function buildStateMeta(stateRows: CsvRow[], stateLangRows: CsvRow[]) {
  const selectedLangId = stateLangRows.some((row) => normalizeText(row.id_lang) === "1") ? "1" : stateLangRows[0]?.id_lang ?? null;
  const labels = new Map<number, string>();

  for (const row of stateLangRows) {
    const id = Number(normalizeText(row.id_order_state));
    if (!Number.isInteger(id)) continue;
    if (selectedLangId && normalizeText(row.id_lang) !== normalizeText(selectedLangId)) continue;
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
      invoice: parseBool(row.invoice),
      shipped: parseBool(row.shipped),
      paid: parseBool(row.paid),
      delivery: parseBool(row.delivery),
      deleted: parseBool(row.deleted),
      hidden: parseBool(row.hidden),
      logable: parseBool(row.logable),
    });
  }

  return meta;
}

function mapPrestashopStatus(orderRow: CsvRow, stateMeta: PrestashopStateMeta | undefined) {
  const label = stateMeta?.name || `Estado ${normalizeText(orderRow.current_state) || "desconocido"}`;
  const normalized = label.toLowerCase();
  const valid = parseBool(orderRow.valid, false);

  let estado: OrderStatus = "PENDIENTE";
  if (normalized.includes("entreg")) {
    estado = "ENTREGADO";
  } else if (normalized.includes("enviad") || stateMeta?.shipped) {
    estado = "ENVIADO";
  } else if (normalized.includes("cancel")) {
    estado = "CANCELADO";
  } else if (normalized.includes("reembols") || normalized.includes("devol") || normalized.includes("refund")) {
    estado = "DEVUELTO";
  } else if (normalized.includes("prepar") || normalized.includes("acept") || stateMeta?.paid) {
    estado = "PROCESANDO";
  }

  let estadoPago: OrderPaymentStatus = valid || stateMeta?.paid ? "PAGADO" : "PENDIENTE";
  if (normalized.includes("error") || normalized.includes("fall")) {
    estadoPago = "FALLIDO";
  } else if (normalized.includes("reembols") || normalized.includes("devol") || normalized.includes("refund")) {
    estadoPago = "REEMBOLSADO";
  }

  return {
    estado,
    estadoPago,
    label,
    color: stateMeta?.color ?? null,
  };
}

function buildPrestashopOrderNote(orderRow: CsvRow, statusLabel: string, statusColor: string | null) {
  const note = normalizeText(orderRow.note || orderRow.customer_note || orderRow.message);
  const metadata = [
    `Prestashop id_order=${pickText(orderRow, "id_order") || "?"}`,
    `reference=${pickText(orderRow, "reference") || "?"}`,
    `current_state=${pickText(orderRow, "current_state") || "?"}`,
    `estado="${statusLabel}"`,
    `color=${statusColor || "n/a"}`,
    `module=${pickText(orderRow, "module") || "?"}`,
  ].join("; ");

  return note ? `${note}\n\n[Importado de Prestashop]\n${metadata}` : `[Importado de Prestashop]\n${metadata}`;
}

function resolveClienteNif(email: string, customerRow: CsvRow, primaryAddress: CsvRow | null, nifOwnerCache: Map<string, string>) {
  const candidate = normalizeClientNif(pickText(primaryAddress ?? {}, "vat_number", "dni") || pickText(customerRow, "company"));
  if (!isPlausibleClientNif(candidate)) {
    return buildFallbackNif(email);
  }

  const emailKey = email.toLowerCase();
  const cachedOwner = nifOwnerCache.get(candidate);
  if (cachedOwner) {
    return cachedOwner === emailKey ? candidate : buildFallbackNif(email);
  }

  return candidate;
}

async function ensureCustomer(customerRow: CsvRow, primaryAddress: CsvRow | null, nifOwnerCache: Map<string, string>) {
  const email = normalizeText(customerRow.email);
  if (!email) throw new Error("Falta email de cliente");

  const passwordValue = normalizeText(customerRow.passwd) || "123456";
  const hashedPassword = isBcryptHash(passwordValue) ? passwordValue : await bcrypt.hash(passwordValue, 10);
  const now = new Date();
  const addressSnapshot = buildAddressSnapshot(primaryAddress, customerRow);
  const nif = resolveClienteNif(email, customerRow, primaryAddress, nifOwnerCache);

  const existing = await prismaInstance.cliente.findUnique({
    where: { email },
    select: { id: true, nif: true },
  });

  const existingNifOwner = existing?.nif ? await prismaInstance.cliente.findUnique({ where: { nif: existing.nif }, select: { email: true } }) : null;
  const existingNifEmail = normalizeText(existingNifOwner?.email).toLowerCase();
  if (existing?.nif && existingNifEmail && existingNifEmail !== email.toLowerCase()) {
    nifOwnerCache.set(existing.nif, existingNifEmail);
  }

  const data = {
    nombre: pickText(customerRow, "firstname") || addressSnapshot.nombre,
    apellidos: pickText(customerRow, "lastname") || addressSnapshot.apellidos,
    email,
    password: hashedPassword,
    telefono: addressSnapshot.telefono || "000000000",
    empresa: pickText(customerRow, "company") || addressSnapshot.empresa,
    nif,
    direccion: addressSnapshot.direccion,
    direccionComplementaria: addressSnapshot.direccionComplementaria,
    codigoPostal: addressSnapshot.codigoPostal,
    ciudad: addressSnapshot.ciudad,
    provincia: addressSnapshot.provincia,
    pais: addressSnapshot.pais,
    activo: parseBool(customerRow.active, true),
    aceptaMarketing: parseBool(customerRow.optin || customerRow.newsletter, false),
    role: "cliente",
    updatedAt: now,
  };

  if (existing) {
    const updated = await prismaInstance.cliente.update({
      where: { email },
      data,
      select: { id: true, email: true },
    });
    nifOwnerCache.set(nif, email.toLowerCase());
    return { cliente: updated, created: false };
  }

  const created = await prismaInstance.cliente.create({
    data: {
      ...data,
      createdAt: now,
    },
    select: { id: true, email: true },
  });
  nifOwnerCache.set(nif, email.toLowerCase());
  return { cliente: created, created: true };
}

async function ensureAddress(customerId: number, customerRow: CsvRow, addressRow: CsvRow, isPrimary: boolean) {
  const alias = normalizeText(addressRow.alias) || (isPrimary ? "Principal" : "Mi dirección");
  const now = new Date();
  const snapshot = buildAddressSnapshot(addressRow, customerRow);
  const data = {
    clienteId: customerId,
    alias,
    nombre: snapshot.nombre,
    apellidos: snapshot.apellidos,
    empresa: snapshot.empresa,
    nif: snapshot.nif,
    telefono: snapshot.telefono,
    direccion: snapshot.direccion,
    complemento: snapshot.direccionComplementaria,
    codigoPostal: snapshot.codigoPostal,
    ciudad: snapshot.ciudad,
    provincia: snapshot.provincia,
    pais: snapshot.pais,
    predeterminada: isPrimary,
    updatedAt: now,
  };

  const existing = await prismaInstance.direccion.findFirst({
    where: {
      clienteId: customerId,
      alias,
      direccion: snapshot.direccion,
      codigoPostal: snapshot.codigoPostal,
      ciudad: snapshot.ciudad,
    },
    select: { id: true },
  });

  if (existing) {
    await prismaInstance.direccion.update({
      where: { id: existing.id },
      data,
    });
    return { created: false };
  }

  await prismaInstance.direccion.create({
    data: {
      ...data,
      createdAt: now,
    },
  });
  return { created: true };
}

function buildFallbackCustomerRow(
  customerId: number,
  orderRow: CsvRow,
  primaryAddress: CsvRow | null,
  invoiceAddress: CsvRow | null
) {
  const snapshot = buildAddressSnapshot(primaryAddress || invoiceAddress, null);
  const reference = normalizeText(orderRow.reference) || normalizeText(orderRow.id_order) || String(customerId);

  return {
    id_customer: String(customerId),
    email: `prestashop-cliente-${customerId}@import.local`,
    firstname: snapshot.nombre || `Cliente ${customerId}`,
    lastname: snapshot.apellidos || reference,
    passwd: `prestashop-missing-${customerId}`,
    company: snapshot.empresa || "",
    active: "1",
    optin: "0",
    newsletter: "0",
    vat_number: snapshot.nif || "",
    dni: snapshot.nif || "",
  };
}

function resolveOrderMoney(orderRow: CsvRow, detailRows: CsvRow[]) {
  const totalFinal = pickNumber(orderRow, "total_paid_tax_incl", "total_paid", "total", "total_paid_real");
  const subtotalFromOrder = pickNumber(orderRow, "total_paid_tax_excl", "total_products_wt", "total_products", "total_products_tax_excl");
  const shipping = pickNumber(orderRow, "total_shipping_tax_incl", "total_shipping", "shipping_cost", "shipping");
  const discount = pickNumber(orderRow, "total_discounts_tax_incl", "total_discounts", "discount", "reduction");
  const subtotalFromDetails = detailRows.reduce((sum, detailRow) => {
    const detailSubtotal = pickNumber(detailRow, "total_price_tax_excl", "total_price_tax_incl", "total_price", "subtotal");
    return sum + (Number.isFinite(detailSubtotal) ? detailSubtotal : 0);
  }, 0);

  const subtotal = Number.isFinite(subtotalFromOrder) && subtotalFromOrder > 0 ? subtotalFromOrder : subtotalFromDetails || totalFinal || 0;
  const total = Number.isFinite(totalFinal) && totalFinal > 0 ? totalFinal : roundMoney(subtotal + shipping - discount);

  return {
    subtotal: roundMoney(subtotal),
    totalFinal: roundMoney(total),
    envioCoste: roundMoney(Number.isFinite(shipping) ? shipping : 0),
    descuento: roundMoney(Number.isFinite(discount) ? discount : 0),
  };
}

function resolveInvoiceNumber(orderRow: CsvRow) {
  const invoiceNumber = normalizeText(orderRow.invoice_number);
  if (invoiceNumber && invoiceNumber !== "0") return invoiceNumber;
  return "";
}

function resolveStoredInvoiceNumber(orderRow: CsvRow, numeroPedido: string) {
  const invoiceNumber = resolveInvoiceNumber(orderRow);
  if (!invoiceNumber) return `PS-${numeroPedido}`;
  return `PS-${invoiceNumber}-${numeroPedido}`;
}

function resolveOrderNumber(orderRow: CsvRow) {
  return normalizeText(orderRow.reference) || `PS-${normalizeText(orderRow.id_order) || Date.now()}`;
}

function resolveShippingMethod(orderRow: CsvRow) {
  return pickText(orderRow, "carrier_name", "carrier", "shipping_method", "module") || "Prestashop";
}

function resolvePaymentMethod(orderRow: CsvRow) {
  return pickText(orderRow, "payment", "module") || "Prestashop";
}

function resolveTrackingNumber(orderRow: CsvRow) {
  return pickText(orderRow, "delivery_number", "tracking_number", "tracking") || "";
}

function buildOrderFromPrestashop(
  orderRow: CsvRow,
  customerId: number,
  customerRow: CsvRow,
  deliveryAddress: CsvRow | null,
  invoiceAddress: CsvRow | null,
  statusMeta: ReturnType<typeof mapPrestashopStatus>,
  money: ReturnType<typeof resolveOrderMoney>
) {
  const customerName = buildAddressSnapshot(deliveryAddress || invoiceAddress, customerRow);
  const billingAddress = buildAddressSnapshot(invoiceAddress || deliveryAddress, customerRow);
  const orderDate = parseDate(orderRow.date_add) || new Date();

  return {
    clienteId: customerId,
    nombre: customerName.nombre,
    apellidos: customerName.apellidos,
    email: normalizeText(customerRow.email),
    telefono: customerName.telefono,
    nif: customerName.nif || billingAddress.nif || null,
    direccion: customerName.direccion,
    ciudad: customerName.ciudad,
    provincia: customerName.provincia,
    cp: customerName.codigoPostal,
    pais: customerName.pais,
    envioMetodo: resolveShippingMethod(orderRow),
    envioCoste: money.envioCoste,
    pagoMetodo: resolvePaymentMethod(orderRow),
    pagoRecargo: 0,
    estadoPago: statusMeta.estadoPago,
    subtotal: money.subtotal,
    descuento: money.descuento,
    totalFinal: money.totalFinal,
    estado: statusMeta.estado,
    cuponCodigo: pickText(orderRow, "gift_message", "voucher") || null,
    notas: buildPrestashopOrderNote(orderRow, statusMeta.label, statusMeta.color),
    fechaPedido: orderDate,
    updatedAt: new Date(),
  };
}

function buildLivePedidoData(orderData: ReturnType<typeof buildOrderFromPrestashop>, numeroPedido: string, now: Date) {
  return {
    numeroPedido,
    clienteId: orderData.clienteId,
    nombre: fitText(orderData.nombre),
    apellidos: fitTextOrNull(orderData.apellidos),
    email: fitText(orderData.email),
    telefono: fitTextOrNull(orderData.telefono, 32),
    nif: fitTextOrNull(orderData.nif, 32),
    direccion: fitTextOrNull(orderData.direccion),
    ciudad: fitTextOrNull(orderData.ciudad),
    provincia: fitTextOrNull(orderData.provincia),
    cp: fitTextOrNull(orderData.cp, 32),
    pais: fitTextOrNull(orderData.pais, 64),
    envioMetodo: fitText(orderData.envioMetodo),
    envioCoste: orderData.envioCoste,
    pagoMetodo: fitText(orderData.pagoMetodo),
    pagoRecargo: orderData.pagoRecargo,
    estadoPago: orderData.estadoPago,
    subtotal: orderData.subtotal,
    descuento: orderData.descuento,
    totalFinal: orderData.totalFinal,
    estado: orderData.estado,
    cuponCodigo: fitTextOrNull(orderData.cuponCodigo, 64),
    cuponDescuento: null,
    notas: orderData.notas,
    fechaPedido: orderData.fechaPedido,
    updatedAt: now,
  };
}

async function ensureOrderAndInvoice(
  orderRow: CsvRow,
  customerId: number,
  customerRow: CsvRow,
  deliveryAddress: CsvRow | null,
  invoiceAddress: CsvRow | null,
  statusMeta: ReturnType<typeof mapPrestashopStatus>,
  money: ReturnType<typeof resolveOrderMoney>,
  detailRows: CsvRow[],
  includeDetails: boolean
) {
  const now = new Date();
  const numeroPedido = resolveOrderNumber(orderRow);
  const invoiceNumber = resolveInvoiceNumber(orderRow);
  const orderData = buildOrderFromPrestashop(orderRow, customerId, customerRow, deliveryAddress, invoiceAddress, statusMeta, money);
  const livePedidoData = buildLivePedidoData(orderData, numeroPedido, now);

  const result = await prismaInstance.$transaction(async (tx) => {
    const existingOrderRows = await tx.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM pedido
      WHERE numeroPedido = ${numeroPedido}
      LIMIT 1
    `;

    const orderCreated = existingOrderRows.length === 0;

    if (orderCreated) {
      await tx.$executeRaw`
        INSERT INTO pedido (
          numeroPedido,
          clienteId,
          nombre,
          apellidos,
          email,
          telefono,
          nif,
          direccion,
          ciudad,
          provincia,
          cp,
          pais,
          envioMetodo,
          envioCoste,
          pagoMetodo,
          pagoRecargo,
          estadoPago,
          subtotal,
          descuento,
          totalFinal,
          estado,
          cuponCodigo,
          cuponDescuento,
          notas,
          fechaPedido,
          updatedAt
        ) VALUES (
          ${livePedidoData.numeroPedido},
          ${livePedidoData.clienteId},
          ${livePedidoData.nombre},
          ${livePedidoData.apellidos},
          ${livePedidoData.email},
          ${livePedidoData.telefono},
          ${livePedidoData.nif},
          ${livePedidoData.direccion},
          ${livePedidoData.ciudad},
          ${livePedidoData.provincia},
          ${livePedidoData.cp},
          ${livePedidoData.pais},
          ${livePedidoData.envioMetodo},
          ${livePedidoData.envioCoste},
          ${livePedidoData.pagoMetodo},
          ${livePedidoData.pagoRecargo},
          ${livePedidoData.estadoPago},
          ${livePedidoData.subtotal},
          ${livePedidoData.descuento},
          ${livePedidoData.totalFinal},
          ${livePedidoData.estado},
          ${livePedidoData.cuponCodigo},
          ${livePedidoData.cuponDescuento},
          ${livePedidoData.notas},
          ${livePedidoData.fechaPedido},
          ${livePedidoData.updatedAt}
        )
      `;
    } else {
      await tx.$executeRaw`
        UPDATE pedido SET
          clienteId = ${livePedidoData.clienteId},
          nombre = ${livePedidoData.nombre},
          apellidos = ${livePedidoData.apellidos},
          email = ${livePedidoData.email},
          telefono = ${livePedidoData.telefono},
          nif = ${livePedidoData.nif},
          direccion = ${livePedidoData.direccion},
          ciudad = ${livePedidoData.ciudad},
          provincia = ${livePedidoData.provincia},
          cp = ${livePedidoData.cp},
          pais = ${livePedidoData.pais},
          envioMetodo = ${livePedidoData.envioMetodo},
          envioCoste = ${livePedidoData.envioCoste},
          pagoMetodo = ${livePedidoData.pagoMetodo},
          pagoRecargo = ${livePedidoData.pagoRecargo},
          estadoPago = ${livePedidoData.estadoPago},
          subtotal = ${livePedidoData.subtotal},
          descuento = ${livePedidoData.descuento},
          totalFinal = ${livePedidoData.totalFinal},
          estado = ${livePedidoData.estado},
          cuponCodigo = ${livePedidoData.cuponCodigo},
          cuponDescuento = ${livePedidoData.cuponDescuento},
          notas = ${livePedidoData.notas},
          fechaPedido = ${livePedidoData.fechaPedido},
          updatedAt = ${livePedidoData.updatedAt}
        WHERE id = ${existingOrderRows[0].id}
      `;
    }

    const savedOrderRows = await tx.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM pedido
      WHERE numeroPedido = ${numeroPedido}
      LIMIT 1
    `;
    const savedOrderId = savedOrderRows[0]?.id;

    if (!savedOrderId) {
      throw new Error(`No se pudo recuperar el pedido guardado ${numeroPedido}`);
    }

    const savedOrder = { id: savedOrderId };

    let invoiceOutcome: { created: boolean; updated: boolean } | null = null;
    if (invoiceNumber || parseDate(orderRow.invoice_date)) {
      const invoiceFecha = parseDate(orderRow.invoice_date) || parseDate(orderRow.date_add) || now;
      const existingInvoice = await tx.factura.findFirst({
        where: { pedidoId: savedOrder.id },
        select: { id: true },
      });

      const baseImponible = money.subtotal > 0 ? money.subtotal : roundMoney(money.totalFinal / 1.21);
      const totalIva = roundMoney(Math.max(money.totalFinal - baseImponible, 0));
      const porcentajeIva = baseImponible > 0 ? roundMoney((totalIva / baseImponible) * 100) : 21;
      const facturaData = {
        numeroFactura: resolveStoredInvoiceNumber(orderRow, numeroPedido),
        fechaFactura: invoiceFecha,
        baseImponible,
        porcentajeIva,
        totalIva,
        total: money.totalFinal,
        pdf_url: null,
        updatedAt: now,
      };

      if (existingInvoice) {
        await tx.factura.update({
          where: { id: existingInvoice.id },
          data: facturaData,
        });
        invoiceOutcome = { created: false, updated: true };
      } else {
        await tx.factura.create({
          data: {
            ...facturaData,
            pedidoId: savedOrder.id,
            createdAt: now,
          },
        });
        invoiceOutcome = { created: true, updated: false };
      }
    }

    if (includeDetails) {
      await tx.pedidoproducto.deleteMany({ where: { pedidoId: savedOrder.id } });

      for (const detailRow of detailRows) {
        const quantity = parseNumber(detailRow.product_quantity || detailRow.quantity || detailRow.qty, 1);
        const unitPrice = pickNumber(
          detailRow,
          "unit_price_tax_excl",
          "unit_price_tax_incl",
          "product_price",
          "price",
          "product_price_wt"
        );
        const lineSubtotalRaw = pickNumber(detailRow, "total_price_tax_excl", "total_price_tax_incl", "subtotal");
        const productReference = pickText(detailRow, "product_reference", "reference");
        const variantReference = pickText(detailRow, "product_attribute_reference", "product_attribute_name", "product_attribute_value");
        const productName = pickText(detailRow, "product_name", "name", "product") || productReference || "Producto Prestashop";

        let productoIdRef: number | null = null;
        let varianteIdRef: number | null = null;

        if (productReference) {
          const productMatch = await tx.producto.findFirst({
            where: { referencia: productReference },
            select: { id: true },
          });
          productoIdRef = productMatch?.id ?? null;
        }

        if (!productoIdRef && variantReference) {
          const variantMatch = await tx.variante.findFirst({
            where: { referencia: variantReference },
            select: { id: true, productoId: true },
          });
          varianteIdRef = variantMatch?.id ?? null;
          productoIdRef = variantMatch?.productoId ?? null;
        }

        if (productoIdRef && variantReference && !varianteIdRef) {
          const variantMatch = await tx.variante.findFirst({
            where: {
              productoId: productoIdRef,
              referencia: variantReference,
            },
            select: { id: true },
          });
          varianteIdRef = variantMatch?.id ?? null;
        }

        const precioUnitario = Number.isFinite(unitPrice) && unitPrice > 0
          ? roundMoney(unitPrice)
          : quantity > 0 && Number.isFinite(lineSubtotalRaw)
            ? roundMoney(lineSubtotalRaw / quantity)
            : 0;
        const subtotal = Number.isFinite(lineSubtotalRaw) && lineSubtotalRaw > 0
          ? roundMoney(lineSubtotalRaw)
          : roundMoney(precioUnitario * quantity);

        const existingLine = await tx.pedidoproducto.findFirst({
          where: {
            pedidoId: savedOrder.id,
            nombre: productName,
            cantidad: quantity,
            precioUnitario,
            subtotal,
          },
          select: { id: true },
        });

        const lineData = {
          pedidoId: savedOrder.id,
          productoIdRef,
          varianteIdRef,
          nombre: productName,
          varianteInfo: variantReference || null,
          cantidad: quantity,
          precioUnitario,
          subtotal,
        };

        if (existingLine) {
          await tx.pedidoproducto.update({
            where: { id: existingLine.id },
            data: lineData,
          });
        } else {
          await tx.pedidoproducto.create({ data: lineData });
        }
      }
    }

    return {
      orderId: savedOrder.id,
      orderCreated,
      invoiceOutcome,
    };
  });

  return {
    ...result,
    numeroPedido,
    invoiceNumber,
  };
}

function getArgValue(args: string[], name: string, fallback?: string) {
  const directIndex = args.indexOf(name);
  if (directIndex >= 0 && args[directIndex + 1] && !args[directIndex + 1].startsWith("--")) {
    return args[directIndex + 1];
  }

  const equalsPrefix = `${name}=`;
  const equalsArg = args.find((arg) => arg.startsWith(equalsPrefix));
  if (equalsArg) return equalsArg.slice(equalsPrefix.length);

  return fallback;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Importador de Prestashop\n\nUso:\n  npx tsx scripts/importar-pedidos-prestashop.ts --inputDir importacion/pedidos --since 2021-01-01\n\nArchivos esperados dentro de la carpeta:\n  ps_customer*.csv\n  ps_address*.csv\n  ps_orders*.csv\n  ps_order_state*.csv (opcional)\n  ps_order_state_lang*.csv (opcional)\n  ps_order_detail*.csv (opcional, recomendado para las líneas de pedido)\n\nOpciones:\n  --inputDir <ruta>      Carpeta donde están los CSV exportados\n  --since <fecha>        Importa solo pedidos con date_add a partir de esa fecha\n  --resumeAfter <valor>  Reanuda después del pedido indicado por referencia o id_order\n  --dry-run              No escribe en la base de datos\n  --help                 Muestra esta ayuda\n\nDurante la importación se muestra una barra de progreso con el pedido actual, el tiempo transcurrido y el tiempo sin avance.`);
    return;
  }

  const inputDirArg = getArgValue(args, "--inputDir", DEFAULT_INPUT_DIR) || DEFAULT_INPUT_DIR;
  const sinceArg = getArgValue(args, "--since", DEFAULT_SINCE) || DEFAULT_SINCE;
  const resumeAfterArg = getArgValue(args, "--resumeAfter");
  const dryRun = args.includes("--dry-run") || args.includes("--dryRun");
  const inputDir = path.isAbsolute(inputDirArg) ? inputDirArg : path.resolve(process.cwd(), inputDirArg);
  const sinceDate = parseDate(sinceArg);

  if (!sinceDate) {
    throw new Error(`La fecha --since no es válida: ${sinceArg}`);
  }

  const customerFile = await findCsvFile(inputDir, [/^ps_customer.*\.csv$/i]);
  const addressFile = await findCsvFile(inputDir, [/^ps_address.*\.csv$/i]);
  const orderFile = await findCsvFile(inputDir, [/^ps_orders.*\.csv$/i]);
  const detailFile = await findCsvFile(inputDir, [/^ps_order_detail.*\.csv$/i], false);
  const stateFile = await findCsvFile(inputDir, [/^ps_order_state.*\.csv$/i], false);
  const stateLangFile = await findCsvFile(inputDir, [/^ps_order_state_lang.*\.csv$/i], false);

  console.log(`Input dir: ${inputDir}`);
  console.log(`Clientes: ${path.basename(customerFile)}`);
  console.log(`Direcciones: ${path.basename(addressFile)}`);
  console.log(`Pedidos: ${path.basename(orderFile)}`);
  if (detailFile) console.log(`Detalles: ${path.basename(detailFile)}`);
  if (stateFile) console.log(`Estados: ${path.basename(stateFile)}`);
  if (stateLangFile) console.log(`Estados idioma: ${path.basename(stateLangFile)}`);
  console.log(`Desde: ${sinceArg}`);
  if (dryRun) console.log("Modo dry-run activado: no se escribirán datos en la base de datos.");

  const [customerRows, addressRows, orderRows, detailRows, stateRows, stateLangRows] = await Promise.all([
    readCsvRows(customerFile),
    readCsvRows(addressFile),
    readCsvRows(orderFile),
    detailFile ? readCsvRows(detailFile) : Promise.resolve<CsvRow[]>([]),
    stateFile ? readCsvRows(stateFile) : Promise.resolve<CsvRow[]>([]),
    stateLangFile ? readCsvRows(stateLangFile) : Promise.resolve<CsvRow[]>([]),
  ]);

  const stateMeta = stateRows.length && stateLangRows.length ? buildStateMeta(stateRows, stateLangRows) : new Map<number, PrestashopStateMeta>();
  const addressesByCustomerId = new Map<number, CsvRow[]>();
  const customerById = new Map<number, CsvRow>();
  const addressById = new Map<number, CsvRow>();

  for (const customerRow of customerRows) {
    const customerId = Number(normalizeText(customerRow.id_customer));
    if (!Number.isInteger(customerId)) continue;
    customerById.set(customerId, customerRow);
  }

  for (const addressRow of addressRows) {
    const customerId = Number(normalizeText(addressRow.id_customer));
    const addressId = Number(normalizeText(addressRow.id_address));
    if (Number.isInteger(addressId)) {
      addressById.set(addressId, addressRow);
    }
    if (!Number.isInteger(customerId) || customerId <= 0) continue;
    const list = addressesByCustomerId.get(customerId) || [];
    list.push(addressRow);
    addressesByCustomerId.set(customerId, list);
  }

  for (const list of addressesByCustomerId.values()) {
    list.sort((left, right) => {
      const leftDeleted = parseBool(left.deleted, false) ? 1 : 0;
      const rightDeleted = parseBool(right.deleted, false) ? 1 : 0;
      if (leftDeleted !== rightDeleted) return leftDeleted - rightDeleted;
      return Number(normalizeText(left.id_address)) - Number(normalizeText(right.id_address));
    });
  }

  const detailRowsByOrderId = new Map<number, CsvRow[]>();
  for (const detailRow of detailRows) {
    const orderId = Number(normalizeText(detailRow.id_order));
    if (!Number.isInteger(orderId)) continue;
    const list = detailRowsByOrderId.get(orderId) || [];
    list.push(detailRow);
    detailRowsByOrderId.set(orderId, list);
  }

  const summary: ImportSummary = {
    customersCreated: 0,
    customersUpdated: 0,
    addressesCreated: 0,
    addressesUpdated: 0,
    ordersCreated: 0,
    ordersUpdated: 0,
    invoicesCreated: 0,
    invoicesUpdated: 0,
    linesCreated: 0,
    linesUpdated: 0,
    skippedBeforeSince: 0,
  };

  const nifOwnerCache = new Map<string, string>();
  const customerIdToAppId = new Map<number, number>();
  const fallbackCustomerAddressesImported = new Set<number>();
  const progress = createProgressReporter(Boolean(process.stdout.isTTY));

  if (!dryRun) {
    const prismaModule = await import("../generated/prisma/client.ts");
    prismaInstance = new prismaModule.PrismaClient();
  }

  if (!dryRun) {
    progress.phase("Clientes", customerRows.length);
    for (let index = 0; index < customerRows.length; index += 1) {
      const customerRow = customerRows[index];
      const customerId = Number(normalizeText(customerRow.id_customer));
      const customerLabel = truncateProgressText(normalizeText(customerRow.email) || normalizeText(customerRow.id_customer) || `fila ${index + 1}`);
      progress.startItem(index + 1, customerLabel);

      if (!Number.isInteger(customerId) || customerId <= 0) {
        progress.completeItem();
        continue;
      }

      const customerAddresses = addressesByCustomerId.get(customerId) || [];
      const primaryAddress = customerAddresses.find((address) => !parseBool(address.deleted, false)) || customerAddresses[0] || null;
      const { cliente, created } = await ensureCustomer(customerRow, primaryAddress, nifOwnerCache);

      customerIdToAppId.set(customerId, cliente.id);
      if (created) summary.customersCreated += 1;
      else summary.customersUpdated += 1;

      progress.completeItem();
    }

    progress.finish(`Clientes procesados: ${summary.customersCreated + summary.customersUpdated} | creados: ${summary.customersCreated} | actualizados: ${summary.customersUpdated}`);

    progress.phase("Direcciones", addressRows.length);
    let addressProgressIndex = 0;
    for (const [customerId, addressList] of addressesByCustomerId.entries()) {
      const customerRow = customerById.get(customerId) || null;
      const appCustomerId = customerIdToAppId.get(customerId);
      if (!appCustomerId) {
        for (let index = 0; index < addressList.length; index += 1) {
          addressProgressIndex += 1;
          const addressRow = addressList[index];
          const addressLabel = truncateProgressText(`${customerId} / ${normalizeText(addressRow.alias) || (index === 0 ? "principal" : `direccion ${index + 1}`)}`);
          progress.startItem(addressProgressIndex, addressLabel);
          progress.completeItem();
        }
        continue;
      }

      for (let index = 0; index < addressList.length; index += 1) {
        addressProgressIndex += 1;
        const addressRow = addressList[index];
        const addressLabel = truncateProgressText(`${customerId} / ${normalizeText(addressRow.alias) || (index === 0 ? "principal" : `direccion ${index + 1}`)}`);
        progress.startItem(addressProgressIndex, addressLabel);
        const result = await ensureAddress(appCustomerId, customerRow || {}, addressRow, index === 0);
        if (result.created) summary.addressesCreated += 1;
        else summary.addressesUpdated += 1;
        progress.completeItem();
      }
    }

    progress.finish(`Direcciones procesadas: ${summary.addressesCreated + summary.addressesUpdated} | creadas: ${summary.addressesCreated} | actualizadas: ${summary.addressesUpdated}`);
  }

  let sortedOrders = orderRows
    .map((orderRow) => ({
      orderRow,
      orderId: Number(normalizeText(orderRow.id_order)),
      orderDate: parseDate(orderRow.date_add) || new Date(0),
    }))
    .filter(({ orderId }) => Number.isInteger(orderId) && orderId > 0)
    .filter(({ orderDate }) => orderDate >= sinceDate)
    .sort((left, right) => left.orderDate.getTime() - right.orderDate.getTime());

  if (resumeAfterArg) {
    const resumeMarker = normalizeText(resumeAfterArg).toLowerCase();
    const resumeIndex = sortedOrders.findIndex(({ orderRow, orderId }) => {
      const reference = normalizeText(orderRow.reference).toLowerCase();
      return reference === resumeMarker || String(orderId) === resumeMarker || `ps-${orderId}` === resumeMarker;
    });

    if (resumeIndex < 0) {
      throw new Error(`No se encontró el pedido indicado en --resumeAfter: ${resumeAfterArg}`);
    }

    const resumeSkipped = resumeIndex + 1;
    sortedOrders = sortedOrders.slice(resumeSkipped);
    console.log(`Reanudando después de ${resumeAfterArg}. Se omiten ${resumeSkipped} pedidos ya procesados.`);
  }

  summary.skippedBeforeSince = orderRows.length - sortedOrders.length;

  progress.phase(dryRun ? "Pedidos (dry-run)" : "Pedidos", sortedOrders.length);

  for (let index = 0; index < sortedOrders.length; index += 1) {
    const { orderRow, orderId } = sortedOrders[index];
    const orderReference = normalizeText(orderRow.reference) || `PS-${orderId}`;
    const orderLabel = truncateProgressText(`${orderReference} / ${normalizeText(orderRow.id_order) || orderId}`);
    progress.startItem(index + 1, orderLabel);

    try {
      const customerId = Number(normalizeText(orderRow.id_customer));
      const deliveryAddressId = Number(normalizeText(orderRow.id_address_delivery));
      const invoiceAddressId = Number(normalizeText(orderRow.id_address_invoice));
      const deliveryAddress = Number.isInteger(deliveryAddressId) ? addressById.get(deliveryAddressId) || null : null;
      const invoiceAddress = Number.isInteger(invoiceAddressId) ? addressById.get(invoiceAddressId) || deliveryAddress : deliveryAddress;
      const primaryAddress = deliveryAddress || invoiceAddress || (addressesByCustomerId.get(customerId) || [])[0] || null;
      const orderDetails = detailRowsByOrderId.get(orderId) || [];
      const money = resolveOrderMoney(orderRow, orderDetails);
      const statusMeta = mapPrestashopStatus(orderRow, stateMeta.get(Number(normalizeText(orderRow.current_state))));

      let customerRow = customerById.get(customerId) || null;
      const isFallbackCustomer = !customerRow;
      if (!customerRow) {
        customerRow = buildFallbackCustomerRow(customerId, orderRow, primaryAddress, invoiceAddress);
        customerById.set(customerId, customerRow);
      }

      if (!dryRun) {
        let appCustomerId = customerIdToAppId.get(customerId);
        if (!appCustomerId) {
          const { cliente, created } = await ensureCustomer(customerRow, primaryAddress, nifOwnerCache);
          appCustomerId = cliente.id;
          customerIdToAppId.set(customerId, appCustomerId);
          if (created) summary.customersCreated += 1;
          else summary.customersUpdated += 1;
        }

        if (isFallbackCustomer && !fallbackCustomerAddressesImported.has(customerId)) {
          const fallbackAddressRows = addressesByCustomerId.get(customerId) || [];
          for (let addressIndex = 0; addressIndex < fallbackAddressRows.length; addressIndex += 1) {
            const result = await ensureAddress(appCustomerId, customerRow, fallbackAddressRows[addressIndex], addressIndex === 0);
            if (result.created) summary.addressesCreated += 1;
            else summary.addressesUpdated += 1;
          }
          fallbackCustomerAddressesImported.add(customerId);
        }

        const result = await ensureOrderAndInvoice(
          orderRow,
          appCustomerId,
          customerRow,
          deliveryAddress,
          invoiceAddress,
          statusMeta,
          money,
          orderDetails,
          orderDetails.length > 0
        );

        if (result.orderCreated) summary.ordersCreated += 1;
        else summary.ordersUpdated += 1;

        if (result.invoiceOutcome?.created) summary.invoicesCreated += 1;
        if (result.invoiceOutcome?.updated) summary.invoicesUpdated += 1;

        if (orderDetails.length > 0) {
          summary.linesCreated += orderDetails.length;
        }

        if ((index + 1) % 500 === 0 || index + 1 === sortedOrders.length) {
          progress.note(
            `Pedidos procesados: ${index + 1}/${sortedOrders.length} | creados: ${summary.ordersCreated} | actualizados: ${summary.ordersUpdated} | facturas: ${summary.invoicesCreated + summary.invoicesUpdated}`
          );
        }
      } else {
        const orderData = buildOrderFromPrestashop(
          orderRow,
          customerIdToAppId.get(customerId) || 0,
          customerRow,
          deliveryAddress,
          invoiceAddress,
          statusMeta,
          money
        );

        if ((index + 1) % 500 === 0 || index + 1 === sortedOrders.length) {
          progress.note(
            `Dry-run ${index + 1}/${sortedOrders.length}: ${orderReference} | cliente ${orderData.email} | total ${orderData.totalFinal} | factura ${resolveStoredInvoiceNumber(orderRow, orderReference)} | lineas ${orderDetails.length}`
          );
        }
      }

      progress.completeItem();
    } catch (error: any) {
      progress.note(`Error procesando ${orderReference}: ${error?.message || error}`);
      throw error;
    }
  }

  progress.finish(`Pedidos procesados: ${sortedOrders.length} | creados: ${summary.ordersCreated} | actualizados: ${summary.ordersUpdated} | facturas creadas: ${summary.invoicesCreated} | facturas actualizadas: ${summary.invoicesUpdated}`);

  console.log("\nResumen:");
  console.log(`  Clientes creados: ${summary.customersCreated}`);
  console.log(`  Clientes actualizados: ${summary.customersUpdated}`);
  console.log(`  Direcciones creadas: ${summary.addressesCreated}`);
  console.log(`  Direcciones actualizadas: ${summary.addressesUpdated}`);
  console.log(`  Pedidos creados: ${summary.ordersCreated}`);
  console.log(`  Pedidos actualizados: ${summary.ordersUpdated}`);
  console.log(`  Facturas creadas: ${summary.invoicesCreated}`);
  console.log(`  Facturas actualizadas: ${summary.invoicesUpdated}`);
  console.log(`  Líneas de pedido creadas: ${summary.linesCreated}`);
  console.log(`  Líneas de pedido actualizadas: ${summary.linesUpdated}`);
  console.log(`  Pedidos anteriores a ${sinceArg}: ${summary.skippedBeforeSince}`);
}

main()
  .catch((error: any) => {
    console.error("\nError importando pedidos de Prestashop:");
    console.error(error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaInstance?.$disconnect) {
      await prismaInstance.$disconnect();
    }
  });
