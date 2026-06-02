"use client";
import { useState, useRef } from "react";
import { X, Upload, Star, Link, FolderOpen } from "lucide-react";
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addImageFromUrl() {
    const url = urlInput.trim();
    if (!url) return;
    const nuevas = [...imagenes, { url, esPortada: imagenes.length === 0, orden: imagenes.length }];
    setImagenes(nuevas);
    onChange("imagenes", nuevas);
    setUrlInput("");
    setShowImageModal(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload/imagen", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      const nuevas = [...imagenes, { url: data.url, esPortada: imagenes.length === 0, orden: imagenes.length }];
      setImagenes(nuevas);
      onChange("imagenes", nuevas);
      setShowImageModal(false);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

        {/* Composición */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Composición</label>
          <textarea
            value={data.composicion ?? ""}
            onChange={(e) => onChange("composicion", e.target.value)}
            rows={6}
            placeholder="Ej: 100% Poliéster&#10;Tratamiento: Acrílico protector UV"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
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
            <button type="button" onClick={() => { setShowImageModal(true); setUploadError(""); setUrlInput(""); }}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition">
              <Upload size={20} />
              <span className="text-xs">Añadir</span>
            </button>
          </div>
          <p className="text-xs text-gray-400">La primera imagen es la portada. Pulsa "Portada" para cambiarla.</p>
        </div>

        {/* Modal añadir imagen */}
        {showImageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-gray-800">Añadir imagen</h3>
                <button type="button" onClick={() => setShowImageModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              {/* Subir archivo */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Desde tu ordenador</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                  id="imagen-file-input"
                />
                <label
                  htmlFor="imagen-file-input"
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-dashed cursor-pointer transition text-sm font-medium
                    ${uploading ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed" : "border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50"}`}
                >
                  <FolderOpen size={18} />
                  {uploading ? "Subiendo..." : "Seleccionar archivo (JPG, PNG, WEBP, GIF · máx. 5MB)"}
                </label>
                {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
              </div>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">o</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* URL */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Desde una URL</p>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addImageFromUrl()}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addImageFromUrl}
                    disabled={!urlInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Añadir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
