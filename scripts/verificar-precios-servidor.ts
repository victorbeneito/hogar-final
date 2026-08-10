import { prisma } from "../src/lib/prisma";
import { calcularPrecioVariante } from "../src/lib/productVariantPricing";
import { recalcularLineas, calcularTotalesPedido } from "../src/lib/checkoutPricing";

async function main() {
  // Producto con variantes que llevan precio_extra (el caso que más puede fallar)
  const p = await prisma.producto.findFirst({
    where: { activo: true, variante: { some: { precio_extra: { gt: 0 } } } },
    select: {
      id: true, nombre: true, precio: true, precioOferta: true,
      reglaimpuesto: { select: { porcentaje: true } },
      variante: { select: { id: true, tamano: true, color: true, tirador: true, precio_extra: true }, take: 3 },
    },
  });

  if (!p) {
    console.log("No hay productos con precio_extra > 0");
  } else {
    const v = p.variante[0];
    console.log(`\nProducto #${p.id} "${p.nombre}"`);
    console.log(`  precio BD (sin IVA): ${p.precio}   oferta: ${p.precioOferta}   IVA: ${p.reglaimpuesto?.porcentaje ?? 0}%`);
    console.log(`  variante: tamano=${v.tamano} color=${v.color} tirador=${v.tirador} extra=${v.precio_extra}`);

    // Lo que calcula el escaparate (ProductDetail via /productos/[id]/page.tsx)
    const factor = 1 + Number(p.reglaimpuesto?.porcentaje ?? 0) / 100;
    const esperado = calcularPrecioVariante({
      precioOriginal: Number(p.precio) * factor,
      precioDescuento: p.precioOferta != null ? Number(p.precioOferta) * factor : null,
      precioExtra: v.precio_extra ?? 0,
    }).precioFinal;

    // Lo que calcula el servidor a partir de un carrito manipulado
    const lineas = await recalcularLineas([
      {
        id: p.id,
        cantidad: 2,
        tamanoSeleccionado: v.tamano,
        colorSeleccionado: v.color,
        tiradorSeleccionado: v.tirador,
        nombre: "nombre falso",
      } as any,
    ]);

    console.log(`\n  escaparate  -> ${esperado.toFixed(2)} €/ud`);
    console.log(`  servidor    -> ${lineas[0].precioUnitario.toFixed(2)} €/ud  (x2 = ${lineas[0].subtotal.toFixed(2)} €)`);
    console.log(`  variante resuelta: ${lineas[0].varianteIdRef} (esperada ${v.id})`);
    console.log(`  nombre desde BD:   "${lineas[0].nombre}"`);
    console.log(lineas[0].precioUnitario === esperado ? "  ✅ COINCIDE" : "  ❌ NO COINCIDE");
  }

  // Simulación del ataque: carrito con precio y total falseados
  const barato = await prisma.producto.findFirst({
    where: { activo: true, precio: { gt: 0 } },
    select: { id: true, nombre: true },
  });

  if (!barato) return;

  const direccion = { pais: "España", provincia: "Valencia", codigoPostal: "46001", ciudad: "Valencia" };

  // Opciones reales de envío para esa dirección, para usar un id válido
  const { resolverEnvio } = await import("../src/lib/checkoutPricing");
  const envioValido = await resolverEnvio(100, direccion, "pickup").catch(() => null);
  console.log(`\nOpción de envío 'pickup' disponible: ${envioValido?.opcion?.label ?? "no"}`);

  const casos: Array<{ titulo: string; metodoEnvioId: string | null; cupon: string | null }> = [
    { titulo: "carrito con precio falseado a 0.01 €", metodoEnvioId: "pickup", cupon: null },
    { titulo: "sin id de envío (intento de saltarse los portes)", metodoEnvioId: null, cupon: null },
    { titulo: "id de envío inventado", metodoEnvioId: "envio-gratis-total", cupon: null },
    { titulo: "cupón inexistente", metodoEnvioId: "pickup", cupon: "CUPON-QUE-NO-EXISTE" },
  ];

  for (const caso of casos) {
    console.log(`\nATAQUE: ${caso.titulo}`);
    try {
      const t = await calcularTotalesPedido({
        items: [{ id: barato.id, cantidad: 1, precioFinal: 0.01, precio: 0.01 } as any],
        direccion,
        metodoEnvioId: caso.metodoEnvioId,
        metodoPago: "paypal",
        cuponCodigo: caso.cupon,
        clienteId: null,
      });
      console.log(`  subtotal: ${t.subtotal.toFixed(2)} € | envío: ${t.envioCoste.toFixed(2)} € (${t.envio?.label ?? "-"}) | dto: ${t.descuento.toFixed(2)} €`);
      console.log(`  TOTAL COBRADO: ${t.totalFinal.toFixed(2)} €`);
      if (t.avisos.length) console.log(`  avisos: ${t.avisos.join(" | ")}`);
    } catch (e: any) {
      console.log(`  ⛔ RECHAZADO: ${e.message}`);
    }
  }

  // --- CAMINO LEGÍTIMO: envío de pago + cupón real ---
  const opcionesReales = await resolverEnvio(50, direccion, "pickup");
  const cuponReal = await prisma.cupon.findFirst({ where: { activo: true } });
  console.log(`\n--- CAMINO LEGÍTIMO ---`);
  console.log(`Cupón en BD: ${cuponReal?.codigo ?? "(ninguno)"} ${cuponReal ? `(${cuponReal.tipoDescuento} ${cuponReal.valorDescuento}, mínimo ${cuponReal.pedidoMinimo} €)` : ""}`);

  // Buscar una opción de envío que cueste dinero
  const { calculateShippingResult, normalizeShippingConfig, createDefaultTransportConfig } = await import("../src/lib/transportes");
  const row = await prisma.configuracion.findUnique({ where: { clave: "transportes_configuracion" } });
  const cfg = normalizeShippingConfig(row?.valor ? JSON.parse(row.valor) : createDefaultTransportConfig());
  const todas = calculateShippingResult(cfg, 50, direccion).options;
  console.log(`Opciones de envío: ${todas.map((o) => `${o.id}=${o.coste}€`).join(", ")}`);

  const dePago = todas.find((o) => o.coste > 0) ?? todas[0];
  const t = await calcularTotalesPedido({
    items: [{ id: barato.id, cantidad: 1 } as any],
    direccion,
    metodoEnvioId: dePago.id,
    metodoPago: "contrareembolso",
    cuponCodigo: cuponReal?.codigo ?? null,
    clienteId: null,
  });
  console.log(`\nPedido real (envío "${dePago.label}", contrareembolso, cupón ${cuponReal?.codigo ?? "-"}):`);
  console.log(`  subtotal:  ${t.subtotal.toFixed(2)} €`);
  console.log(`  envío:     ${t.envioCoste.toFixed(2)} €`);
  console.log(`  descuento: ${t.descuento.toFixed(2)} €`);
  console.log(`  recargo:   ${t.recargoPago.toFixed(2)} €`);
  console.log(`  TOTAL:     ${t.totalFinal.toFixed(2)} €`);
  if (t.avisos.length) console.log(`  avisos: ${t.avisos.join(" | ")}`);

  await probarCuponValido(barato.id, direccion, dePago.id, t.subtotal);
}

/**
 * Crea un cupón temporal, comprueba que el descuento se aplica y lo borra.
 * Sólo se ejecuta contra una BD local: nunca debe tocar producción.
 */
async function probarCuponValido(
  productoId: number,
  direccion: any,
  envioId: string,
  subtotalEsperado: number
) {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.log("\n⏭️  Test de cupón válido omitido: DATABASE_URL no apunta a localhost.");
    return;
  }

  const codigo = `TEST-VERIF-${Date.now()}`;
  const ahora = new Date();
  await prisma.cupon.create({
    data: {
      codigo,
      descripcion: "Cupón temporal de verificación (se borra solo)",
      tipoDescuento: "PORCENTAJE",
      valorDescuento: 10,
      pedidoMinimo: 0,
      cantidadTotal: 100,
      cantidadUsada: 0,
      limitePorUsuario: 1,
      fechaInicio: new Date(ahora.getTime() - 86400000),
      fechaFin: new Date(ahora.getTime() + 86400000),
      activo: true,
      updatedAt: ahora,
    },
  });

  try {
    const t = await calcularTotalesPedido({
      items: [{ id: productoId, cantidad: 1 } as any],
      direccion,
      metodoEnvioId: envioId,
      metodoPago: "paypal",
      cuponCodigo: codigo,
      clienteId: null,
    });
    const esperado = Math.round(subtotalEsperado * 10) / 100; // 10 %
    console.log(`\n--- CUPÓN VÁLIDO (${codigo}, 10 %) ---`);
    console.log(`  subtotal:  ${t.subtotal.toFixed(2)} €`);
    console.log(`  descuento: ${t.descuento.toFixed(2)} €  (esperado ${esperado.toFixed(2)} €)`);
    console.log(`  TOTAL:     ${t.totalFinal.toFixed(2)} €`);
    console.log(
      Math.abs(t.descuento - esperado) < 0.01 && t.cupon?.codigo === codigo
        ? "  ✅ El descuento se aplica correctamente"
        : "  ❌ El descuento NO cuadra"
    );
  } finally {
    await prisma.cupon.delete({ where: { codigo } });
    console.log(`  (cupón temporal borrado)`);
  }
}

main()
  .catch((e) => { console.error("ERROR:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
