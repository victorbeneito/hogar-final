"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/lib/useAdminFetch";

interface Categoria {
  id:          number;
  nombre:      string;
  slug:        string;
  descripcion: string | null;
  activa:      boolean;
  orden:       number;
  parentId:    number | null;
  metaTitulo:      string | null;
  metaDescripcion: string | null;
  textoSeo:        string | null;
  other_categoria: Categoria[];
}

const EMPTY = {
  nombre: "", descripcion: "", activa: true, orden: 0, parentId: null as number | null,
  metaTitulo: "", metaDescripcion: "", textoSeo: "",
};

export default function AdminCategorias() {
  const { secureFetch } = useAdminFetch();
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [form, setForm]               = useState({ ...EMPTY });
  const [originalForm, setOriginalForm] = useState<typeof EMPTY | null>(null);
  const [editando, setEditando]       = useState<number | null>(null);
  const [loading, setLoading]         = useState(false);
  const [expandidas, setExpandidas]   = useState<Set<number>>(new Set());
  const [dragSubId, setDragSubId]     = useState<number | null>(null);
  const [dragOverSubId, setDragOverSubId] = useState<number | null>(null);
  const [savingOrden, setSavingOrden] = useState(false);
  const dragParentId = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => { fetchCategorias(); }, []);

  async function fetchCategorias() {
    // ✅ URL corregida: /api/admin/categorias
    const res  = await fetch("/api/categorias");
    const data = await res.json();
    setCategorias(data.categorias ?? []);
  }

  function toggleExpand(id: number) {
    setExpandidas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url    = editando ? `/api/categorias/${editando}` : "/api/categorias";
      const method = editando ? "PUT" : "POST";
      const body = editando && originalForm
        ? Object.fromEntries(
            Object.entries(form).filter(([key, value]) => {
              const originalValue = (originalForm as Record<string, unknown>)[key];
              return value !== originalValue;
            })
          )
        : form;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al guardar");
      }

      await fetchCategorias();
      setForm({ ...EMPTY });
      setEditando(null);
      setOriginalForm(null);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(cat: Categoria) {
    const current = {
      nombre: cat.nombre,
      descripcion: cat.descripcion ?? "",
      activa: cat.activa,
      orden: cat.orden,
      parentId: cat.parentId,
      metaTitulo: cat.metaTitulo ?? "",
      metaDescripcion: cat.metaDescripcion ?? "",
      textoSeo: cat.textoSeo ?? "",
    };

    setForm({ ...current });
    setOriginalForm({ ...current });
    setEditando(cat.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta categoría? Las subcategorías pasarán a nivel raíz.")) return;
    const result = await secureFetch(`/api/categorias/${id}`, { method: "DELETE" });
    if (result.ok) {
      await fetchCategorias();
    }
  }

  function handleDragStart(subId: number, parentId: number) {
    setDragSubId(subId);
    dragParentId.current = parentId;
  }

  function handleDragOver(e: React.DragEvent, subId: number) {
    e.preventDefault();
    if (dragSubId !== subId) setDragOverSubId(subId);
  }

  function handleDragEnd() {
    setDragSubId(null);
    setDragOverSubId(null);
    dragParentId.current = null;
  }

  function handleDrop(e: React.DragEvent, targetSubId: number, parentId: number) {
    e.preventDefault();
    if (!dragSubId || dragSubId === targetSubId || dragParentId.current !== parentId) {
      handleDragEnd();
      return;
    }

    const parent = categorias.find(c => c.id === parentId);
    if (!parent) { handleDragEnd(); return; }

    const subs = [...parent.other_categoria].sort(compararOrden);
    const fromIdx = subs.findIndex(s => s.id === dragSubId);
    const toIdx   = subs.findIndex(s => s.id === targetSubId);
    if (fromIdx === -1 || toIdx === -1) { handleDragEnd(); return; }

    const reordered = [...subs];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withNewOrden = reordered.map((s, idx) => ({ ...s, orden: idx * 10 }));

    setCategorias(prev => prev.map(c =>
      c.id !== parentId ? c : { ...c, other_categoria: withNewOrden }
    ));

    handleDragEnd();
    persistOrden(withNewOrden);
  }

  async function persistOrden(subs: Categoria[]) {
    setSavingOrden(true);
    try {
      await Promise.all(
        subs.map(s =>
          fetch(`/api/categorias/${s.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orden: s.orden }),
          })
        )
      );
    } catch {
      // orden fallback: reload from server
      await fetchCategorias();
    } finally {
      setSavingOrden(false);
    }
  }

  // Solo categorías raíz (sin padre) para el selector de padre
  const raices = categorias.filter(c => c.parentId === null);
  const compararOrden = (a: Categoria, b: Categoria) => {
    const ordenA = Number(a.orden ?? 0);
    const ordenB = Number(b.orden ?? 0);
    if (ordenA !== ordenB) return ordenA - ordenB;
    return a.nombre.localeCompare(b.nombre);
  };
  const raicesOrdenadas = [...raices].sort(compararOrden);

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-8 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Cabecera */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[#4A4A4A]">🏷️ Categorías</h1>
          <button
            onClick={() => router.push("/admin")}
            className="px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] hover:opacity-90 shadow transition"
          >
            ← Volver al panel
          </button>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-[#6BAEC9]/10">
          <h2 className="text-lg font-bold text-[#4A4A4A] mb-5">
            {editando ? "✏️ Editar categoría" : "➕ Nueva categoría"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nombre *</label>
                <input
                  required
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Estores Digitales"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                />
              </div>

              {/* Categoría padre (subcategoría) */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Categoría padre <span className="text-gray-400">(dejar vacío = categoría raíz)</span>
                </label>
                <select
                  value={form.parentId ?? ""}
                  onChange={e => setForm(p => ({ ...p, parentId: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                >
                  <option value="">— Categoría raíz —</option>
                  {raices
                    .filter(c => c.id !== editando)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </select>
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Descripción opcional"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition resize-none"
                />
              </div>
            </div>

            {/* SEO */}
            <div className="border-t border-gray-200 pt-5 mt-2">
              <h3 className="text-sm font-bold text-[#4A4A4A] mb-4">🔍 SEO</h3>
              <div className="grid grid-cols-1 gap-4">

                {/* Meta título */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Meta título <span className="text-gray-400 font-normal">(máx. 70 caracteres)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={70}
                    value={form.metaTitulo}
                    onChange={e => setForm(p => ({ ...p, metaTitulo: e.target.value }))}
                    placeholder="Ej: Estores Digitales de Cocina | El Hogar de tus Sueños"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                  />
                  <p className="text-xs text-gray-400 mt-1">{form.metaTitulo.length}/70 caracteres</p>
                </div>

                {/* Meta descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Meta descripción <span className="text-gray-400 font-normal">(máx. 160 caracteres)</span>
                  </label>
                  <textarea
                    rows={3}
                    maxLength={160}
                    value={form.metaDescripcion}
                    onChange={e => setForm(p => ({ ...p, metaDescripcion: e.target.value }))}
                    placeholder="Descripción que aparece bajo el título en Google..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{form.metaDescripcion.length}/160 caracteres</p>
                </div>

                {/* Texto SEO */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Texto SEO <span className="text-gray-400 font-normal">(aparece al final de la página de categoría)</span>
                  </label>
                  <textarea
                    rows={6}
                    value={form.textoSeo}
                    onChange={e => setForm(p => ({ ...p, textoSeo: e.target.value }))}
                    placeholder="Texto enriquecido que la agencia SEO prepara para esta categoría. Acepta HTML básico (<h2>, <p>, <strong>, etc.)"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition resize-y font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">Acepta HTML. La agencia puede pegar aquí el texto que ya tiene en PrestaShop.</p>
                </div>

                {/* Vista previa Google */}
                {(form.metaTitulo || form.nombre) && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-3">Vista previa en Google</p>
                    <div className="rounded-lg border border-gray-100 p-3 bg-white">
                      <p className="text-xs text-green-700 mb-1 truncate">
                        elhogardetusuenos.com › categorias › {editando ?? "..."}
                      </p>
                      <p className="text-blue-700 text-base font-medium leading-tight mb-1 line-clamp-1">
                        {(form.metaTitulo || form.nombre).slice(0, 60)}{(form.metaTitulo || form.nombre).length > 60 ? "..." : ""}
                      </p>
                      <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                        {form.metaDescripcion || form.descripcion || "Sin descripción todavía."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Orden y activa */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Orden</label>
                <input
                  type="number" min="0"
                  value={form.orden}
                  onChange={e => setForm(p => ({ ...p, orden: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.activa}
                    onChange={e => setForm(p => ({ ...p, activa: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm font-medium text-gray-600">Categoría activa</span>
                </label>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit" disabled={loading}
                className="bg-[#6BAEC9] hover:bg-[#5FA0B3] text-white px-8 py-3 rounded-xl font-semibold shadow transition disabled:opacity-50"
              >
                {loading ? "⏳ Guardando..." : editando ? "✏️ Actualizar" : "➕ Crear"}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={() => { setEditando(null); setForm({ ...EMPTY }); setOriginalForm(null); }}
                  className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#6BAEC9]/10">
          <div className="px-8 py-5 bg-gradient-to-r from-[#6BAEC9]/5 to-[#A8D7E6]/5 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#4A4A4A]">
              Categorías ({categorias.filter(c => c.parentId === null).length} principales
              · {categorias.filter(c => c.parentId !== null).length} subcategorías)
            </h2>
            {savingOrden && (
              <span className="text-sm text-[#6BAEC9] animate-pulse font-medium">Guardando orden...</span>
            )}
          </div>

          {raices.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="text-5xl mb-4">🏷️</div>
              <p className="text-lg font-semibold">No hay categorías todavía</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {raicesOrdenadas
                .map(cat => (
                  <div key={cat.id}>
                    {/* Fila categoría raíz */}
                    <div className="px-8 py-5 flex items-center justify-between hover:bg-gray-50 transition">
                      <div className="flex items-center gap-4">
                        {/* Expandir si tiene hijos */}
                        {cat.other_categoria.length > 0 && (
                          <button
                            onClick={() => toggleExpand(cat.id)}
                            className="w-6 h-6 text-[#6BAEC9] font-bold text-lg leading-none"
                          >
                            {expandidas.has(cat.id) ? "▾" : "▸"}
                          </button>
                        )}
                        {cat.other_categoria.length === 0 && <div className="w-6" />}

                        <div className="w-10 h-10 bg-gradient-to-br from-[#6BAEC9] to-[#A8D7E6] rounded-xl flex items-center justify-center text-white font-bold shadow">
                          {cat.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#4A4A4A]">{cat.nombre}</span>
                            {!cat.activa && (
                              <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">Inactiva</span>
                            )}
                            {cat.other_categoria.length > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-500 px-2 py-0.5 rounded-full">
                                {cat.other_categoria.length} subcategorías
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">ID: {cat.id} · /{cat.slug}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(cat)}
                          className="p-2.5 bg-orange-50 hover:bg-orange-100 text-orange-400 rounded-xl transition">✏️</button>
                        <button onClick={() => handleDelete(cat.id)}
                          className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition">🗑️</button>
                      </div>
                    </div>

                    {/* Subcategorías expandibles con drag & drop */}
                    {expandidas.has(cat.id) && [...cat.other_categoria].sort(compararOrden).map(sub => (
                      <div
                        key={sub.id}
                        draggable
                        onDragStart={() => handleDragStart(sub.id, cat.id)}
                        onDragOver={(e) => handleDragOver(e, sub.id)}
                        onDrop={(e) => handleDrop(e, sub.id, cat.id)}
                        onDragEnd={handleDragEnd}
                        className={`px-8 py-4 flex items-center justify-between border-t border-dashed transition-colors select-none
                          ${dragSubId === sub.id
                            ? "opacity-40 bg-[#F8F8F5] border-gray-200"
                            : dragOverSubId === sub.id
                              ? "bg-[#6BAEC9]/10 border-[#6BAEC9]/40"
                              : "bg-[#F8F8F5] border-gray-200"
                          }`}
                      >
                        <div className="flex items-center gap-3 pl-6">
                          {/* Handle drag */}
                          <div
                            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors"
                            title="Arrastrar para reordenar"
                          >
                            <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
                              <circle cx="4" cy="4" r="1.8"/>
                              <circle cx="10" cy="4" r="1.8"/>
                              <circle cx="4" cy="10" r="1.8"/>
                              <circle cx="10" cy="10" r="1.8"/>
                              <circle cx="4" cy="16" r="1.8"/>
                              <circle cx="10" cy="16" r="1.8"/>
                            </svg>
                          </div>
                          <div className="w-8 h-8 bg-[#A8D7E6]/40 border border-[#6BAEC9]/30 rounded-lg flex items-center justify-center text-[#6BAEC9] font-semibold text-sm">
                            {sub.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#4A4A4A] text-sm">{sub.nombre}</span>
                              {!sub.activa && (
                                <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">Inactiva</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">ID: {sub.id} · /{sub.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(sub)}
                            className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-400 rounded-xl transition text-sm">✏️</button>
                          <button onClick={() => handleDelete(sub.id)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition text-sm">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
