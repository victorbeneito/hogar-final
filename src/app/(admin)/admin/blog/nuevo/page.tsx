"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Save, Eye } from "lucide-react";
import dynamic from "next/dynamic";

const BlogRichTextEditor = dynamic(
  () => import("@/components/admin/BlogRichTextEditor"),
  { ssr: false, loading: () => <div className="h-64 bg-gray-50 border border-gray-200 rounded-lg animate-pulse" /> }
);

const defaultForm = {
  titulo: "",
  slug: "",
  extracto: "",
  contenidoHtml: "",
  imagenPortada: "",
  autor: "El equipo de tu Hogar",
  activo: false,
  destacado: false,
  metaTitulo: "",
  metaDescripcion: "",
  etiquetas: "",
  fechaPublicacion: new Date().toISOString().slice(0, 16),
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function BlogNuevoPage() {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [guardando, setGuardando] = useState(false);
  const [previewImagen, setPreviewImagen] = useState(false);

  function set(field: string, value: unknown) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "titulo" && !prev.slug) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  async function guardar(publicar = false) {
    if (!form.titulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    setGuardando(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/blog/articulos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ ...form, activo: publicar ? true : form.activo }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success(publicar ? "Artículo publicado" : "Artículo guardado como borrador");
      router.push(`/admin/blog/${data.articulo.id}`);
    } catch (e: any) {
      toast.error(e.message || "Error guardando artículo");
    } finally {
      setGuardando(false);
    }
  }

  const inputCls = "w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] text-sm";
  const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/blog" className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo artículo</h1>
            <p className="text-xs text-gray-400 mt-0.5">El blog de tu Hogar</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => guardar(false)}
            disabled={guardando}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {guardando ? "Guardando..." : "Borrador"}
          </button>
          <button
            onClick={() => guardar(true)}
            disabled={guardando}
            className="flex items-center gap-2 px-4 py-2 bg-[#3498db] text-white rounded-lg hover:bg-[#2980b9] text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            Publicar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="xl:col-span-2 space-y-6">
          {/* Título */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <label className={labelCls}>Título del artículo *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder="Ej: 10 ideas para decorar tu salón con estilo nórdico"
              className={`${inputCls} text-base font-medium`}
            />
            <div className="mt-3">
              <label className={labelCls}>URL (slug)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">/blog/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => set("slug", slugify(e.target.value))}
                  placeholder="url-del-articulo"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Extracto */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <label className={labelCls}>Extracto / Resumen</label>
            <textarea
              value={form.extracto}
              onChange={(e) => set("extracto", e.target.value)}
              placeholder="Breve resumen del artículo (aparece en la lista del blog)..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
            <p className="text-xs text-gray-400 mt-1">{form.extracto.length}/300 caracteres</p>
          </div>

          {/* Editor de contenido */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <label className={labelCls}>Contenido del artículo</label>
            <BlogRichTextEditor
              value={form.contenidoHtml}
              onChange={(val) => set("contenidoHtml", val)}
              minHeight="500px"
            />
          </div>

          {/* SEO */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">SEO</h3>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Meta título</label>
                <input
                  type="text"
                  value={form.metaTitulo}
                  onChange={(e) => set("metaTitulo", e.target.value)}
                  placeholder={form.titulo || "Meta título para buscadores"}
                  className={inputCls}
                />
                <p className="text-xs text-gray-400 mt-1">{form.metaTitulo.length}/60 · Recomendado: menos de 60 caracteres</p>
              </div>
              <div>
                <label className={labelCls}>Meta descripción</label>
                <textarea
                  value={form.metaDescripcion}
                  onChange={(e) => set("metaDescripcion", e.target.value)}
                  placeholder={form.extracto || "Descripción para buscadores..."}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-xs text-gray-400 mt-1">{form.metaDescripcion.length}/160 · Recomendado: menos de 160 caracteres</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Publicación */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Publicación</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700 dark:text-gray-300">Publicado</span>
                <button
                  type="button"
                  onClick={() => set("activo", !form.activo)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.activo ? "bg-[#3498db]" : "bg-gray-200 dark:bg-gray-600"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.activo ? "translate-x-5" : ""}`} />
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700 dark:text-gray-300">Destacado</span>
                <button
                  type="button"
                  onClick={() => set("destacado", !form.destacado)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.destacado ? "bg-amber-400" : "bg-gray-200 dark:bg-gray-600"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.destacado ? "translate-x-5" : ""}`} />
                </button>
              </label>
              <div>
                <label className={labelCls}>Fecha de publicación</label>
                <input
                  type="datetime-local"
                  value={form.fechaPublicacion}
                  onChange={(e) => set("fechaPublicacion", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Imagen portada */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Imagen de portada</h3>
            <input
              type="text"
              value={form.imagenPortada}
              onChange={(e) => { set("imagenPortada", e.target.value); setPreviewImagen(false); }}
              placeholder="https://... URL de la imagen"
              className={inputCls}
            />
            {form.imagenPortada && (
              <div className="mt-3">
                <img
                  src={form.imagenPortada}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-lg"
                  onError={() => setPreviewImagen(false)}
                />
              </div>
            )}
          </div>

          {/* Autor y etiquetas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Detalles</h3>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Autor</label>
                <input
                  type="text"
                  value={form.autor}
                  onChange={(e) => set("autor", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Etiquetas (separadas por coma)</label>
                <input
                  type="text"
                  value={form.etiquetas}
                  onChange={(e) => set("etiquetas", e.target.value)}
                  placeholder="decoración, hogar, consejos"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
