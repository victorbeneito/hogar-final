import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import * as fs from "fs";
import * as path from "path";
import type { InvoiceSettingsConfig } from "./invoiceSettings";

// ── Types ────────────────────────────────────────────────────────────────────

export type InvoiceProduct = {
  referencia?: string | null;
  nombre: string;
  varianteInfo?: string | null;
  cantidad: number;
  precioUnitario: number; // WITH IVA
  subtotal: number;       // WITH IVA
};

export type InvoiceData = {
  numeroFactura: string;
  fechaFactura: Date | string;
  numeroPedido: string;
  fechaPedido: Date | string | null;
  // Delivery address
  entregaNombre: string;
  entregaNif?: string | null;
  entregaDireccion?: string | null;
  entregaCiudad?: string | null;
  entregaCp?: string | null;
  entregaProvincia?: string | null;
  entregaPais?: string | null;
  entregaTelefono?: string | null;
  // Billing address
  factNombre: string;
  factNif?: string | null;
  factDireccion?: string | null;
  factCiudad?: string | null;
  factCp?: string | null;
  factProvincia?: string | null;
  factPais?: string | null;
  factTelefono?: string | null;
  // Financials
  baseImponible: number;
  porcentajeIva: number;
  totalIva: number;
  total: number;
  subtotalProductos: number;
  envioCoste: number;
  descuento: number;
  // Payment & shipping
  pagoMetodo: string;
  transportista?: string | null;
  // Products
  productos: InvoiceProduct[];
};

// ── Styles ───────────────────────────────────────────────────────────────────

const BORDER = "#cccccc";
const BG_HEADER = "#f0f0f0";
const TEXT_DARK = "#222222";
const TEXT_GRAY = "#555555";
const ACCENT = "#3b6ea5";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: TEXT_DARK,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 35,
  },
  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  logo: { width: 130, height: 55, objectFit: "contain" },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: TEXT_DARK },
  headerDate: { fontSize: 9, color: TEXT_GRAY, marginTop: 2 },
  headerNumber: { fontSize: 9, color: TEXT_GRAY },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 10 },
  // ── Addresses ──
  addressRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  addressBlock: { flex: 1 },
  addressTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, marginBottom: 4 },
  addressLine: { fontSize: 8, color: TEXT_GRAY, lineHeight: 1.5 },
  // ── Info table ──
  infoTable: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  infoCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    padding: 5,
  },
  infoCellLast: { flex: 1, padding: 5 },
  infoCellLabel: { fontFamily: "Helvetica-Bold", fontSize: 7, marginBottom: 3, color: TEXT_DARK },
  infoCellValue: { fontSize: 7.5, color: TEXT_GRAY },
  // ── Products table ──
  table: { borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BG_HEADER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowLast: { flexDirection: "row" },
  thRef:     { width: "10%", padding: 4, fontFamily: "Helvetica-Bold", fontSize: 7 },
  thProduct: { flex: 1,      padding: 4, fontFamily: "Helvetica-Bold", fontSize: 7 },
  thTax:     { width: "9%",  padding: 4, fontFamily: "Helvetica-Bold", fontSize: 7, textAlign: "center" },
  thPrice:   { width: "16%", padding: 4, fontFamily: "Helvetica-Bold", fontSize: 7, textAlign: "right" },
  thQty:     { width: "7%",  padding: 4, fontFamily: "Helvetica-Bold", fontSize: 7, textAlign: "center" },
  thTotal:   { width: "16%", padding: 4, fontFamily: "Helvetica-Bold", fontSize: 7, textAlign: "right" },
  tdRef:     { width: "10%", padding: 4, fontSize: 7.5, color: TEXT_GRAY },
  tdProduct: { flex: 1,      padding: 4, fontSize: 7.5 },
  tdTax:     { width: "9%",  padding: 4, fontSize: 7.5, textAlign: "center", color: TEXT_GRAY },
  tdPrice:   { width: "16%", padding: 4, fontSize: 7.5, textAlign: "right" },
  tdQty:     { width: "7%",  padding: 4, fontSize: 7.5, textAlign: "center" },
  tdTotal:   { width: "16%", padding: 4, fontSize: 7.5, textAlign: "right" },
  // ── Bottom section ──
  bottomSection: { flexDirection: "row", gap: 12, marginBottom: 16 },
  bottomLeft: { flex: 1 },
  bottomRight: { width: 200 },
  // Tax breakdown
  taxTable: { borderWidth: 1, borderColor: BORDER, marginBottom: 8 },
  taxHeader: {
    flexDirection: "row",
    backgroundColor: BG_HEADER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  taxRow: { flexDirection: "row" },
  taxCellH: { flex: 1, padding: 3, fontFamily: "Helvetica-Bold", fontSize: 7 },
  taxCell:  { flex: 1, padding: 3, fontSize: 7.5, textAlign: "right" },
  taxCellL: { flex: 1, padding: 3, fontSize: 7.5 },
  // Payment/carrier mini table
  miniTable: { borderWidth: 1, borderColor: BORDER },
  miniRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    padding: 4,
    gap: 6,
  },
  miniRowLast: { flexDirection: "row", padding: 4, gap: 6 },
  miniLabel: { fontFamily: "Helvetica-Bold", fontSize: 7, width: 70 },
  miniValue: { flex: 1, fontSize: 7.5, color: TEXT_GRAY },
  // Totals
  totalsTable: { borderWidth: 1, borderColor: BORDER },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    padding: 4,
  },
  totalRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 4,
  },
  totalLabel: { fontSize: 7.5, color: TEXT_GRAY },
  totalValue: { fontSize: 7.5 },
  grandLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, color: TEXT_DARK },
  grandValue: { fontFamily: "Helvetica-Bold", fontSize: 9, color: TEXT_DARK },
  // ── Seller block ──
  sellerBlock: { marginTop: 8, marginBottom: 8 },
  sellerLine: { fontSize: 7.5, color: TEXT_GRAY, lineHeight: 1.5 },
  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 18,
    left: 35,
    right: 35,
    textAlign: "center",
    fontSize: 7,
    color: TEXT_GRAY,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",") + " €";
}

function fmtDate(d: Date | string | null) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function excl(price: number, pct: number) {
  return price / (1 + pct / 100);
}

function logoBase64(logoPath: string): string | undefined {
  try {
    const abs = path.join(process.cwd(), "public", logoPath.replace(/^\//, ""));
    if (fs.existsSync(abs)) {
      const buf = fs.readFileSync(abs);
      const ext = path.extname(abs).toLowerCase().replace(".", "");
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    }
  } catch {
    // logo not available, skip
  }
  return undefined;
}

// ── PDF Component ────────────────────────────────────────────────────────────

export function InvoicePdf({
  data,
  settings,
}: {
  data: InvoiceData;
  settings: InvoiceSettingsConfig;
}) {
  const iva = data.porcentajeIva;
  const logo = logoBase64(settings.seller.logoPath);

  const sellerLines = [
    settings.seller.nombre,
    settings.seller.nif ? `NIF/CIF: ${settings.seller.nif}` : null,
    settings.seller.direccion || null,
    [settings.seller.cp, settings.seller.ciudad, settings.seller.provincia]
      .filter(Boolean)
      .join(" - ") || null,
    settings.seller.telefono ? `Tel: ${settings.seller.telefono}` : null,
    settings.seller.email || null,
  ].filter(Boolean) as string[];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            {logo ? (
              <Image src={logo} style={styles.logo} />
            ) : (
              <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>
                {settings.seller.nombre}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{settings.template.headerTitle}</Text>
            <Text style={styles.headerDate}>{fmtDate(data.fechaFactura)}</Text>
            <Text style={styles.headerNumber}>{data.numeroFactura}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Addresses ── */}
        <View style={styles.addressRow}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressTitle}>Dirección de entrega</Text>
            <Text style={styles.addressLine}>{data.entregaNombre}</Text>
            {data.entregaNif ? <Text style={styles.addressLine}>{data.entregaNif}</Text> : null}
            {data.entregaDireccion ? <Text style={styles.addressLine}>{data.entregaDireccion}</Text> : null}
            {(data.entregaCp || data.entregaCiudad) ? (
              <Text style={styles.addressLine}>
                {[data.entregaCp, data.entregaCiudad].filter(Boolean).join(" ")}
              </Text>
            ) : null}
            {data.entregaPais ? <Text style={styles.addressLine}>{data.entregaPais}</Text> : null}
            {data.entregaProvincia ? <Text style={styles.addressLine}>{data.entregaProvincia}</Text> : null}
            {data.entregaTelefono ? <Text style={styles.addressLine}>{data.entregaTelefono}</Text> : null}
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressTitle}>Dirección de facturación</Text>
            <Text style={styles.addressLine}>{data.factNombre}</Text>
            {data.factNif ? <Text style={styles.addressLine}>{data.factNif}</Text> : null}
            {data.factDireccion ? <Text style={styles.addressLine}>{data.factDireccion}</Text> : null}
            {(data.factCp || data.factCiudad) ? (
              <Text style={styles.addressLine}>
                {[data.factCp, data.factCiudad].filter(Boolean).join(" ")}
              </Text>
            ) : null}
            {data.factPais ? <Text style={styles.addressLine}>{data.factPais}</Text> : null}
            {data.factProvincia ? <Text style={styles.addressLine}>{data.factProvincia}</Text> : null}
            {data.factTelefono ? <Text style={styles.addressLine}>{data.factTelefono}</Text> : null}
          </View>
        </View>

        {/* ── Info table ── */}
        <View style={styles.infoTable}>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>Número de factura</Text>
            <Text style={styles.infoCellValue}>{data.numeroFactura}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>Fecha de Factura</Text>
            <Text style={styles.infoCellValue}>{fmtDate(data.fechaFactura)}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>Referencia de pedido</Text>
            <Text style={styles.infoCellValue}>{data.numeroPedido}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoCellLabel}>Fecha de pedido</Text>
            <Text style={styles.infoCellValue}>{fmtDate(data.fechaPedido)}</Text>
          </View>
          <View style={styles.infoCellLast}>
            <Text style={styles.infoCellLabel}>Número de IVA</Text>
            <Text style={styles.infoCellValue}>{data.factNif || "-"}</Text>
          </View>
        </View>

        {/* ── Products table ── */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.thRef}>Referencia</Text>
            <Text style={styles.thProduct}>Producto</Text>
            <Text style={styles.thTax}>Tasa IVA</Text>
            <Text style={styles.thPrice}>Precio unit. (excl.)</Text>
            <Text style={styles.thQty}>Cant.</Text>
            <Text style={styles.thTotal}>Total (excl.)</Text>
          </View>
          {data.productos.map((p, i) => {
            const isLast = i === data.productos.length - 1;
            const rowStyle = isLast ? styles.tableRowLast : styles.tableRow;
            const unitExcl = excl(p.precioUnitario, iva);
            const totalExcl = excl(p.subtotal, iva);
            const productName = p.varianteInfo
              ? `${p.nombre} - ${p.varianteInfo}`
              : p.nombre;
            return (
              <View key={i} style={rowStyle}>
                <Text style={styles.tdRef}>{p.referencia || ""}</Text>
                <Text style={styles.tdProduct}>{productName}</Text>
                <Text style={styles.tdTax}>{iva} %</Text>
                <Text style={styles.tdPrice}>{fmt(unitExcl)}</Text>
                <Text style={styles.tdQty}>{p.cantidad}</Text>
                <Text style={styles.tdTotal}>{fmt(totalExcl)}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Bottom section ── */}
        <View style={styles.bottomSection}>
          {/* Left: tax breakdown + payment + carrier */}
          <View style={styles.bottomLeft}>
            {settings.showTaxBreakdown && (
              <View style={styles.taxTable}>
                <View style={styles.taxHeader}>
                  <Text style={styles.taxCellH}>Desglose impuestos</Text>
                  <Text style={styles.taxCellH}>Tasa</Text>
                  <Text style={styles.taxCellH}>Precio base</Text>
                  <Text style={styles.taxCellH}>Total impuesto</Text>
                </View>
                <View style={styles.taxRow}>
                  <Text style={styles.taxCellL}>Productos</Text>
                  <Text style={styles.taxCell}>{iva.toFixed(3)} %</Text>
                  <Text style={styles.taxCell}>{fmt(data.baseImponible)}</Text>
                  <Text style={styles.taxCell}>{fmt(data.totalIva)}</Text>
                </View>
              </View>
            )}
            <View style={styles.miniTable}>
              <View style={styles.miniRow}>
                <Text style={styles.miniLabel}>Método de pago</Text>
                <Text style={styles.miniValue}>{data.pagoMetodo}</Text>
              </View>
              <View style={styles.miniRowLast}>
                <Text style={styles.miniLabel}>Transportista</Text>
                <Text style={styles.miniValue}>{data.transportista || "—"}</Text>
              </View>
            </View>
          </View>

          {/* Right: totals */}
          <View style={styles.bottomRight}>
            <View style={styles.totalsTable}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Productos</Text>
                <Text style={styles.totalValue}>{fmt(excl(data.subtotalProductos, iva))}</Text>
              </View>
              {data.descuento > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Descuento</Text>
                  <Text style={styles.totalValue}>- {fmt(excl(data.descuento, iva))}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Gastos de envío</Text>
                <Text style={styles.totalValue}>
                  {data.envioCoste > 0 ? fmt(data.envioCoste) : "Envío gratis"}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total (Imp. excl.)</Text>
                <Text style={{ ...styles.totalValue, fontFamily: "Helvetica-Bold" }}>
                  {fmt(data.baseImponible)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total impuesto</Text>
                <Text style={{ ...styles.totalValue, fontFamily: "Helvetica-Bold" }}>
                  {fmt(data.totalIva)}
                </Text>
              </View>
              <View style={styles.totalRowLast}>
                <Text style={styles.grandLabel}>Total</Text>
                <Text style={styles.grandValue}>{fmt(data.total)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Seller info ── */}
        <View style={styles.sellerBlock}>
          {sellerLines.map((line, i) => (
            <Text key={i} style={styles.sellerLine}>{line}</Text>
          ))}
        </View>

        {/* ── Footer ── */}
        <Text style={styles.footer}>{settings.template.footerText}</Text>
      </Page>
    </Document>
  );
}
