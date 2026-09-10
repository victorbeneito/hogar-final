/**
 * Regulariza los pedidos que se cambiaron de estado en bloque con el endpoint
 * antiguo (`updateMany` a secas), que dejaba el proceso a medias: sin línea en
 * `historialestadopedido`, sin factura y sin invitación de reseña de Revi.
 *
 * La lógica vive en src/lib/regularizarPedidos.ts, compartida con la pantalla
 * /admin/facturas/regularizar. Este script solo sirve si tienes acceso directo
 * a la base de datos (local, o por túnel); en hosting gestionado usa la pantalla.
 *
 * Por defecto NO escribe nada: enseña lo que haría. Para aplicarlo, `--aplicar`.
 *
 *   npx tsx scripts/regularizar-pedidos-facturas.ts
 *   npx tsx scripts/regularizar-pedidos-facturas.ts --facturas --aplicar
 *
 * Opciones:
 *   --aplicar          escribe en la base de datos (sin esto, simulacro)
 *   --historial        solo reparar el historial de estados
 *   --facturas         solo emitir las facturas que falten
 *   --revi             solo enviar las invitaciones de reseña pendientes
 *   --desde=YYYY-MM-DD pedidos desde esa fecha (por defecto 2026-05-27, el corte
 *                      del archivo de Prestashop: lo anterior ya tiene su serie PS-)
 *   --hasta=YYYY-MM-DD pedidos hasta esa fecha
 */

import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { prisma } from "../src/lib/prisma";
import { regularizarPedidos } from "../src/lib/regularizarPedidos";

const args = process.argv.slice(2);
const aplicar = args.includes("--aplicar");
const seleccionados = ["--historial", "--facturas", "--revi"].filter((f) => args.includes(f));

// Sin selección explícita se ejecutan los tres pasos.
const pasos = {
  historial: seleccionados.length === 0 || args.includes("--historial"),
  facturas: seleccionados.length === 0 || args.includes("--facturas"),
  revi: seleccionados.length === 0 || args.includes("--revi"),
};

function argFecha(nombre: string): Date | undefined {
  const raw = args.find((a) => a.startsWith(`${nombre}=`))?.split("=")[1];
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error(`Fecha inválida en ${nombre}: ${raw}`);
  return d;
}

const fmt = (d: string | null | undefined) => (d ? d.slice(0, 10) : "—");
const eur = (n: number) => `${n.toFixed(2)} €`;

async function main() {
  console.log(
    aplicar
      ? "⚠️  MODO APLICAR — se escribirá en la base de datos"
      : "🔍 SIMULACRO — no se escribe nada (usa --aplicar)",
  );

  const r = await regularizarPedidos({
    aplicar,
    pasos,
    desde: argFecha("--desde"),
    hasta: argFecha("--hasta") ?? null,
  });

  console.log(`   Rango: ${fmt(r.desde)} → ${r.hasta ? fmt(r.hasta) : "hoy"}`);
  console.log(`   Pedidos en rango: ${r.totalPedidos}`);
  console.log(`   Serie: siguiente nº ${r.serie.siguienteNumero} · última factura ${fmt(r.serie.ultimaFecha)}\n`);

  if (pasos.historial) {
    console.log(`── 1. HISTORIAL DESFASADO: ${r.historial.length} pedido(s)`);
    for (const h of r.historial) {
      console.log(
        `   ${h.numeroPedido}  estado=${h.estado.padEnd(12)} último hito=${(h.ultimoHito ?? "(ninguno)").padEnd(16)} ${fmt(h.fechaUltimoHito)}${h.error ? `  ❌ ${h.error}` : ""}`,
      );
    }
    console.log("");
  }

  if (pasos.facturas) {
    console.log(`── 2. FACTURAS A EMITIR: ${r.facturas.length} pedido(s)`);
    if (r.facturas.length === 0 && r.sinEstadoFacturable > 0) {
      console.log(`   (Hay ${r.sinEstadoFacturable} pedido(s) sin factura cuyo estado no la emite.`);
      console.log(`    Marca "Emitir la factura al entrar en este estado" en /admin/configuracion/pedidos.)`);
    }
    for (const f of r.facturas) {
      const aviso = f.fechaDesplazada ? `  ⚠️ fecha desplazada (pedido ${fmt(f.fechaPedido)})` : "";
      const pago = f.estadoPago !== "PAGADO" ? `  ⚠️ pago ${f.estadoPago}` : "";
      console.log(
        `   ${f.numeroPedido}  ${fmt(f.fechaPedido)}  ${eur(f.total)}  → ${f.numeroFactura ?? "—"} (${fmt(f.fechaFactura)})${aviso}${pago}${f.error ? `  ❌ ${f.error}` : ""}`,
      );
    }
    console.log("");
  }

  if (pasos.revi) {
    console.log(`── 3. INVITACIONES REVI PENDIENTES: ${r.revi.length} pedido(s)`);
    for (const v of r.revi) {
      console.log(`   ${v.numeroPedido}  ${fmt(v.fechaPedido)}${v.error ? `  ❌ ${v.error}` : ""}`);
    }
    console.log("");
  }

  console.log(aplicar ? "Hecho." : "Simulacro terminado. Repite con --aplicar para escribir.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
