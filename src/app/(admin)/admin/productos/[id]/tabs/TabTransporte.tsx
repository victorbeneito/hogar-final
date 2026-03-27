"use client";

type Props = {
  data: Record<string, any>;
  onChange: (campo: string, valor: any) => void;
};

export default function TabTransporte({ data, onChange }: Props) {
  const pesoKg = parseFloat(data.peso) || 0;
  const anchura = parseFloat(data.anchura) || 0;
  const altura = parseFloat(data.altura) || 0;
  const profundidad = parseFloat(data.profundidad) || 0;

  // Peso volumétrico estándar (divisor 5000 para cm³ → kg)
  const pesoVolumetrico = anchura && altura && profundidad
    ? ((anchura * altura * profundidad) / 5000).toFixed(2)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Columna principal */}
      <div className="lg:col-span-2 flex flex-col gap-6">

        {/* Dimensiones */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Dimensiones del paquete</h3>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: "anchura",    label: "Anchura",    unit: "cm" },
              { key: "altura",     label: "Altura",     unit: "cm" },
              { key: "profundidad",label: "Profundidad",unit: "cm" },
              { key: "peso",       label: "Peso",       unit: "kg" },
            ].map((campo) => (
              <div key={campo.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{campo.label}</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={data[campo.key] ?? ""}
                    onChange={(e) => onChange(campo.key, e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0"
                    className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    {campo.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plazos de entrega */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Plazos de entrega</h3>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Con stock disponible
              </label>
              <input
                type="text"
                value={data.plazoEntregaStock ?? ""}
                onChange={(e) => onChange("plazoEntregaStock", e.target.value || null)}
                placeholder="Ej: Entrega entre 3 y 5 días laborables"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Se muestra en la ficha del producto cuando hay stock.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Sin stock (bajo pedido)
              </label>
              <input
                type="text"
                value={data.plazoEntregaSinStock ?? ""}
                onChange={(e) => onChange("plazoEntregaSinStock", e.target.value || null)}
                placeholder="Ej: Entrega entre 7 y 10 días laborables"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Se muestra cuando el producto está agotado pero disponible para pedidos.
              </p>
            </div>
          </div>
        </div>

        {/* Gastos de envío extra */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Gastos de envío adicionales</h3>
          </div>
          <div className="p-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Recargo de envío para este producto
            </label>
            <div className="relative w-48">
              <input
                type="number"
                min={0}
                step={0.01}
                value={data.gastosEnvioExtra ?? 0}
                onChange={(e) => onChange("gastosEnvioExtra", parseFloat(e.target.value) || 0)}
                className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Se suma al coste de envío estándar. Útil para productos voluminosos o frágiles.
            </p>
          </div>
        </div>

      </div>

      {/* Columna lateral — resumen */}
      <div className="flex flex-col gap-4">

        {/* Resumen dimensiones */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumen de transporte</h3>
          <div className="flex flex-col gap-2 text-sm">

            {anchura && altura && profundidad ? (
              <div className="flex justify-between">
                <span className="text-gray-500">Dimensiones:</span>
                <span className="font-medium text-gray-700">
                  {anchura} × {altura} × {profundidad} cm
                </span>
              </div>
            ) : (
              <p className="text-gray-400 text-xs">Sin dimensiones definidas.</p>
            )}

            {pesoKg > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Peso real:</span>
                <span className="font-medium text-gray-700">{pesoKg} kg</span>
              </div>
            )}

            {pesoVolumetrico && (
              <div className="flex justify-between">
                <span className="text-gray-500">Peso volumétrico:</span>
                <span className="font-medium text-gray-700">{pesoVolumetrico} kg</span>
              </div>
            )}

            {pesoVolumetrico && pesoKg > 0 && (
              <>
                <hr className="border-gray-200 my-1" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Peso facturable:</span>
                  <span className="font-semibold text-blue-700">
                    {Math.max(pesoKg, parseFloat(pesoVolumetrico)).toFixed(2)} kg
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  El peso facturable es el mayor entre el peso real y el volumétrico.
                </p>
              </>
            )}

            {(data.gastosEnvioExtra ?? 0) > 0 && (
              <>
                <hr className="border-gray-200 my-1" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Recargo envío:</span>
                  <span className="font-medium text-orange-600">+{data.gastosEnvioExtra} €</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Plazos resumen */}
        {(data.plazoEntregaStock || data.plazoEntregaSinStock) && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-green-800 mb-2">Plazos configurados</h3>
            {data.plazoEntregaStock && (
              <div className="text-xs text-green-700 mb-1">
                <span className="font-medium">Con stock:</span> {data.plazoEntregaStock}
              </div>
            )}
            {data.plazoEntregaSinStock && (
              <div className="text-xs text-green-700">
                <span className="font-medium">Sin stock:</span> {data.plazoEntregaSinStock}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
