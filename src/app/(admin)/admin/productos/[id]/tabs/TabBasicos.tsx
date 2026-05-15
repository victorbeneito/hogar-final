"use client";
import { useState } from "react";
import { X, Upload, Star } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import CategoriaSelectorArbol from "@/components/admin/CategoriaSelectorArbol";

type Imagen = { id?: number; url: string; esPortada: boolean; orden: number };
type Categoria = { id: number; nombre: string; parentId: number | null };
type Marca = { id: number; nombre: string };

type Props = {
  producto?: any;
  categorias: Categoria[];
  marcas: Marca[];
  onChange: (campo: string, valor: any) => void;
  data: Record<string, any>;
};

export default function TabBasicos({ producto, categorias, marcas, onChange, data }: Props) {
  const [imagenes, setImagenes] = useState<Imagen[]>(data.imagenes ?? []);

  function addImagenUrl() {
    const url = prompt("URL de la imagen:");
    if (!url) return;
    const nuevas = [...imagenes, { url, esPortada: imagenes.length === 0, orden: imagenes.length }];
    setImagenes(nuevas);
    onChange("imagenes", nuevas);
  }

  function removeImagen(idx: number) {
    const nuevas = imagenes.filter((_, i) => i !== idx).map((img, i) => ({ ...img, orden: i }));
    // Si se elimina la portada, la primera pasa a serlo
    if (imagenes[idx].esPortada && nuevas.length > 0) nuevas[0].esPortada = true;
    setImagenes(nuevas);
    onChange("imagenes", nuevas);
  }

  function setPortada(idx: number) {
    const nuevas = imagenes.map((img, i) => ({ ...img, esPortada: i === idx }));
    setImagenes(nuevas);
    onChange("imagenes", nuevas);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna principal */}
      <div className="lg:col-span-2 flex flex-col gap-5">

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del producto <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.nombre ?? ""}
            onChange={(e) => onChange("nombre", e.target.value)}
            placeholder="Ej: Happystor Estor Digital Infantil HSCI97011"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Resumen */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resumen corto <span className="text-gray-400 text-xs">(máx. 800 caracteres)</span>
          </label>
          <textarea
            value={data.resumen ?? ""}
            onChange={(e) => onChange("resumen", e.target.value)}
            rows={3}
            maxLength={800}
            placeholder="Descripción breve que aparece en el listado..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-0.5">{(data.resumen ?? "").length}/800</p>
        </div>

        {/* Descripción rich text */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <RichTextEditor
            value={data.descripcion ?? ""}
            onChange={(val) => { onChange("descripcion", val); onChange("descripcion_html", val); }}
          />
        </div> */}

        {/* Descripción (temporal sin Tiptap) */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
  <textarea
    value={data.descripcion ?? ""}
    onChange={(e) => {
      onChange("descripcion", e.target.value);
      onChange("descripcion_html", e.target.value);
    }}
    rows={8}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical font-mono"
    placeholder="Texto plano (RichTextEditor activado después)"
  />
</div>


      </div>

      {/* Columna lateral */}
      <div className="flex flex-col gap-5">

        {/* Imágenes */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Imágenes del producto</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {imagenes.map((img, idx) => (
              <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-white">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                {img.esPortada && (
                  <span className="absolute top-1 left-1 bg-yellow-400 text-xs text-white px-1 rounded flex items-center gap-0.5">
                    <Star size={10} /> Portada
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                  {!img.esPortada && (
                    <button type="button" onClick={() => setPortada(idx)}
                      className="text-white text-xs bg-yellow-500 rounded px-1.5 py-0.5 hover:bg-yellow-600">
                      Portada
                    </button>
                  )}
                  <button type="button" onClick={() => removeImagen(idx)}
                    className="text-white bg-red-500 rounded p-1 hover:bg-red-600">
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
            {/* Botón añadir */}
            <button type="button" onClick={addImagenUrl}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition">
              <Upload size={20} />
              <span className="text-xs">Añadir</span>
            </button>
          </div>
          <p className="text-xs text-gray-400">La primera imagen es la portada. Pulsa "Portada" para cambiarla.</p>
        </div>

        {/* Referencia */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Referencia <span className="text-red-500">*</span>
          </h3>
          <input
            type="text"
            value={data.referencia ?? ""}
            onChange={(e) => onChange("referencia", e.target.value)}
            placeholder="Ej: W-V-80853"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Categoría */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Categoría</h3>
          <CategoriaSelectorArbol
            categorias={categorias}
            selectedId={data.categoriaId ?? null}
            onChange={(id) => onChange("categoriaId", id)}
          />
        </div>

        {/* Marca */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Marca</h3>
          <select
            value={data.marcaId ?? ""}
            onChange={(e) => onChange("marcaId", e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin marca</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>

        {/* Estado rápido */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Estado</h3>
          <div className="flex flex-col gap-2">
            {[
              { key: "activo", label: "Activo (visible en tienda)" },
              { key: "destacado", label: "Producto destacado" },
              { key: "enOferta", label: "En oferta" },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data[item.key] ?? false}
                  onChange={(e) => onChange(item.key, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* HTML personalizado */}
      <div className="lg:col-span-3 bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3 min-h-[560px]">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          HTML personalizado
          <span className="ml-2 text-xs text-gray-400 font-normal">Pega código HTML con estilos personalizados</span>
        </label>
        <textarea
          value={data.descripcion_html ?? ""}
          onChange={(e) => onChange("descripcion_html", e.target.value)}
          rows={24}
          placeholder='<div class="mi-estilos">...</div>'
          className="w-full flex-1 min-h-[420px] px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono leading-6 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white"
        />
      </div>
    </div>
  );
}
