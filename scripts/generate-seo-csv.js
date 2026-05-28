#!/usr/bin/env node
// scripts/generate-seo-csv.js

const fs = require('fs');
const path = require('path');

function slugify(text) {
  return text.toString().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

const META = {
  liso: [
    "Estor liso de alta calidad con tejido translúcido u opaco. Colores modernos, medidas personalizadas y envío gratis. ¡Al mejor precio!",
    "Estor enrollable liso económico con diseño actual. Tejido traslúcido u opaco, medidas a tu medida y envío gratis en toda España.",
    "Estores lisos modernos al mejor precio. Múltiples colores, tejido translúcido u opaco, medidas personalizadas y envío gratuito.",
    "Estor liso noche y día económico con sistema de doble tejido. Diseño elegante, medidas a medida y envío gratis.",
    "Estor liso de calidad en tejido translúcido o tipo noche y día. Económico, a medida y envío gratuito en todos tus pedidos."
  ],
  infantil: [
    "Estor infantil con estampado digital divertido. Diseños coloridos para niños, medidas personalizadas, precio barato y envío gratis.",
    "Bonito estor infantil digital de alta calidad. Diseños temáticos para niños, económico, a medida y con envío gratuito.",
    "Estores digitales infantiles con diseños alegres y coloridos. A tu medida, precio económico y envío gratis. ¡Los niños los adorarán!",
    "Estor infantil con estampado digital exclusivo. Colores vivos para niños, medidas a medida, barato y envío gratuito.",
    "Decora la habitación infantil con estores digitales modernos. Diseños coloridos, económicos, a medida y con envío gratis."
  ],
  juvenil: [
    "Estor juvenil con estampado digital de diseños modernos. Deportes y aficiones favoritas, medidas personalizadas, precio barato y envío gratis.",
    "Estores digitales juveniles con temáticas modernas de deporte y moda. Económicos, a medida y envío gratuito. ¡Estilo garantizado!",
    "Estor juvenil con estampado digital moderno. Diseños de aficiones favoritas, precio barato, a medida y envío gratis.",
    "Decora tu habitación juvenil con estores digitales exclusivos. Diseños modernos, económicos, a medida y envío gratuito.",
    "Estor juvenil de diseño original con impresión digital. Deportes y aficiones en tu ventana, barato, a medida y envío gratis."
  ],
  ciudad: [
    "Estor con estampado digital de ciudades del mundo. Diseños modernos y exclusivos, medidas personalizadas, precio económico y envío gratis.",
    "Estores digitales con vistas de las ciudades más famosas del mundo. Diseño moderno, medidas a medida, precio barato y envío gratuito.",
    "Viaja con tu mirada con estores digitales de ciudades. Estampado de alta calidad, económico, a medida y envío gratis.",
    "Estor con impresión digital de ciudades únicas del mundo. Diseño moderno y colorido, medidas a medida, barato y envío gratuito.",
    "Estor digital de ciudades del mundo. Diseños exclusivos, precio económico, medidas personalizadas y envío gratuito."
  ],
  paisaje: [
    "Estor con estampado digital de paisajes naturales. Diseños relajantes, medidas personalizadas, precio económico y envío gratis.",
    "Estores digitales con impresionantes paisajes naturales. Relajantes y modernos, económicos, a medida y envío gratuito.",
    "Decora con belleza natural con estores digitales de paisajes. Diseños únicos, medidas personalizadas, barato y envío gratis.",
    "Estor con impresión digital de paisajes del mundo. Diseño relajante y exclusivo, económico, a medida y envío gratuito.",
    "Transforma tu hogar con estores de paisajes digitales. Diseños naturales modernos, precio económico, a medida y envío gratis."
  ],
  cocina: [
    "Estor con estampado digital para cocina. Diseños modernos gastronómicos, medidas personalizadas, precio económico y envío gratis.",
    "Estores digitales para cocina con diseños únicos y modernos. A tu medida, precio barato y envío gratuito en toda España.",
    "Dale estilo a tu cocina con estores digitales exclusivos. Diseños temáticos modernos, a medida, precio económico y envío gratis.",
    "Estor digital para cocina de alta calidad. Bonitos diseños gastronómicos exclusivos, económico, a medida y envío gratuito.",
    "Estores digitales para cocinas modernas y originales. Precio barato, medidas a medida, instalación fácil y envío gratis."
  ],
  zen: [
    "Estor con estampado digital de temática Zen. Diseños relajantes y modernos, medidas personalizadas, precio económico y envío gratis.",
    "Estores Zen digitales para crear ambientes de paz y tranquilidad. Diseños exclusivos, económicos, a medida y envío gratuito.",
    "Crea un ambiente zen con estores de impresión digital. Diseños relajantes, precio barato, medidas a medida y envío gratis.",
    "Estor digital Zen inspirado en la naturaleza y la paz. Diseño exclusivo, económico, a medida y envío gratuito.",
    "Transforma tu espacio con estores digitales Zen. Diseños inspiradores, precio económico, a medida y envío gratis."
  ],
  varios: [
    "Estor con estampado digital de diseños exclusivos y modernos. Precios baratos, medidas personalizadas y envío gratuito en España.",
    "Estores digitales con diseños abstractos y patrones únicos. Modernos y exclusivos, económicos, a medida y con envío gratuito.",
    "Estor con estampado digital de diseño exclusivo. Patrones únicos y modernos, precio económico, a medida y envío gratis.",
    "Dale un toque único con estores digitales de diseño exclusivo. Modernos y bonitos, precio barato, a medida y envío gratis.",
    "Estores digitales con diseños originales y modernos. Gran variedad de patrones, precio económico, a medida y envío gratuito."
  ],
  fantasia: [
    "Estor con estampado digital de fantasía y diseño moderno. Diseños únicos y coloridos, medidas a medida, precio barato y envío gratis.",
    "Estores digitales de fantasía con diseños únicos y creativos. Modernos, económicos, a medida y envío gratuito en toda España.",
    "Estor digital de fantasía con diseño creativo exclusivo. Patrones únicos y modernos, precio barato, a medida y envío gratuito.",
    "Estampados de fantasía en estores digitales. Diseños únicos y modernos, precio económico, medidas personalizadas y envío gratis.",
    "Estor con estampado digital de fantasía exclusivo. Diseños creativos y modernos, precio barato, a medida y envío gratuito."
  ]
};

function cleanMetaTitle(nombre) {
  let title = nombre
    .replace(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b/g, '')  // códigos con guiones: T2-I-60856
    .replace(/\b[A-Z]{2,}[0-9]+[A-Z0-9]*\b/g, '')        // códigos tipo HSCC7380
    .replace(/\bTejido\b/gi, '')                           // elimina "Tejido"
    .replace(/\bBasic\b/gi, '')                            // elimina "Basic"
    .replace(/\s+/g, ' ')
    .trim();
  if (title.length > 70)
    title = title.replace(/\bEnrollable\b/gi, '').replace(/\s+/g, ' ').trim();
  if (title.length > 70)
    title = title.replace(/\b(Traslúcido|Translúcido|Opaco)\b/gi, '').replace(/\s+/g, ' ').trim();
  return title;
}

function getCategory(categorias, categoria, nombre) {
  const t = ((categorias || '') + ' ' + (categoria || '') + ' ' + (nombre || '')).toLowerCase();
  if (t.includes('infantil')) return 'infantil';
  if (t.includes('juvenil')) return 'juvenil';
  if (t.includes('ciudad')) return 'ciudad';
  if (t.includes('paisaj')) return 'paisaje';
  if (t.includes('cocina')) return 'cocina';
  if (t.includes('zen')) return 'zen';
  if (t.includes('varios')) return 'varios';
  if (t.includes('fantasia') || t.includes('fantasía') || t.includes('estampados-f')) return 'fantasia';
  return 'liso';
}

function parseCSVLine(line) {
  const result = [];
  let curr = '', inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; }
    else if (c === ';' && !inQ) { result.push(curr); curr = ''; }
    else curr += c;
  }
  result.push(curr);
  return result;
}

function processFile(filePath, counters, outputLines) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  No encontrado: ${filePath}`);
    return 0;
  }
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = Object.fromEntries(headers.map((h, idx) => [h.trim(), (values[idx] || '').trim()]));
    const { referencia, nombre, categorias, categoria } = row;
    if (!referencia || !nombre) continue;
    const cat = getCategory(categorias, categoria, nombre);
    if (!counters[cat]) counters[cat] = 0;
    const metaDesc = META[cat][counters[cat] % META[cat].length];
    counters[cat]++;
    const originalNombre = nombre.trim();
    const metaTitle = cleanMetaTitle(nombre);
    const slug = `${referencia}-${slugify(nombre)}`;
    const esc = s => (s.includes(';') || s.includes('"')) ? `"${s.replace(/"/g, '""')}"` : s;
    outputLines.push(`upsert;${referencia};${esc(originalNombre)};${esc(metaTitle)};${esc(metaDesc)};${slug}`);
    count++;
  }
  console.log(`  ✓ ${path.basename(filePath)}: ${count} productos`);
  return count;
}

const root = path.resolve(__dirname, '..');
const importDir = path.join(root, 'importacion');
const files = [
  path.join(importDir, 'productos_estores_lisos.csv'),
  path.join(importDir, 'productos_estores_digitales.csv')
];

const outputLines = ['accion;referencia;nombre;metaTitulo;metaDescripcion;slug'];
const counters = {};
let total = 0;

console.log('Generando SEO CSV...');
for (const f of files) total += processFile(f, counters, outputLines);

const outPath = path.join(root, 'productos_seo_import.csv');
fs.writeFileSync(outPath, outputLines.join('\n'), 'utf-8');
console.log(`\n✅ SEO generado para ${total} productos → ${outPath}`);
console.log('\nDistribución por categoría:');
for (const [cat, n] of Object.entries(counters)) {
  console.log(`  ${cat}: ${n} productos`);
}
