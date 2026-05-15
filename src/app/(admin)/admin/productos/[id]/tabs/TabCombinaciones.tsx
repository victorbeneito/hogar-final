"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";

type Variante = {
  id?: number;
  color?: string;
  imagenMuestra?: string;
  imagen?: string;
  imagenesVariante?: string;
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
  imagenesVariante: "",
  tamano: "",
  tirador: "",
  precio_extra: 0,
  stock: 0,
  referencia: "",
};

function parseDimensions(tamano?: string): [number, number] {
  if (!tamano) return [0, 0];
  const match = tamano.match(/^(\d+(?:[.,]\d+)?)[x×](\d+(?:[.,]\d+)?)/i);
  if (!match) return [0, 0];
  return [
    parseFloat(match[1].replace(",", ".")),
    parseFloat(match[2].replace(",", ".")),
  ];
}

export default function TabCombinaciones({ data, onChange }: Props) {
  const variantes: Variante[] = data.variantes ?? [];
  const [expandida, setExpandida] = useState<number | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());

  // Sync tieneVariantes with the actual array length on mount
  useEffect(() => {
    const shouldHave = variantes.length > 0;
    if ((data.tieneVariantes ?? false) !== shouldHave) {
      onChange("tieneVariantes", shouldHave);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sort indices: alto (2nd dim) asc → ancho (1st dim) asc → tirador
  const sortedIndices = variantes
    .map((v, i) => ({ v, i }))
    .sort((a, b) => {
      const [aW, aH] = parseDimensions(a.v.tamano);
      const [bW, bH] = parseDimensions(b.v.tamano);
      if (aH !== bH) return aH - bH;
      if (aW !== bW) return aW - bW;
      return (a.v.tirador ?? "").localeCompare(b.v.tirador ?? "");
    })
    .map((x) => x.i);

  function addVariante() {
    const nuevas = [...variantes, { ...VARIANTE_VACIA }];
    onChange("variantes", nuevas);
    onChange("tieneVariantes", true);
    setExpandida(nuevas.length - 1);
  }

  function removeVariante(idx: number) {
    const nuevas = variantes.filter((_, i) => i !== idx);
    onChange("variantes", nuevas);
    onChange("tieneVariantes", nuevas.length > 0);
    if (expandida === idx) setExpandida(null);
    setSeleccionadas((prev) => {
      const next = new Set<number>();
      prev.forEach((s) => { if (s !== idx) next.add(s > idx ? s - 1 : s); });
      return next;
    });
  }

  function removeSeleccionadas() {
    const indicesToRemove = Array.from(seleccionadas).sort((a, b) => b - a);
    let nuevas = [...variantes];
    for (const idx of indicesToRemove) nuevas.splice(idx, 1);
    onChange("variantes", nuevas);
    onChange("tieneVariantes", nuevas.length > 0);
    setSeleccionadas(new Set());
    if (expandida !== null && seleccionadas.has(expandida)) setExpandida(null);
  }

  function updateVariante(idx: number, campo: keyof Variante, valor: any) {
    const nuevas = variantes.map((v, i) => (i === idx ? { ...v, [campo]: valor } : v));
    onChange("variantes", nuevas);
  }

  function toggleSeleccion(idx: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function toggleTodas() {
    if (seleccionadas.size === variantes.length) {
      setSeleccionadas(new Set());
    } else {
      setSeleccionadas(new Set(variantes.map((_, i) => i)));
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Explicación */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">¿Cómo funcionan las combinaciones?</p>
        <ul className="list-disc list-inside flex flex-col gap-1 text-blue-700">
          <li>Cada variante puede tener una <strong>imagen muestra</strong> (miniatura del selector) y una <strong>galería propia</strong> para la ficha del producto.</li>
          <li>Al pulsar una muestra, la imagen principal del producto cambia a la <strong>imagen del producto</strong> de esa variante y debajo puedes mostrar sus miniaturas.</li>
          <li>Si una variante no tiene imagen propia, se mostrará la imagen de portada del producto.</li>
        </ul>
      </div>

      {/* Toolbar selección */}
          {variantes.length > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <input
                type="checkbox"
                checked={seleccionadas.size === variantes.length && variantes.length > 0}
                ref={(el) => {
                  if (el) el.indeterminate = seleccionadas.size > 0 && seleccionadas.size < variantes.length;
                }}
                onChange={toggleTodas}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-gray-500 flex-1">
                {seleccionadas.size === 0
                  ? `${variantes.length} combinacion${variantes.length !== 1 ? "es" : ""}`
                  : `${seleccionadas.size} seleccionada${seleccionadas.size !== 1 ? "s" : ""}`}
              </span>
              {seleccionadas.size > 0 && (
                <button
                  type="button"
                  onClick={removeSeleccionadas}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition"
                >
                  <Trash2 size={13} />
                  Eliminar {seleccionadas.size} seleccionada{seleccionadas.size !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          )}

          {/* Lista de variantes (ordenadas por alto → ancho → tirador) */}
          <div className="flex flex-col gap-3">
            {variantes.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                Sin variantes. Pulsa "Añadir variante" para empezar.
              </p>
            )}

            {sortedIndices.map((idx) => {
              const v = variantes[idx];
              const isSelected = seleccionadas.has(idx);
              return (
                <div
                  key={idx}
                  className={`border rounded-xl overflow-hidden bg-white transition ${
                    isSelected ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200"
                  }`}
                >
                  {/* Cabecera */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpandida(expandida === idx ? null : idx)}
                  >
                    {/* Checkbox selección */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => toggleSeleccion(idx, e)}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                    />

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

                    {/* Imagen del producto */}
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

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del color</label>
                        <input
                          type="text"
                          value={v.color ?? ""}
                          onChange={(e) => updateVariante(idx, "color", e.target.value)}
                          placeholder="Ej: Clear 100-Blanco óptico"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>

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
                            <img src={v.imagenMuestra} alt="" className="w-10 h-10 rounded object-cover border border-gray-200 flex-shrink-0" />
                          )}
                        </div>
                      </div>

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
                            <img src={v.imagen} alt="" className="w-10 h-10 rounded object-cover border border-gray-200 flex-shrink-0" />
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Galería de la combinación
                          <span className="ml-1 text-gray-400 font-normal">(URLs separadas por | para ambiente, detalle, etc.)</span>
                        </label>
                        <input
                          type="text"
                          value={v.imagenesVariante ?? ""}
                          onChange={(e) => updateVariante(idx, "imagenesVariante", e.target.value)}
                          placeholder="https://...jpg | https://...jpg | https://...jpg"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          La primera URL se usará como imagen principal si no indicas una en Imagen del producto.
                        </p>
                      </div>

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
              );
            })}
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
    </div>
  );
}
