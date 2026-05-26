"use client";
import { useEffect, useRef, useState } from "react";

type ReglaImpuesto = { id: number; nombre: string; porcentaje: number };

type Props = {
  data: any;
  onChange: (campo: string, valor: any) => void;
  reglasImpuesto: ReglaImpuesto[];
};

export default function TabPrecio({ data, onChange, reglasImpuesto }: Props) {
  const regla      = reglasImpuesto.find(r => r.id === Number(data.reglaImpuestoId));
  const porcentaje = regla?.porcentaje ?? 0;

  // ── Precio excl. (se guarda en BD) ───────────────────────────────
  const precioExcl = parseFloat(data.precio) || 0;
  const precioIncl = precioExcl * (1 + porcentaje / 100);

  // ── Precio oferta (se guarda en BD como excl.) ───────────────────
  const ofertaExcl   = data.precioOferta != null ? parseFloat(data.precioOferta) : null;
  const ofertaIncl   = ofertaExcl !== null ? ofertaExcl * (1 + porcentaje / 100) : null;
  const descuentoPct = ofertaExcl !== null && precioExcl > 0
    ? Math.round(((precioExcl - ofertaExcl) / precioExcl) * 100)
    : null;

  // Estado local del input de precio para evitar que se resetee mientras el usuario escribe
  const [precioInclText, setPrecioInclText] = useState(precioIncl > 0 ? precioIncl.toFixed(2) : "");
  const [ofertaInclText, setOfertaInclText] = useState(ofertaIncl != null && ofertaIncl > 0 ? ofertaIncl.toFixed(2) : "");
  const precioFocused = useRef(false);
  const ofertaFocused = useRef(false);

  // Sincronizar texto cuando cambia la regla de IVA (pero no mientras el usuario escribe)
  useEffect(() => {
    if (!precioFocused.current) {
      setPrecioInclText(precioIncl > 0 ? precioIncl.toFixed(2) : "");
    }
  }, [data.reglaImpuestoId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ofertaFocused.current) {
      setOfertaInclText(ofertaIncl != null && ofertaIncl > 0 ? ofertaIncl.toFixed(2) : "");
    }
  }, [data.reglaImpuestoId]); // eslint-disable-line react-hooks/exhaustive-deps

  function commitPrecioIncl(val: string) {
    if (val === "") { onChange("precio", 0); return; }
    const inclVal = parseFloat(val.replace(",", ".")) || 0;
    const exclVal = porcentaje > 0 ? inclVal / (1 + porcentaje / 100) : inclVal;
    onChange("precio", Math.round(exclVal * 1000000) / 1000000);
  }

  function commitOfertaIncl(val: string) {
    if (val === "") { onChange("precioOferta", null); return; }
    const inclVal = parseFloat(val.replace(",", ".")) || 0;
    const exclVal = porcentaje > 0 ? inclVal / (1 + porcentaje / 100) : inclVal;
    onChange("precioOferta", Math.round(exclVal * 1000000) / 1000000);
  }

  // Al editar el % de descuento → calcula precio oferta excl. y sincroniza el input de oferta
  function handleDescuentoPct(val: string) {
    if (val === "") { onChange("precioOferta", null); setOfertaInclText(""); return; }
    const pct = parseInt(val, 10);
    if (!isNaN(pct) && pct >= 0 && pct < 100) {
      const newExcl = Math.round(precioExcl * (1 - pct / 100) * 1000000) / 1000000;
      onChange("precioOferta", newExcl);
      const newIncl = newExcl * (1 + porcentaje / 100);
      setOfertaInclText(newIncl > 0 ? newIncl.toFixed(2) : "");
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Precio de venta ── */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">Precio de venta</h3>

        {/* FIX 2: aviso si no hay regla de impuesto seleccionada */}
        {!data.reglaImpuestoId && (
          <p className="mb-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ⚠️ Selecciona una regla de impuestos para que el precio con IVA se calcule correctamente.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Precio de venta (imp. incl.) {porcentaje > 0 ? `· ${porcentaje}% IVA` : ""}
            </label>
            <div className="flex">
              <input
                type="text" inputMode="decimal"
                value={precioInclText}
                placeholder="0.00"
                onFocus={() => { precioFocused.current = true; }}
                onBlur={() => {
                  precioFocused.current = false;
                  commitPrecioIncl(precioInclText);
                  // reformatear si es un número válido
                  const v = parseFloat(precioInclText.replace(",", "."));
                  if (!isNaN(v) && v > 0) setPrecioInclText(v.toFixed(2));
                }}
                onChange={e => setPrecioInclText(e.target.value)}
                className="w-full border border-gray-300 rounded-l px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-500">€</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Sin IVA: <strong>{precioExcl.toFixed(2)} €</strong>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            💡 Precio de venta final:
            <div className="mt-1 font-semibold">
              {precioIncl.toFixed(2)} € impuestos incl.
            </div>
            {porcentaje > 0 && (
              <div className="text-xs mt-1">
                {precioExcl.toFixed(2)} € impuestos excl.
              </div>
            )}
          </div>
        </div>

        {/* Regla de impuestos */}
        <div className="mt-4 max-w-sm">
          <label className="block text-xs text-gray-500 mb-1">Regla de impuestos</label>
          <select
            value={data.reglaImpuestoId ?? ""}
            onChange={e => onChange("reglaImpuestoId", e.target.value ? parseInt(e.target.value) : null)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Sin impuesto (0%)</option>
            {reglasImpuesto.map(r => (
              <option key={r.id} value={r.id}>{r.nombre} ({r.porcentaje}%)</option>
            ))}
          </select>
        </div>

        {/* Checkbox en oferta */}
        <label className="mt-3 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.enOferta}
            onChange={e => onChange("enOferta", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600">
            Mostrar indicador "¡En oferta!" en la página y listado de productos
          </span>
        </label>

        {/* Resumen */}
      </section>

      {/* ── Precio de coste ── */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">Precio de coste</h3>
        <div className="max-w-xs">
          <label className="block text-xs text-gray-500 mb-1">Precio (imp. excl.)</label>
          <div className="flex">
            <input
              type="number" step="0.000001" min="0"
              value={data.precioCoste ?? ""}
              onChange={e => onChange("precioCoste", e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0.000000"
              className="w-full border border-gray-300 rounded-l px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-500">€</span>
          </div>
          {data.precioCoste > 0 && precioExcl > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Margen bruto: {((precioExcl - data.precioCoste) / precioExcl * 100).toFixed(1)}%
              &nbsp;({(precioExcl - data.precioCoste).toFixed(2)} €)
            </p>
          )}
        </div>
      </section>

      {/* ── Stock ── */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">Stock</h3>
        {data.tieneVariantes ? (
          <p className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            ℹ️ Este producto tiene combinaciones. El stock se gestiona individualmente en la pestaña <strong>Combinaciones</strong>.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cantidad disponible</label>
                <input
                  type="number" step="1" min="0"
                  value={data.stock ?? 0}
                  onChange={e => onChange("stock", parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stock mínimo (alerta)</label>
                <input
                  type="number" step="1" min="0"
                  value={data.stockMinimo ?? 0}
                  onChange={e => onChange("stockMinimo", parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Alerta cuando el stock baje de este valor</p>
              </div>
            </div>
            {(data.stock ?? 0) === 0 && (
              <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                ⚠️ Stock en 0. Los clientes no podrán añadir este producto al carrito (salvo que &quot;Disponible para pedidos&quot; esté activo en la pestaña Opciones).
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Precio de oferta ── */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">Precio de oferta</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

          <div>
            <label className="block text-xs text-gray-500 mb-1">Precio oferta (imp. incl.)</label>
            <div className="flex">
              <input
                type="text" inputMode="decimal"
                value={ofertaInclText}
                placeholder="0.00"
                onFocus={() => { ofertaFocused.current = true; }}
                onBlur={() => {
                  ofertaFocused.current = false;
                  commitOfertaIncl(ofertaInclText);
                  const v = parseFloat(ofertaInclText.replace(",", "."));
                  if (!isNaN(v) && v > 0) setOfertaInclText(v.toFixed(2));
                  else if (ofertaInclText === "") setOfertaInclText("");
                }}
                onChange={e => setOfertaInclText(e.target.value)}
                className="w-full border border-gray-300 rounded-l px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-500">€</span>
            </div>
            {ofertaExcl !== null && (
              <p className="text-xs text-gray-400 mt-1">Sin IVA: {ofertaExcl.toFixed(2)} €</p>
            )}
          </div>

          {/* % descuento */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">O aplicar descuento (%)</label>
            <div className="flex">
              <input
                type="number" step="1" min="0" max="99"
                value={descuentoPct ?? ""}
                onChange={e => handleDescuentoPct(e.target.value)}
                placeholder="8"
                className="w-full border border-gray-300 rounded-l px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Calcula el precio oferta automáticamente</p>
          </div>

          {/* Resumen oferta */}
          {ofertaIncl !== null && ofertaIncl > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              💰 Precio oferta: <strong>{ofertaIncl.toFixed(2)} € incl. IVA</strong><br />
              <span className="text-xs">
                Descuento: {descuentoPct}% · Ahorro: {(precioIncl - ofertaIncl).toFixed(2)} €
              </span>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
