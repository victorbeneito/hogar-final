"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Categoria {
  id:          number;
  nombre:      string;
  slug:        string;
  descripcion: string | null;
  activa:      boolean;
  orden:       number;
  parentId:    number | null;
  other_categoria: Categoria[];   // subcategorías hijas
}

const EMPTY = {
  nombre: "", descripcion: "", activa: true, orden: 0, parentId: null as number | null,
};

export default function AdminCategorias() {
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [form, setForm]               = useState({ ...EMPTY });
  const [editando, setEditando]       = useState<number | null>(null);
  const [loading, setLoading]         = useState(false);
  const [expandidas, setExpandidas]   = useState<Set<number>>(new Set());
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

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error al guardar");
      }

      await fetchCategorias();
      setForm({ ...EMPTY });
      setEditando(null);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(cat: Categoria) {
    setForm({
      nombre:      cat.nombre,
      descripcion: cat.descripcion ?? "",
      activa:      cat.activa,
      orden:       cat.orden,
      parentId:    cat.parentId,
    });
    setEditando(cat.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta categoría? Las subcategorías pasarán a nivel raíz.")) return;
    await fetch(`/api/categorias/${id}`, { method: "DELETE" });
    await fetchCategorias();
  }

  // Solo categorías raíz (sin padre) para el selector de padre
  const raices = categorias.filter(c => c.parentId === null);

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
                  onClick={() => { setEditando(null); setForm({ ...EMPTY }); }}
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
          <div className="px-8 py-5 bg-gradient-to-r from-[#6BAEC9]/5 to-[#A8D7E6]/5 border-b">
            <h2 className="text-xl font-bold text-[#4A4A4A]">
              Categorías ({categorias.filter(c => c.parentId === null).length} principales
              · {categorias.filter(c => c.parentId !== null).length} subcategorías)
            </h2>
          </div>

          {categorias.filter(c => c.parentId === null).length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="text-5xl mb-4">🏷️</div>
              <p className="text-lg font-semibold">No hay categorías todavía</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categorias
                .filter(c => c.parentId === null)
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

                    {/* Subcategorías expandibles */}
                    {expandidas.has(cat.id) && cat.other_categoria.map(sub => (
                      <div key={sub.id} className="px-8 py-4 flex items-center justify-between bg-[#F8F8F5] border-t border-dashed border-gray-200">
                        <div className="flex items-center gap-4 pl-10">
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
                        <div className="flex gap-2">
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
