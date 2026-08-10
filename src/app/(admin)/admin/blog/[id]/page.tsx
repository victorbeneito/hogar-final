"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Save, Eye, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

const BlogRichTextEditor = dynamic(
  () => import("@/components/admin/BlogRichTextEditor"),
  { ssr: false, loading: () => <div className="h-64 bg-gray-50 border border-gray-200 rounded-lg animate-pulse" /> }
);

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

type Form = {
  titulo: string;
  slug: string;
  extracto: string;
  contenidoHtml: string;
  imagenPortada: string;
  autor: string;
  activo: boolean;
  destacado: boolean;
  metaTitulo: string;
  metaDescripcion: string;
  etiquetas: string;
  fechaPublicacion: string;
  vistas: number;
};

export default function BlogEditarPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargar() {
      try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch(`/api/blog/articulos/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        const a = data.articulo;
        setForm({
          titulo: a.titulo,
          slug: a.slug,
          extracto: a.extracto ?? "",
          contenidoHtml: a.contenidoHtml ?? "",
          imagenPortada: a.imagenPortada ?? "",
          autor: a.autor,
          activo: a.activo,
          destacado: a.destacado,
          metaTitulo: a.metaTitulo ?? "",
          metaDescripcion: a.metaDescripcion ?? "",
          etiquetas: a.etiquetas ?? "",
          fechaPublicacion: new Date(a.fechaPublicacion).toISOString().slice(0, 16),
          vistas: a.vistas,
        });
      } catch (e: any) {
        toast.error(e.message || "Error cargando artículo");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, [id]);

  function set(field: string, value: unknown) {
    setForm((prev) => prev ? { ...prev, [field]: value } : null);
  }

  async function guardar() {
    if (!form?.titulo.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    setGuardando(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/blog/articulos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      // El servidor puede normalizar el slug (o añadirle sufijo si ya existía),
      // así que reflejamos el definitivo en el formulario y en el enlace "Ver"
      if (data.articulo?.slug && data.articulo.slug !== form.slug) {
        set("slug", data.articulo.slug);
        toast.success(`Artículo guardado · URL: /blog/${data.articulo.slug}`);
        return;
      }
      toast.success("Artículo guardado");
    } catch (e: any) {
      toast.error(e.message || "Error guardando artículo");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el artículo "${form?.titulo}"? Esta acción no se puede deshacer.`)) return;
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/blog/articulos/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      toast.success("Artículo eliminado");
      router.push("/admin/blog");
    } catch (e: any) {
      toast.error(e.message || "Error eliminando artículo");
    }
  }

  const inputCls = "w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] text-sm";
  const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5";

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-8 text-gray-500">Cargando artículo...</div>;
  }

  if (!form) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-red-500">Artículo no encontrado</p>
        <Link href="/admin/blog" className="text-[#3498db] hover:underline text-sm mt-2 inline-block">
          ← Volver al blog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/blog" className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-md">
              {form.titulo || "Editar artículo"}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{form.vistas} vista{form.vistas !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {form.activo && (
            <a
              href={`/blog/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
            >
              <Eye className="w-4 h-4" /> Ver
            </a>
          )}
          <button
            onClick={eliminar}
            className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex items-center gap-2 px-4 py-2 bg-[#3498db] text-white rounded-lg hover:bg-[#2980b9] text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <label className={labelCls}>Título del artículo *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
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
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <label className={labelCls}>Extracto / Resumen</label>
            <textarea
              value={form.extracto}
              onChange={(e) => set("extracto", e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <label className={labelCls}>Contenido del artículo</label>
            <BlogRichTextEditor
              value={form.contenidoHtml}
              onChange={(val) => set("contenidoHtml", val)}
              minHeight="500px"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">SEO</h3>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Meta título</label>
                <input
                  type="text"
                  value={form.metaTitulo}
                  onChange={(e) => set("metaTitulo", e.target.value)}
                  placeholder={form.titulo}
                  className={inputCls}
                />
                <p className="text-xs text-gray-400 mt-1">{form.metaTitulo.length}/60</p>
              </div>
              <div>
                <label className={labelCls}>Meta descripción</label>
                <textarea
                  value={form.metaDescripcion}
                  onChange={(e) => set("metaDescripcion", e.target.value)}
                  placeholder={form.extracto}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-xs text-gray-400 mt-1">{form.metaDescripcion.length}/160</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
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

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Imagen de portada</h3>
            <input
              type="text"
              value={form.imagenPortada}
              onChange={(e) => set("imagenPortada", e.target.value)}
              placeholder="https://... URL de la imagen"
              className={inputCls}
            />
            {form.imagenPortada && (
              <img
                src={form.imagenPortada}
                alt="Preview"
                className="mt-3 w-full h-40 object-cover rounded-lg"
              />
            )}
          </div>

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
