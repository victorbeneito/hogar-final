/**
 * Regulariza los pedidos que se cambiaron de estado en bloque con el endpoint
 * antiguo (`updateMany` a secas), que dejaba el proceso a medias:
 *
 *   1. historial   — el pedido cambió de estado pero no se escribió la línea en
 *                    `historialestadopedido`, así que la ficha sigue mostrando
 *                    el estado anterior aunque el listado muestre el nuevo.
 *   2. facturas    — nunca se emitió la factura del estado facturable. Se emiten
 *                    en orden cronológico de fecha de pedido para que número y
 *                    fecha queden correlativos.
 *   3. revi        — no se envió la invitación de reseña de los CUESTIONARIO.
 *
 * Por defecto NO escribe nada: enseña lo que haría. Para aplicarlo, `--aplicar`.
 *
 *   npx tsx scripts/regularizar-pedidos-facturas.ts
 *   npx tsx scripts/regularizar-pedidos-facturas.ts --facturas --aplicar
 *   npx tsx scripts/regularizar-pedidos-facturas.ts --historial --revi --aplicar
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
import {
  createFactura,
  getInvoiceSettings,
  resolverFechaFactura,
  ultimaFacturaSerie,
} from "../src/lib/invoiceGenerator";
import { buildInvoiceNumber } from "../src/lib/invoiceSettings";
import { enviarPedidoARevi, registrarHistorialEstado } from "../src/lib/orderStatusChange";
import { REVI_SYNC_CUTOFF_DATE } from "../src/lib/reviService";

const args = process.argv.slice(2);
const aplicar = args.includes("--aplicar");
const soloPedido = (flag: string) => args.includes(flag);

// Sin selección explícita se ejecutan los tres pasos.
const pasosPedidos = ["--historial", "--facturas", "--revi"].filter(soloPedido);
const hacer = {
  historial: pasosPedidos.length === 0 || soloPedido("--historial"),
  facturas: pasosPedidos.length === 0 || soloPedido("--facturas"),
  revi: pasosPedidos.length === 0 || soloPedido("--revi"),
};

function argFecha(nombre: string, porDefecto: Date | null): Date | null {
  const raw = args.find((a) => a.startsWith(`${nombre}=`))?.split("=")[1];
  if (!raw) return porDefecto;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error(`Fecha inválida en ${nombre}: ${raw}`);
  return d;
}

const desde = argFecha("--desde", REVI_SYNC_CUTOFF_DATE)!;
const hasta = argFecha("--hasta", null);

// Un pedido cancelado o devuelto no se factura por regularización.
const ESTADOS_NO_FACTURABLES = ["CANCELADO", "DEVUELTO"];

const fmt = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "—");
const eur = (n: number) => `${n.toFixed(2)} €`;

async function main() {
  console.log(aplicar ? "⚠️  MODO APLICAR — se escribirá en la base de datos" : "🔍 SIMULACRO — no se escribe nada (usa --aplicar)");
  console.log(`   Rango: ${fmt(desde)} → ${hasta ? fmt(hasta) : "hoy"}`);
  console.log(`   Pasos: ${Object.entries(hacer).filter(([, v]) => v).map(([k]) => k).join(", ")}\n`);

  const where = {
    fechaPedido: { gte: desde, ...(hasta ? { lte: hasta } : {}) },
  };

  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: [{ fechaPedido: "asc" }, { id: "asc" }],
    select: {
      id: true,
      numeroPedido: true,
      estado: true,
      totalFinal: true,
      fechaPedido: true,
      reviInvitadoAt: true,
      factura: { select: { numeroFactura: true, fechaFactura: true } },
      estadoHistorial: { select: { estado: true, fecha: true }, orderBy: { fecha: "desc" }, take: 1 },
    },
  });

  console.log(`Pedidos en rango: ${pedidos.length}\n`);

  const estados = await prisma.estadopedido.findMany({
    select: { clave: true, nombre: true, permitirFacturaPDF: true },
  });
  const porClave = new Map(estados.map((e) => [e.clave, e]));

  // ── 1. Historial de estados desfasado ──────────────────────────────────────
  if (hacer.historial) {
    const desfasados = pedidos.filter((p) => {
      const ultimo = p.estadoHistorial[0];
      const nombreEstado = porClave.get(p.estado)?.nombre ?? p.estado;
      // Sin historial ninguno, o el último hito no corresponde al estado actual.
      return !ultimo || (ultimo.estado !== nombreEstado && ultimo.estado !== p.estado);
    });

    console.log(`── 1. HISTORIAL DESFASADO: ${desfasados.length} pedido(s)`);
    for (const p of desfasados) {
      const ultimo = p.estadoHistorial[0];
      console.log(
        `   ${p.numeroPedido}  estado=${p.estado.padEnd(12)} último hito=${(ultimo?.estado ?? "(ninguno)").padEnd(16)} ${fmt(ultimo?.fecha)}`,
      );
      if (aplicar) {
        // Se fecha hoy: el cambio en bloque no dejó rastro de cuándo se hizo.
        await registrarHistorialEstado(p.id, p.estado);
      }
    }
    console.log("");
  }

  // ── 2. Facturas que faltan ────────────────────────────────────────────────
  if (hacer.facturas) {
    const pendientes = pedidos.filter(
      (p) =>
        !p.factura &&
        !ESTADOS_NO_FACTURABLES.includes(p.estado) &&
        porClave.get(p.estado)?.permitirFacturaPDF === true,
    );

    const sinFacturaNoFacturable = pedidos.filter(
      (p) => !p.factura && !pendientes.includes(p),
    );

    console.log(`── 2. FACTURAS A EMITIR: ${pendientes.length} pedido(s)`);
    if (pendientes.length === 0 && sinFacturaNoFacturable.length > 0) {
      console.log(
        `   (Hay ${sinFacturaNoFacturable.length} pedido(s) sin factura cuyo estado no la emite.`,
      );
      console.log(
        `    Marca "Emitir la factura al entrar en este estado" en /admin/configuracion/pedidos.)`,
      );
    }

    // El simulacro reproduce la numeración real: misma fecha de expedición y
    // misma secuencia que aplicaría `createFactura`, para poder revisarla antes.
    const settings = await getInvoiceSettings();
    const ultima = await ultimaFacturaSerie();
    let fechaSimulada = ultima?.fechaFactura ?? null;
    let secuenciaSimulada = settings.nextSequence;

    if (!aplicar && ultima) {
      console.log(`   Última factura de la serie: ${fmt(ultima.fechaFactura)} · siguiente nº ${secuenciaSimulada}`);
    }

    // En orden cronológico de pedido: así los números salen correlativos con las fechas.
    for (const p of pendientes) {
      if (!aplicar) {
        const fechaFactura = resolverFechaFactura(p.fechaPedido, fechaSimulada);
        if (
          settings.resetAnnually &&
          fechaSimulada &&
          fechaSimulada.getFullYear() < fechaFactura.getFullYear()
        ) {
          secuenciaSimulada = 1;
        }
        const numero = buildInvoiceNumber(settings, secuenciaSimulada, fechaFactura);
        const aviso =
          fechaFactura.toDateString() !== p.fechaPedido.toDateString()
            ? `  ⚠️ fecha desplazada (pedido ${fmt(p.fechaPedido)})`
            : "";
        console.log(
          `   ${p.numeroPedido}  ${fmt(p.fechaPedido)}  ${eur(Number(p.totalFinal))}  → ${numero} (${fmt(fechaFactura)})${aviso}`,
        );
        fechaSimulada = fechaFactura;
        secuenciaSimulada++;
        continue;
      }
      try {
        const r = await createFactura(p.id);
        console.log(
          `   ${p.numeroPedido}  ${fmt(p.fechaPedido)}  ${eur(Number(p.totalFinal))}  → ${r?.numeroFactura} (${fmt(r?.fechaFactura)})`,
        );
      } catch (err: any) {
        console.error(`   ❌ ${p.numeroPedido}: ${err?.message || err}`);
      }
    }
    console.log("");
  }

  // ── 3. Invitaciones de reseña pendientes ──────────────────────────────────
  if (hacer.revi) {
    const pendientesRevi = pedidos.filter(
      (p) => p.estado === "CUESTIONARIO" && !p.reviInvitadoAt && p.fechaPedido >= REVI_SYNC_CUTOFF_DATE,
    );

    console.log(`── 3. INVITACIONES REVI PENDIENTES: ${pendientesRevi.length} pedido(s)`);
    for (const p of pendientesRevi) {
      if (!aplicar) {
        console.log(`   ${p.numeroPedido}  ${fmt(p.fechaPedido)}`);
        continue;
      }
      try {
        await enviarPedidoARevi(p.id);
        console.log(`   ✅ ${p.numeroPedido}`);
      } catch (err: any) {
        console.error(`   ❌ ${p.numeroPedido}: ${err?.message || err}`);
      }
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
