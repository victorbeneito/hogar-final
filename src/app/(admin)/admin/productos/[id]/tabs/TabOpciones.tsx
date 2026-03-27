"use client";
import { useState } from "react";
import { X, Plus } from "lucide-react";

type Props = {
  data: Record<string, any>;
  onChange: (campo: string, valor: any) => void;
};

export default function TabOpciones({ data, onChange }: Props) {
  const [etiquetaInput, setEtiquetaInput] = useState("");

  const etiquetas: string[] = data.etiquetas ?? [];

  function addEtiqueta() {
    const val = etiquetaInput.trim();
    if (!val || etiquetas.includes(val)) return;
    onChange("etiquetas", [...etiquetas, val]);
    setEtiquetaInput("");
  }

  function removeEtiqueta(tag: string) {
    onChange("etiquetas", etiquetas.filter((e) => e !== tag));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Columna principal */}
      <div className="lg:col-span-2 flex flex-col gap-6">

        {/* Visibilidad y comportamiento */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Visibilidad y comportamiento</h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Visibilidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibilidad</label>
              <select
                value={data.visibilidad ?? "tienda"}
                onChange={(e) => onChange("visibilidad", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tienda">Tienda y búsqueda</option>
                <option value="busqueda">Solo búsqueda</option>
                <option value="oculto">Oculto</option>
              </select>
            </div>

            {/* Condición */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condición del producto</label>
              <select
                value={data.condicion ?? "nuevo"}
                onChange={(e) => onChange("condicion", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="nuevo">Nuevo</option>
                <option value="usado">Usado</option>
                <option value="reacondicionado">Reacondicionado</option>
              </select>
            </div>

            {/* Checkboxes de comportamiento */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {[
                { key: "mostrarCondicion",   label: "Mostrar condición en la ficha del producto" },
                { key: "disponiblePedidos",  label: "Disponible para pedidos (aunque sin stock)" },
                { key: "soloWeb",            label: "Disponible solo en web (no en tienda física)" },
              ].map((item) => (
                <label key={item.key} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data[item.key] ?? false}
                    onChange={(e) => onChange(item.key, e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Etiquetas */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Etiquetas</h3>
          </div>
          <div className="p-4">
            {/* Input para añadir */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={etiquetaInput}
                onChange={(e) => setEtiquetaInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEtiqueta())}
                placeholder="Escribe una etiqueta y pulsa Enter..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addEtiqueta}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={14} /> Añadir
              </button>
            </div>
            {/* Lista de etiquetas */}
            {etiquetas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {etiquetas.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeEtiqueta(tag)}
                      className="hover:text-red-500 transition"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin etiquetas. Las etiquetas ayudan en la búsqueda interna.</p>
            )}
          </div>
        </div>

        {/* Referencias / Códigos */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Referencias y códigos de barras</h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: "ean13", label: "EAN-13", placeholder: "1234567890123", maxLength: 13 },
              { key: "upc",   label: "UPC",    placeholder: "123456789012",  maxLength: 12 },
              { key: "isbn",  label: "ISBN",   placeholder: "978-3-16-148410-0", maxLength: 20 },
            ].map((campo) => (
              <div key={campo.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{campo.label}</label>
                <input
                  type="text"
                  value={data[campo.key] ?? ""}
                  onChange={(e) => onChange(campo.key, e.target.value || null)}
                  placeholder={campo.placeholder}
                  maxLength={campo.maxLength}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Columna lateral — resumen */}
      <div className="flex flex-col gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumen de opciones</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Visibilidad:</span>
              <span className={`font-medium capitalize ${
                data.visibilidad === "oculto" ? "text-red-600" :
                data.visibilidad === "busqueda" ? "text-yellow-600" : "text-green-600"
              }`}>
                {data.visibilidad === "tienda" ? "Tienda y búsqueda" :
                 data.visibilidad === "busqueda" ? "Solo búsqueda" : "Oculto"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Condición:</span>
              <span className="font-medium capitalize text-gray-700">{data.condicion ?? "nuevo"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pedidos sin stock:</span>
              <span className={`font-medium ${data.disponiblePedidos ? "text-green-600" : "text-red-600"}`}>
                {data.disponiblePedidos ? "Sí" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Solo web:</span>
              <span className={`font-medium ${data.soloWeb ? "text-blue-600" : "text-gray-500"}`}>
                {data.soloWeb ? "Sí" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Etiquetas:</span>
              <span className="font-medium text-gray-700">{etiquetas.length}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
