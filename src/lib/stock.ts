/**
 * Reglas de existencias.
 *
 * Los pedidos descuentan stock (ver src/app/api/pedidos/route.ts), pero no todo el
 * catálogo lleva existencias reales:
 *
 * - **Estores digitales** (458 productos activos): se fabrican bajo pedido, se
 *   imprimen tantos como haga falta. Su stock es un número decorativo. Si se
 *   descontara, acabaría en cero y la ficha empezaría a decir "Sin stock —
 *   reponiendo existencias" sobre algo que en realidad siempre está disponible.
 *
 * - **Estores lisos y textil de hogar** (28 productos activos): dependen del
 *   proveedor y su stock sí es real. Aquí el descuento importa.
 *
 * Un CSV del proveedor reescribe a diario el stock de los lisos (columna `stock`
 * de las variantes, ver /api/importaciones), así que cualquier desvío de una
 * jornada se corrige solo al día siguiente.
 */

/**
 * Categorías cuyos productos NO descuentan existencias.
 *
 * Sólo la 1, "Estores Digitales". Comprobado el 2026-08-11: los 457 productos de
 * las subcategorías temáticas (Ciudades, Paisajes, Infantiles, Cocina, Zen, Varios,
 * Estampados-Fantasía y Juveniles) pertenecen TAMBIÉN a la 1, así que con ella basta.
 * No hay ningún producto que esté a la vez en Digitales y en Lisos.
 *
 * Es una lista de exclusión y no de inclusión a propósito: si algún día se añade una
 * categoría nueva de producto físico, descontará stock sin que nadie tenga que
 * acordarse de darla de alta aquí. El fallo por olvido es visible (un digital que
 * baja de stock) en lugar de silencioso (un producto físico que se sobrevende).
 *
 * Si se reorganizan las categorías, hay que revisar este número.
 */
export const CATEGORIAS_SIN_CONTROL_DE_STOCK = [1];

/**
 * De una lista de ids de producto, devuelve los que NO deben descontar existencias.
 *
 * Recibe el cliente de Prisma (o el `tx` de una transacción) para poder usarse
 * dentro de la misma transacción que crea el pedido.
 */
export async function idsProductosSinControlDeStock(
  db: { productocategoria: { findMany: (args: any) => Promise<{ productoId: number }[]> } },
  productoIds: number[]
): Promise<Set<number>> {
  if (productoIds.length === 0 || CATEGORIAS_SIN_CONTROL_DE_STOCK.length === 0) {
    return new Set();
  }

  const filas = await db.productocategoria.findMany({
    where: {
      productoId: { in: productoIds },
      categoriaId: { in: CATEGORIAS_SIN_CONTROL_DE_STOCK },
    },
    select: { productoId: true },
  });

  return new Set(filas.map((f) => f.productoId));
}
