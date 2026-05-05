const naturalCollator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

export function ordenarValoresNaturales(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) =>
    naturalCollator.compare(a, b)
  );
}

type CalcularPrecioVarianteInput = {
  precioOriginal: number;
  precioDescuento?: number | null;
  precioExtra?: number | null;
};

export function calcularPrecioVariante({
  precioOriginal,
  precioDescuento,
  precioExtra,
}: CalcularPrecioVarianteInput) {
  const baseOriginal = Number(precioOriginal ?? 0);
  const extra = Number(precioExtra ?? 0);
  const precioOriginalConExtra = redondearPrecio(baseOriginal + extra);
  const precioOferta = precioDescuento != null ? Number(precioDescuento) : null;
  const tieneOferta =
    precioOferta !== null && Number.isFinite(precioOferta) && precioOferta < baseOriginal;
  const ratioDescuento = tieneOferta && baseOriginal > 0 ? precioOferta / baseOriginal : 1;
  const precioFinal = redondearPrecio(precioOriginalConExtra * ratioDescuento);

  return {
    tieneOferta,
    precioFinal,
    precioOriginalConExtra,
    precioOferta: tieneOferta ? redondearPrecio(precioOferta) : null,
  };
}

function redondearPrecio(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}