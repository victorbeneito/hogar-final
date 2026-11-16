import { prisma } from "./prisma";

/**
 * Contabilidad de usos de cupones: `cupon.cantidadUsada` (límite total) y
 * `cupon_uso.veces` (límite por cliente).
 *
 * No se incrementan contadores: se RECALCULAN contando los pedidos que llevan el
 * cupón. Así da igual que una pasarela confirme el mismo pago dos veces (Redsys
 * manda la notificación y además el cliente vuelve por /redsys/ok), y un pedido
 * cancelado devuelve su uso solo con volver a recalcular.
 *
 * Qué pedido cuenta como uso:
 * - Tarjeta / PayPal: sólo cuando está PAGADO. Si contara al crearlo, el cliente
 *   que abandona la pasarela y lo reintenta se encontraría el cupón "ya usado".
 * - Transferencia / Bizum / contrareembolso: desde que el cliente confirma el
 *   pedido, aunque el cobro llegue después. Si esperásemos al cobro podría
 *   encadenar varios pedidos pendientes con el mismo cupón, y un contrareembolso
 *   no se cobra hasta la entrega.
 * - Nunca los cancelados, devueltos, fallidos o reembolsados.
 */

const PAGO_DIFERIDO = ["transferencia", "bizum", "contrareembolso"];
const CLAVES_ESTADO_ANULADO = ["CANCELADO", "DEVUELTO"];

/** `pedido.estado` puede guardar la clave o el nombre visible: hacen falta los dos. */
async function estadosAnulados(): Promise<string[]> {
  const estados = await prisma.estadopedido.findMany({
    where: { clave: { in: CLAVES_ESTADO_ANULADO } },
    select: { clave: true, nombre: true },
  });
  return [...new Set([...CLAVES_ESTADO_ANULADO, ...estados.flatMap((e) => [e.clave, e.nombre])])];
}

export async function recalcularUsoCupon(codigo: string | null | undefined) {
  const code = String(codigo ?? "").trim().toUpperCase();
  if (!code) return;

  const cupon = await prisma.cupon.findUnique({ where: { codigo: code }, select: { id: true } });
  // Códigos de pedidos importados de Prestashop que ya no existen como cupón
  if (!cupon) return;

  const usos = await prisma.pedido.groupBy({
    by: ["clienteId"],
    where: {
      cuponCodigo: code,
      estado: { notIn: await estadosAnulados() },
      OR: [
        { estadoPago: "PAGADO" },
        { estadoPago: "PENDIENTE", pagoMetodo: { in: PAGO_DIFERIDO } },
      ],
    },
    _count: { _all: true },
  });

  const total = usos.reduce((acc, u) => acc + u._count._all, 0);
  const ahora = new Date();

  await prisma.$transaction([
    prisma.cupon.update({ where: { id: cupon.id }, data: { cantidadUsada: total, updatedAt: ahora } }),
    // Clientes que ya no tienen ningún pedido válido con el cupón (cancelado)
    prisma.cupon_uso.updateMany({
      where: { cuponId: cupon.id, clienteId: { notIn: usos.map((u) => u.clienteId) } },
      data: { veces: 0, updatedAt: ahora },
    }),
    ...usos.map((u) =>
      prisma.cupon_uso.upsert({
        where: { cuponId_clienteId: { cuponId: cupon.id, clienteId: u.clienteId } },
        create: { cuponId: cupon.id, clienteId: u.clienteId, veces: u._count._all, updatedAt: ahora },
        update: { veces: u._count._all, updatedAt: ahora },
      })
    ),
  ]);
}

/** Atajo para los flujos que sólo tienen el id del pedido. No hace nada si no lleva cupón. */
export async function recalcularUsoCuponDePedido(pedidoId: number) {
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, select: { cuponCodigo: true } });
  if (pedido?.cuponCodigo) await recalcularUsoCupon(pedido.cuponCodigo);
}
