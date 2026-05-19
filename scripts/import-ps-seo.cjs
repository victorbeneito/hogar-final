// scripts/import-ps-seo.cjs
// Importa metadatos SEO desde los CSV de PrestaShop y genera los mapas de redirección
// Uso: node scripts/import-ps-seo.cjs

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const CAT_CSV  = path.join(__dirname, '..', 'importacion', '_SELECT_c_id_category_cl_name_cl_description_cl_meta_title_cl_me_202605181857.csv');
const PROD_CSV = path.join(__dirname, '..', 'importacion', '_SELECT_p_id_product_pl_name_pl_meta_title_pl_meta_description_p_202605181858.csv');
const OUT_DIR  = path.join(__dirname, '..', 'src', 'data');

// ─── Parser CSV (soporta ; y , como separadores, campos entrecomillados) ───────

function parseLine(line, sep) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/\r/g, '');
  const lines = raw.split('\n').filter(l => l.trim());
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = parseLine(lines[0], sep).map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const values = parseLine(line, sep);
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').replace(/^"|"$/g, '').trim(); });
    return row;
  }).filter(row => Object.values(row).some(v => v));
}

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

// ─── Importar SEO de categorías ────────────────────────────────────────────────

async function importCategorias() {
  console.log('\n📂 Procesando categorías...');
  const rows = parseCSV(CAT_CSV);
  console.log(`   ${rows.length} filas leídas del CSV`);

  // Usando raw SQL para evitar discrepancias de schema del cliente generado
  const todasCategorias = await prisma.$queryRawUnsafe(
    'SELECT id, nombre, slug FROM categoria'
  );

  const psCatMap = {};
  let actualizadas = 0;
  let noEncontradas = 0;

  for (const row of rows) {
    const psId   = row.id_category;
    const nombre = row.name || '';
    const slug   = row.link_rewrite || '';
    const descripcion    = row.description || '';
    const metaTitulo     = row.meta_title || '';
    const metaDescripcion = row.meta_description || '';

    // Buscar en DB: primero por slug, luego por nombre normalizado
    let cat = todasCategorias.find(c => c.slug === slug);
    if (!cat) cat = todasCategorias.find(c => normalize(c.nombre) === normalize(nombre));

    if (!cat) { noEncontradas++; continue; }

    psCatMap[psId] = `/categorias/${cat.id}`;

    const tieneSeoDatos = metaTitulo || metaDescripcion || descripcion;
    if (!tieneSeoDatos) continue;

    // Construir SET dinámico
    const sets = [];
    const params = [];
    if (metaTitulo)     { sets.push('metaTitulo = ?');     params.push(metaTitulo.slice(0, 70)); }
    if (metaDescripcion){ sets.push('metaDescripcion = ?'); params.push(metaDescripcion); }
    if (descripcion)    { sets.push('descripcion = ?');     params.push(descripcion); }
    params.push(cat.id);

    await prisma.$executeRawUnsafe(
      `UPDATE categoria SET ${sets.join(', ')} WHERE id = ?`,
      ...params
    );
    actualizadas++;
    console.log(`   ✅ [PS:${psId}] ${nombre} → cat#${cat.id}`);
  }

  console.log(`\n   Categorías actualizadas: ${actualizadas}`);
  console.log(`   No encontradas en Next.js: ${noEncontradas}`);
  console.log(`   Mapeos PS→Next generados: ${Object.keys(psCatMap).length}`);
  return psCatMap;
}

// ─── Importar SEO de productos ─────────────────────────────────────────────────

async function importProductos() {
  console.log('\n📦 Procesando productos...');
  const rows = parseCSV(PROD_CSV);
  console.log(`   ${rows.length} filas leídas del CSV`);

  const psProductMap = {};
  let actualizados = 0;
  let noEncontrados = 0;
  let sinDatos = 0;

  for (const row of rows) {
    const psId = parseInt(row.id_product, 10);
    if (isNaN(psId)) continue;

    const metaTitulo      = row.meta_title || '';
    const metaDescripcion = row.meta_description || '';

    // Buscar mapeo en DB via raw SQL
    const mapeos = await prisma.$queryRawUnsafe(
      'SELECT m.productoId, p.slug, p.id FROM mapeo_producto_ps m LEFT JOIN producto p ON p.id = m.productoId WHERE m.idPrestashop = ?',
      psId
    );

    if (!mapeos.length || !mapeos[0].productoId) { noEncontrados++; continue; }

    const prod = mapeos[0];
    const nextPath = prod.slug ? `/productos/${prod.slug}` : `/productos/${prod.id}`;
    psProductMap[String(psId)] = nextPath;

    if (!metaTitulo && !metaDescripcion) { sinDatos++; continue; }

    const sets = [];
    const params = [];
    if (metaTitulo)      { sets.push('metaTitulo = ?');     params.push(metaTitulo.slice(0, 255)); }
    if (metaDescripcion) { sets.push('metaDescripcion = ?'); params.push(metaDescripcion); }
    params.push(prod.productoId);

    await prisma.$executeRawUnsafe(
      `UPDATE producto SET ${sets.join(', ')} WHERE id = ?`,
      ...params
    );
    actualizados++;
  }

  console.log(`\n   Productos actualizados con SEO: ${actualizados}`);
  console.log(`   Sin datos SEO en CSV: ${sinDatos}`);
  console.log(`   Sin mapeo en Next.js: ${noEncontrados}`);
  console.log(`   Mapeos PS→Next generados: ${Object.keys(psProductMap).length}`);
  return psProductMap;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando importación SEO desde PrestaShop...\n');
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const psCatMap     = await importCategorias();
  const psProductMap = await importProductos();

  fs.writeFileSync(path.join(OUT_DIR, 'ps-cat-map.json'),     JSON.stringify(psCatMap, null, 2),     'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, 'ps-product-map.json'), JSON.stringify(psProductMap, null, 2), 'utf-8');

  console.log('\n✅ Archivos generados:');
  console.log(`   src/data/ps-cat-map.json     → ${Object.keys(psCatMap).length} categorías`);
  console.log(`   src/data/ps-product-map.json → ${Object.keys(psProductMap).length} productos`);
  console.log('\n¡Listo! Reinicia el servidor Next.js para que el middleware cargue los mapas.\n');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
