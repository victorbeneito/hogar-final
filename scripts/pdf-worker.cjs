'use strict';
// Standalone PDF generator — runs as a child process outside Next.js webpack
// Input:  JSON { data, settings } on stdin
// Output: PDF bytes on stdout
// Errors: message on stderr, exit code 1

const React = require('react');
const { renderToBuffer, Document, Page, Text, View, Image, StyleSheet } = require('@react-pdf/renderer');
const fs = require('fs');
const path = require('path');

const e = React.createElement;

// ── Colours ──────────────────────────────────────────────────────────────────
const BORDER    = '#cccccc';
const BG_HEADER = '#f0f0f0';
const TEXT_DARK = '#222222';
const TEXT_GRAY = '#555555';

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page:           { fontFamily: 'Helvetica', fontSize: 8, color: TEXT_DARK, paddingTop: 30, paddingBottom: 40, paddingHorizontal: 35 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  logo:           { width: 130, height: 55, objectFit: 'contain' },
  headerRight:    { alignItems: 'flex-end' },
  headerTitle:    { fontSize: 20, fontFamily: 'Helvetica-Bold', color: TEXT_DARK },
  headerDate:     { fontSize: 9, color: TEXT_GRAY, marginTop: 2 },
  headerNumber:   { fontSize: 9, color: TEXT_GRAY },
  divider:        { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 10 },
  addressRow:     { flexDirection: 'row', gap: 12, marginBottom: 12 },
  addressBlock:   { flex: 1 },
  addressTitle:   { fontFamily: 'Helvetica-Bold', fontSize: 8, marginBottom: 4 },
  addressLine:    { fontSize: 8, color: TEXT_GRAY, lineHeight: 1.5 },
  infoTable:      { flexDirection: 'row', borderWidth: 1, borderColor: BORDER, marginBottom: 12 },
  infoCell:       { flex: 1, borderRightWidth: 1, borderRightColor: BORDER, padding: 5 },
  infoCellLast:   { flex: 1, padding: 5 },
  infoCellLabel:  { fontFamily: 'Helvetica-Bold', fontSize: 7, marginBottom: 3, color: TEXT_DARK },
  infoCellValue:  { fontSize: 7.5, color: TEXT_GRAY },
  table:          { borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  tableHeader:    { flexDirection: 'row', backgroundColor: BG_HEADER, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRow:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowLast:   { flexDirection: 'row' },
  thRef:          { width: '10%', padding: 4, fontFamily: 'Helvetica-Bold', fontSize: 7 },
  thProduct:      { flex: 1,      padding: 4, fontFamily: 'Helvetica-Bold', fontSize: 7 },
  thTax:          { width: '9%',  padding: 4, fontFamily: 'Helvetica-Bold', fontSize: 7, textAlign: 'center' },
  thPrice:        { width: '16%', padding: 4, fontFamily: 'Helvetica-Bold', fontSize: 7, textAlign: 'right' },
  thQty:          { width: '7%',  padding: 4, fontFamily: 'Helvetica-Bold', fontSize: 7, textAlign: 'center' },
  thTotal:        { width: '16%', padding: 4, fontFamily: 'Helvetica-Bold', fontSize: 7, textAlign: 'right' },
  tdRef:          { width: '10%', padding: 4, fontSize: 7.5, color: TEXT_GRAY },
  tdProduct:      { flex: 1,      padding: 4, fontSize: 7.5 },
  tdTax:          { width: '9%',  padding: 4, fontSize: 7.5, textAlign: 'center', color: TEXT_GRAY },
  tdPrice:        { width: '16%', padding: 4, fontSize: 7.5, textAlign: 'right' },
  tdQty:          { width: '7%',  padding: 4, fontSize: 7.5, textAlign: 'center' },
  tdTotal:        { width: '16%', padding: 4, fontSize: 7.5, textAlign: 'right' },
  bottomSection:  { flexDirection: 'row', gap: 12, marginBottom: 16 },
  bottomLeft:     { flex: 1 },
  bottomRight:    { width: 200 },
  taxTable:       { borderWidth: 1, borderColor: BORDER, marginBottom: 8 },
  taxHeader:      { flexDirection: 'row', backgroundColor: BG_HEADER, borderBottomWidth: 1, borderBottomColor: BORDER },
  taxRow:         { flexDirection: 'row' },
  taxCellH:       { flex: 1, padding: 3, fontFamily: 'Helvetica-Bold', fontSize: 7 },
  taxCell:        { flex: 1, padding: 3, fontSize: 7.5, textAlign: 'right' },
  taxCellL:       { flex: 1, padding: 3, fontSize: 7.5 },
  miniTable:      { borderWidth: 1, borderColor: BORDER },
  miniRow:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, padding: 4, gap: 6 },
  miniRowLast:    { flexDirection: 'row', padding: 4, gap: 6 },
  miniLabel:      { fontFamily: 'Helvetica-Bold', fontSize: 7, width: 70 },
  miniValue:      { flex: 1, fontSize: 7.5, color: TEXT_GRAY },
  totalsTable:    { borderWidth: 1, borderColor: BORDER },
  totalRow:       { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: BORDER, padding: 4 },
  totalRowLast:   { flexDirection: 'row', justifyContent: 'space-between', padding: 4 },
  totalLabel:     { fontSize: 7.5, color: TEXT_GRAY },
  totalValue:     { fontSize: 7.5 },
  grandLabel:     { fontFamily: 'Helvetica-Bold', fontSize: 9, color: TEXT_DARK },
  grandValue:     { fontFamily: 'Helvetica-Bold', fontSize: 9, color: TEXT_DARK },
  sellerBlock:    { marginTop: 8, marginBottom: 8 },
  sellerLine:     { fontSize: 7.5, color: TEXT_GRAY, lineHeight: 1.5 },
  footer:         { position: 'absolute', bottom: 18, left: 35, right: 35, textAlign: 'center', fontSize: 7, color: TEXT_GRAY, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6 },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  return n.toFixed(2).replace('.', ',') + ' €';
}

function fmtDate(d) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function excl(price, pct) {
  return price / (1 + pct / 100);
}

function logoBase64(logoPath) {
  try {
    const abs = path.join(process.cwd(), 'public', logoPath.replace(/^\//, ''));
    if (fs.existsSync(abs)) {
      const buf = fs.readFileSync(abs);
      const ext = path.extname(abs).toLowerCase().replace('.', '');
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${buf.toString('base64')}`;
    }
  } catch (_) {}
  return undefined;
}

// ── Invoice element builder (pure React.createElement, no JSX) ────────────────
function buildInvoice(data, settings) {
  const iva = data.porcentajeIva;
  const logo = logoBase64(settings.seller.logoPath);

  const sellerLines = [
    settings.seller.nombre,
    settings.seller.nif ? `NIF/CIF: ${settings.seller.nif}` : null,
    settings.seller.direccion || null,
    [settings.seller.cp, settings.seller.ciudad, settings.seller.provincia].filter(Boolean).join(' - ') || null,
    settings.seller.telefono ? `Tel: ${settings.seller.telefono}` : null,
    settings.seller.email || null,
  ].filter(Boolean);

  // ── Address block helper ──
  function addressBlock(title, nombre, nif, dir, cp, ciudad, pais, provincia, tel) {
    return e(View, { style: styles.addressBlock },
      e(Text, { style: styles.addressTitle }, title),
      e(Text, { style: styles.addressLine }, nombre),
      nif       ? e(Text, { style: styles.addressLine }, nif)       : null,
      dir       ? e(Text, { style: styles.addressLine }, dir)       : null,
      (cp || ciudad) ? e(Text, { style: styles.addressLine }, [cp, ciudad].filter(Boolean).join(' ')) : null,
      pais      ? e(Text, { style: styles.addressLine }, pais)      : null,
      provincia ? e(Text, { style: styles.addressLine }, provincia) : null,
      tel       ? e(Text, { style: styles.addressLine }, tel)       : null,
    );
  }

  // ── Product rows ──
  const productRows = data.productos.map((p, i) => {
    const isLast = i === data.productos.length - 1;
    const unitExcl  = excl(p.precioUnitario, iva);
    const totalExcl = excl(p.subtotal, iva);
    const name = p.varianteInfo ? `${p.nombre} - ${p.varianteInfo}` : p.nombre;
    return e(View, { key: String(i), style: isLast ? styles.tableRowLast : styles.tableRow },
      e(Text, { style: styles.tdRef     }, p.referencia || ''),
      e(Text, { style: styles.tdProduct }, name),
      e(Text, { style: styles.tdTax     }, `${iva}%`),
      e(Text, { style: styles.tdPrice   }, fmt(unitExcl)),
      e(Text, { style: styles.tdQty     }, String(p.cantidad)),
      e(Text, { style: styles.tdTotal   }, fmt(totalExcl)),
    );
  });

  // ── Tax breakdown ──
  const taxSection = settings.showTaxBreakdown
    ? e(View, { style: styles.taxTable },
        e(View, { style: styles.taxHeader },
          e(Text, { style: styles.taxCellH }, 'Desglose impuestos'),
          e(Text, { style: styles.taxCellH }, 'Tasa'),
          e(Text, { style: styles.taxCellH }, 'Precio base'),
          e(Text, { style: styles.taxCellH }, 'Total impuesto'),
        ),
        e(View, { style: styles.taxRow },
          e(Text, { style: styles.taxCellL }, 'Productos'),
          e(Text, { style: styles.taxCell  }, `${iva}%`),
          e(Text, { style: styles.taxCell  }, fmt(data.baseImponible)),
          e(Text, { style: styles.taxCell  }, fmt(data.totalIva)),
        ),
      )
    : null;

  // ── Discount row (conditional) ──
  const discountRow = data.descuento > 0
    ? e(View, { style: styles.totalRow },
        e(Text, { style: styles.totalLabel }, 'Descuento'),
        e(Text, { style: styles.totalValue }, `- ${fmt(excl(data.descuento, iva))}`),
      )
    : null;

  return e(Document, null,
    e(Page, { size: 'A4', style: styles.page },
      // Header
      e(View, { style: styles.header },
        e(View, null,
          logo
            ? e(Image, { src: logo, style: styles.logo })
            : e(Text, { style: { fontSize: 14, fontFamily: 'Helvetica-Bold' } }, settings.seller.nombre),
        ),
        e(View, { style: styles.headerRight },
          e(Text, { style: styles.headerTitle  }, settings.template.headerTitle),
          e(Text, { style: styles.headerDate   }, fmtDate(data.fechaFactura)),
          e(Text, { style: styles.headerNumber }, data.numeroFactura),
        ),
      ),

      // Divider
      e(View, { style: styles.divider }),

      // Addresses
      e(View, { style: styles.addressRow },
        addressBlock('Dirección de entrega',
          data.entregaNombre, data.entregaNif, data.entregaDireccion,
          data.entregaCp, data.entregaCiudad, data.entregaPais,
          data.entregaProvincia, data.entregaTelefono,
        ),
        addressBlock('Dirección de facturación',
          data.factNombre, data.factNif, data.factDireccion,
          data.factCp, data.factCiudad, data.factPais,
          data.factProvincia, data.factTelefono,
        ),
      ),

      // Info table
      e(View, { style: styles.infoTable },
        e(View, { style: styles.infoCell },
          e(Text, { style: styles.infoCellLabel }, 'Número de factura'),
          e(Text, { style: styles.infoCellValue }, data.numeroFactura),
        ),
        e(View, { style: styles.infoCell },
          e(Text, { style: styles.infoCellLabel }, 'Fecha de Factura'),
          e(Text, { style: styles.infoCellValue }, fmtDate(data.fechaFactura)),
        ),
        e(View, { style: styles.infoCell },
          e(Text, { style: styles.infoCellLabel }, 'Referencia de pedido'),
          e(Text, { style: styles.infoCellValue }, data.numeroPedido),
        ),
        e(View, { style: styles.infoCell },
          e(Text, { style: styles.infoCellLabel }, 'Fecha de pedido'),
          e(Text, { style: styles.infoCellValue }, fmtDate(data.fechaPedido)),
        ),
        e(View, { style: styles.infoCellLast },
          e(Text, { style: styles.infoCellLabel }, 'Número de IVA'),
          e(Text, { style: styles.infoCellValue }, data.factNif || '-'),
        ),
      ),

      // Products table
      e(View, { style: styles.table },
        e(View, { style: styles.tableHeader },
          e(Text, { style: styles.thRef     }, 'Referencia'),
          e(Text, { style: styles.thProduct }, 'Producto'),
          e(Text, { style: styles.thTax     }, 'Tasa IVA'),
          e(Text, { style: styles.thPrice   }, 'Precio unit. (excl.)'),
          e(Text, { style: styles.thQty     }, 'Cant.'),
          e(Text, { style: styles.thTotal   }, 'Total (excl.)'),
        ),
        ...productRows,
      ),

      // Bottom section
      e(View, { style: styles.bottomSection },
        // Left: tax + payment + carrier
        e(View, { style: styles.bottomLeft },
          taxSection,
          e(View, { style: styles.miniTable },
            e(View, { style: styles.miniRow },
              e(Text, { style: styles.miniLabel }, 'Método de pago'),
              e(Text, { style: styles.miniValue }, data.pagoMetodo),
            ),
            e(View, { style: styles.miniRowLast },
              e(Text, { style: styles.miniLabel }, 'Transportista'),
              e(Text, { style: styles.miniValue }, data.transportista || '—'),
            ),
          ),
        ),
        // Right: totals
        e(View, { style: styles.bottomRight },
          e(View, { style: styles.totalsTable },
            e(View, { style: styles.totalRow },
              e(Text, { style: styles.totalLabel }, 'Total Productos'),
              e(Text, { style: styles.totalValue }, fmt(excl(data.subtotalProductos, iva))),
            ),
            discountRow,
            e(View, { style: styles.totalRow },
              e(Text, { style: styles.totalLabel }, 'Gastos de envío'),
              e(Text, { style: styles.totalValue }, data.envioCoste > 0 ? fmt(data.envioCoste) : 'Envío gratis'),
            ),
            e(View, { style: styles.totalRow },
              e(Text, { style: styles.totalLabel }, 'Total (Imp. excl.)'),
              e(Text, { style: { ...styles.totalValue, fontFamily: 'Helvetica-Bold' } }, fmt(data.baseImponible)),
            ),
            e(View, { style: styles.totalRow },
              e(Text, { style: styles.totalLabel }, 'Total impuesto'),
              e(Text, { style: { ...styles.totalValue, fontFamily: 'Helvetica-Bold' } }, fmt(data.totalIva)),
            ),
            e(View, { style: styles.totalRowLast },
              e(Text, { style: styles.grandLabel }, 'Total'),
              e(Text, { style: styles.grandValue }, fmt(data.total)),
            ),
          ),
        ),
      ),

      // Seller info
      e(View, { style: styles.sellerBlock },
        ...sellerLines.map((line, i) => e(Text, { key: String(i), style: styles.sellerLine }, line)),
      ),

      // Footer
      e(Text, { style: styles.footer }, settings.template.footerText),
    ),
  );
}

// ── Main: read stdin → generate PDF → write stdout ────────────────────────────
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', async () => {
  try {
    const { data, settings } = JSON.parse(inputData);
    const element = buildInvoice(data, settings);
    const buffer = await renderToBuffer(element);
    process.stdout.write(buffer);
    process.exit(0);
  } catch (err) {
    process.stderr.write((err && err.message ? err.message : String(err)) + '\n');
    if (err && err.stack) process.stderr.write(err.stack + '\n');
    process.exit(1);
  }
});
