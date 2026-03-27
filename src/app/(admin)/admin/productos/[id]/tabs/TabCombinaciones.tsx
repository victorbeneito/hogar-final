"use client";
import { useState } from "react";
import { Plus, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";

type Variante = {
  id?: number;
  color?: string;
  imagenMuestra?: string;  // miniatura del tejido para el selector
  imagen?: string;         // imagen grande al seleccionar este color
  tamano?: string;
  tirador?: string;
  precio_extra?: number;
  stock?: number;
  referencia?: string;
};

type Props = {
  data: Record<string, any>;
  onChange: (campo: string, valor: any) => void;
};

const VARIANTE_VACIA: Variante = {
  color: "",
  imagenMuestra: "",
  imagen: "",
  tamano: "",
  tirador: "",
  precio_extra: 0,
  stock: 0,
  referencia: "",
};

export default function TabCombinaciones({ data, onChange }: Props) {
  const variantes: Variante[] = data.variantes ?? [];
  const [expandida, setExpandida] = useState<number | null>(null);

  function addVariante() {
    const nuevas = [...variantes, { ...VARIANTE_VACIA }];
    onChange("variantes", nuevas);
    setExpandida(nuevas.length - 1);
  }

  function removeVariante(idx: number) {
    const nuevas = variantes.filter((_, i) => i !== idx);
    onChange("variantes", nuevas);
    if (expandida === idx) setExpandida(null);
  }

  function updateVariante(idx: number, campo: keyof Variante, valor: any) {
    const nuevas = variantes.map((v, i) => i === idx ? { ...v, [campo]: valor } : v);
    onChange("variantes", nuevas);
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Explicación */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">¿Cómo funcionan las combinaciones?</p>
        <ul className="list-disc list-inside flex flex-col gap-1 text-blue-700">
          <li>Cada variante tiene una <strong>imagen muestra</strong> (miniatura del tejido) que aparece en el selector de color.</li>
          <li>Al pulsar una muestra, la imagen principal del producto cambia a la <strong>imagen del producto</strong> de esa variante.</li>
          <li>Si una variante no tiene imagen propia, se mostrará la imagen de portada del producto.</li>
        </ul>
      </div>

      {/* Toggle variantes */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.tieneVariantes ?? false}
          onChange={(e) => onChange("tieneVariantes", e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700">
          Este producto tiene variantes (color, talla, tirador...)
        </span>
      </label>

      {data.tieneVariantes && (
        <>
          {/* Lista de variantes */}
          <div className="flex flex-col gap-3">
            {variantes.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                Sin variantes. Pulsa "Añadir variante" para empezar.
              </p>
            )}

            {variantes.map((v, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-white">

                {/* Cabecera siempre visible */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandida(expandida === idx ? null : idx)}
                >
                  <GripVertical size={16} className="text-gray-300 flex-shrink-0" />

                  {/* Muestra del tejido */}
                  {v.imagenMuestra ? (
                    <img
                      src={v.imagenMuestra}
                      alt=""
                      className="w-8 h-8 rounded object-cover border border-gray-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded border-2 border-dashed border-gray-200 flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={14} className="text-gray-300" />
                    </div>
                  )}

                  {/* Imagen del producto con este color */}
                  {v.imagen ? (
                    <img
                      src={v.imagen}
                      alt=""
                      className="w-8 h-8 rounded object-cover border border-gray-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded border-2 border-dashed border-gray-100 flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={14} className="text-gray-200" />
                    </div>
                  )}

                  {/* Info resumen */}
                  <div className="flex-1 flex items-center gap-3 text-sm min-w-0">
                    <span className="font-medium text-gray-700 truncate">
                      {v.color || <span className="text-gray-400">Sin nombre</span>}
                    </span>
                    {v.tamano && (
                      <span className="text-gray-400 hidden sm:inline">· Talla: {v.tamano}</span>
                    )}
                    {v.tirador && (
                      <span className="text-gray-400 hidden sm:inline">· Tirador: {v.tirador}</span>
                    )}
                    {v.precio_extra !== undefined && v.precio_extra > 0 && (
                      <span className="text-green-600 hidden sm:inline">+{v.precio_extra} €</span>
                    )}
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      (v.stock ?? 0) <= 0
                        ? "bg-red-100 text-red-600"
                        : (v.stock ?? 0) <= 5
                        ? "bg-orange-100 text-orange-600"
                        : "bg-green-100 text-green-600"
                    }`}>
                      Stock: {v.stock ?? 0}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeVariante(idx); }}
                    className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Detalle expandible */}
                {expandida === idx && (
                  <div className="border-t border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50">

                    {/* Nombre del color */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Nombre del color
                      </label>
                      <input
                        type="text"
                        value={v.color ?? ""}
                        onChange={(e) => updateVariante(idx, "color", e.target.value)}
                        placeholder="Ej: Clear 100-Blanco óptico"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    {/* Imagen muestra */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Imagen muestra
                        <span className="ml-1 text-gray-400 font-normal">(miniatura en el selector)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={v.imagenMuestra ?? ""}
                          onChange={(e) => updateVariante(idx, "imagenMuestra", e.target.value)}
                          placeholder="URL de la muestra del tejido..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        {v.imagenMuestra && (
                          <img
                            src={v.imagenMuestra}
                            alt=""
                            className="w-10 h-10 rounded object-cover border border-gray-200 flex-shrink-0"
                          />
                        )}
                      </div>
                    </div>

                    {/* Imagen del producto */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Imagen del producto
                        <span className="ml-1 text-gray-400 font-normal">(imagen grande al seleccionar)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={v.imagen ?? ""}
                          onChange={(e) => updateVariante(idx, "imagen", e.target.value)}
                          placeholder="URL de la foto con este color..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        {v.imagen && (
                          <img
                            src={v.imagen}
                            alt=""
                            className="w-10 h-10 rounded object-cover border border-gray-200 flex-shrink-0"
                          />
                        )}
                      </div>
                    </div>

                    {/* Talla */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Talla / Medida</label>
                      <input
                        type="text"
                        value={v.tamano ?? ""}
                        onChange={(e) => updateVariante(idx, "tamano", e.target.value)}
                        placeholder="Ej: 90x200, L, XL..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    {/* Tirador */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tirador</label>
                      <input
                        type="text"
                        value={v.tirador ?? ""}
                        onChange={(e) => updateVariante(idx, "tirador", e.target.value)}
                        placeholder="Ej: Derecha, Izquierda, Sin tirador..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    {/* Referencia */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Referencia</label>
                      <input
                        type="text"
                        value={v.referencia ?? ""}
                        onChange={(e) => updateVariante(idx, "referencia", e.target.value)}
                        placeholder="Ej: HSCI97011-GRS"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    {/* Precio extra */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Precio extra</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={v.precio_extra === 0 ? "" : v.precio_extra}
                          placeholder="0.00"
                          onChange={(e) => updateVariante(idx, "precio_extra", parseFloat(e.target.value) || 0)}
                          className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                      </div>
                    </div>

                    {/* Stock */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
                      <input
                        type="number"
                        min={0}
                        value={v.stock ?? 0}
                        onChange={(e) => updateVariante(idx, "stock", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Botón añadir */}
          <button
            type="button"
            onClick={addVariante}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-blue-300 text-blue-600 text-sm font-medium rounded-xl hover:border-blue-500 hover:bg-blue-50 transition w-full justify-center"
          >
            <Plus size={16} /> Añadir variante
          </button>

          {/* Resumen */}
          {variantes.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-2xl font-bold text-gray-800">{variantes.length}</p>
                <p className="text-gray-500 text-xs mt-0.5">Variantes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {variantes.reduce((acc, v) => acc + (v.stock ?? 0), 0)}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">Stock total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {variantes.filter((v) => v.imagenMuestra).length}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">Con muestra</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
