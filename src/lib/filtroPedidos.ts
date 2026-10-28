/**
 * Filtros del listado de pedidos del admin, compartidos por el listado
 * (/api/pedidos) y por la exportación con detalle de productos
 * (/api/admin/pedidos/lineas). Así lo que se exporta es exactamente lo que se
 * ve en pantalla con los mismos filtros.
 *
 * No incluye la restricción por cliente: eso depende de quién pregunta y lo
 * decide cada ruta.
 */

export const PRESTASHOP_IMPORT_MARKER = "[Importado de Prestashop]";

/** Inicio del día indicado (yyyy-mm-dd) en la hora del servidor. */
function inicioDelDia(fecha: string): Date {
  return new Date(`${fecha}T00:00:00`);
}

/**
 * Final del día indicado. Hasta el 2026-10-28 se usaba `new Date(fecha)`, que
 * es la medianoche del principio del día, y los pedidos del último día del
 * rango se quedaban fuera.
 */
function finDelDia(fecha: string): Date {
  return new Date(`${fecha}T23:59:59.999`);
}

export function construirFiltroPedidos(searchParams: URLSearchParams): any {
  const id = searchParams.get("id");
  const origen = searchParams.get("origen")?.trim();
  const referencia = searchParams.get("referencia")?.trim();
  const cliente = searchParams.get("cliente")?.trim();
  const estado = searchParams.get("estado")?.trim();
  const estadoPago = searchParams.get("estadoPago")?.trim();
  const fechaDesde = searchParams.get("fechaDesde");
  const fechaHasta = searchParams.get("fechaHasta");

  const whereClause: any = {};
  const appendAndFilter = (condition: any) => {
    whereClause.AND = [...(whereClause.AND || []), condition];
  };

  if (id && !Number.isNaN(parseInt(id, 10))) {
    whereClause.id = parseInt(id, 10);
  }
  if (estado) whereClause.estado = estado;
  if (estadoPago) whereClause.estadoPago = estadoPago;
  if (cliente) {
    whereClause.OR = [
      { nombre: { contains: cliente } },
      { apellidos: { contains: cliente } },
      { email: { contains: cliente } },
      { numeroPedido: { contains: cliente } },
      { transportistaNombre: { contains: cliente } },
    ];
  }
  if (referencia) {
    appendAndFilter({
      OR: [
        { numeroPedido: { contains: referencia } },
        { nombre: { contains: referencia } },
        { email: { contains: referencia } },
        { transportistaNombre: { contains: referencia } },
      ],
    });
  }
  if (fechaDesde || fechaHasta) {
    whereClause.fechaPedido = {};
    if (fechaDesde) whereClause.fechaPedido.gte = inicioDelDia(fechaDesde);
    if (fechaHasta) whereClause.fechaPedido.lte = finDelDia(fechaHasta);
  }

  if (origen === "prestashop") {
    appendAndFilter({ notas: { contains: PRESTASHOP_IMPORT_MARKER } });
  } else if (origen === "actuales") {
    appendAndFilter({
      OR: [
        { notas: null },
        { NOT: { notas: { contains: PRESTASHOP_IMPORT_MARKER } } },
      ],
    });
  }

  return whereClause;
}
