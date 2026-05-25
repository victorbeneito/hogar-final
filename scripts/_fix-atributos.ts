import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const p = new PrismaClient();

async function main() {
  // Buscar todos los atributovalor con URLs antiguas de elhogardetusuenos.com/img/co/
  const registros = await p.atributovalor.findMany({
    where: { imagen: { contains: "elhogardetusuenos.com/img/co/" } },
    select: { id: true, valor: true, imagen: true },
  });

  console.log(`Atributovalor con URLs antiguas: ${registros.length}`);
  registros.forEach(r => console.log(`  #${r.id} ${r.valor}: ${r.imagen}`));

  // Generar SQL para producción
  const lines = [
    "-- Migración URLs atributovalor: elhogardetusuenos.com/img/co/ → /img/co/",
    `-- Generado: ${new Date().toISOString()}`,
    "",
  ];

  for (const r of registros) {
    if (!r.imagen) continue;
    const nuevaUrl = r.imagen.replace(/https?:\/\/[^/]+\/img\/co\//, "/img/co/");
    // Actualizar BD local
    await p.atributovalor.update({ where: { id: r.id }, data: { imagen: nuevaUrl } });
    const escaped = nuevaUrl.replace(/'/g, "\\'");
    lines.push(`UPDATE atributovalor SET imagen='${escaped}' WHERE id=${r.id};`);
    console.log(`  → ${nuevaUrl}`);
  }

  const outFile = path.join(process.cwd(), "scripts", "migrar-atributos-produccion.sql");
  fs.writeFileSync(outFile, lines.join("\n"), "utf-8");
  console.log(`\nSQL generado: ${outFile}`);
}

main().catch(console.error).finally(() => p.$disconnect());
