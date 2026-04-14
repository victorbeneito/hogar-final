"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Valor = {
  id: number;
  atributoId: number;
  valor: string;
  colorHex: string | null;
  imagen: string | null;
  orden: number;
};

type Atributo = {
  id: number;
  nombre: string;
  orden: number;
  atributovalor: Valor[];
};

type AtributoForm = {
  nombre: string;
  orden: number;
};

type ValorForm = {
  valor: string;
  colorHex: string;
  imagen: string;
  orden: number;
};

const emptyAtributoForm: AtributoForm = { nombre: "", orden: 0 };
const emptyValorForm: ValorForm = { valor: "", colorHex: "", imagen: "", orden: 0 };

export default function AdminAtributosPage() {
  const [atributos, setAtributos] = useState<Atributo[]>([]);
  const [atributoForm, setAtributoForm] = useState<AtributoForm>(emptyAtributoForm);
  const [valorForm, setValorForm] = useState<ValorForm>(emptyValorForm);
  const [editandoAtributo, setEditandoAtributo] = useState<number | null>(null);
  const [editandoValor, setEditandoValor] = useState<{ atributoId: number; valorId: number } | null>(null);
  const [selectedAttributeId, setSelectedAttributeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function fetchAtributos() {
    const res = await fetch("/api/atributos");
    const data = await res.json();
    setAtributos((data.atributos ?? []) as Atributo[]);
  }

  useEffect(() => {
    fetchAtributos();
  }, []);

  const atributoSeleccionado = useMemo(() => {
    return atributos.find((atributo) => atributo.id === selectedAttributeId) ?? atributos[0] ?? null;
  }, [atributos, selectedAttributeId]);

  useEffect(() => {
    if (!selectedAttributeId && atributos.length > 0) {
      setSelectedAttributeId(atributos[0].id);
    }
  }, [atributos, selectedAttributeId]);

  async function handleSubmitAtributo(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editandoAtributo ? `/api/atributos/${editandoAtributo}` : "/api/atributos";
      const method = editandoAtributo ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(atributoForm),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error al guardar atributo");

      await fetchAtributos();
      setAtributoForm(emptyAtributoForm);
      setEditandoAtributo(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitValor(e: React.FormEvent) {
    e.preventDefault();
    if (!atributoSeleccionado) return;

    setLoading(true);
    try {
      const ruta = editandoValor
        ? `/api/atributos/${editandoValor.atributoId}/valores/${editandoValor.valorId}`
        : `/api/atributos/${atributoSeleccionado.id}/valores`;
      const method = editandoValor ? "PUT" : "POST";

      const res = await fetch(ruta, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor: valorForm.valor,
          colorHex: valorForm.colorHex || null,
          imagen: valorForm.imagen || null,
          orden: valorForm.orden,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error al guardar valor");

      await fetchAtributos();
      setValorForm(emptyValorForm);
      setEditandoValor(null);
      setSelectedAttributeId(atributoSeleccionado.id);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleEditAtributo(atributo: Atributo) {
    setAtributoForm({ nombre: atributo.nombre, orden: atributo.orden });
    setEditandoAtributo(atributo.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleEditValor(atributo: Atributo, valor: Valor) {
    setSelectedAttributeId(atributo.id);
    setValorForm({
      valor: valor.valor,
      colorHex: valor.colorHex ?? "",
      imagen: valor.imagen ?? "",
      orden: valor.orden,
    });
    setEditandoValor({ atributoId: atributo.id, valorId: valor.id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteAtributo(id: number) {
    if (!confirm("¿Eliminar este atributo y todos sus valores?")) return;
    const res = await fetch(`/api/atributos/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    await fetchAtributos();
    if (selectedAttributeId === id) setSelectedAttributeId(null);
  }

  async function handleDeleteValor(atributoId: number, valorId: number) {
    if (!confirm("¿Eliminar este valor?")) return;
    const res = await fetch(`/api/atributos/${atributoId}/valores/${valorId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    await fetchAtributos();
  }

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#4A4A4A]">🎨 Atributos</h1>
            <p className="text-sm text-gray-500 mt-1">Gestiona Tamaño, Color, Tirador y sus valores.</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] hover:opacity-90 shadow transition"
          >
            ← Volver al panel
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#6BAEC9]/10">
            <h2 className="text-lg font-bold text-[#4A4A4A] mb-5">
              {editandoAtributo ? "✏️ Editar atributo" : "➕ Nuevo atributo"}
            </h2>
            <form onSubmit={handleSubmitAtributo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nombre *</label>
                <input
                  required
                  value={atributoForm.nombre}
                  onChange={(e) => setAtributoForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Tamaño"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Orden</label>
                <input
                  type="number"
                  min="0"
                  value={atributoForm.orden}
                  onChange={(e) => setAtributoForm((prev) => ({ ...prev, orden: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#6BAEC9] hover:bg-[#5FA0B3] text-white px-8 py-3 rounded-xl font-semibold shadow transition disabled:opacity-50"
                >
                  {loading ? "⏳ Guardando..." : editandoAtributo ? "✏️ Actualizar" : "➕ Crear"}
                </button>
                {editandoAtributo && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoAtributo(null);
                      setAtributoForm(emptyAtributoForm);
                    }}
                    className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#6BAEC9]/10">
            <h2 className="text-lg font-bold text-[#4A4A4A] mb-5">
              {atributoSeleccionado ? `Valores de ${atributoSeleccionado.nombre}` : "➕ Nuevo valor"}
            </h2>
            <form onSubmit={handleSubmitValor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Atributo</label>
                <select
                  value={atributoSeleccionado?.id ?? ""}
                  onChange={(e) => setSelectedAttributeId(e.target.value ? Number(e.target.value) : null)}
                  disabled={atributos.length === 0}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                >
                  <option value="">— Selecciona un atributo —</option>
                  {atributos.map((atributo) => (
                    <option key={atributo.id} value={atributo.id}>
                      {atributo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Valor / nombre *</label>
                <input
                  required
                  value={valorForm.valor}
                  onChange={(e) => setValorForm((prev) => ({ ...prev, valor: e.target.value }))}
                  placeholder={atributoSeleccionado?.nombre === "Color" ? "Gris claro" : "Ej: 80x200"}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Color hex</label>
                  <input
                    value={valorForm.colorHex}
                    onChange={(e) => setValorForm((prev) => ({ ...prev, colorHex: e.target.value }))}
                    placeholder="#d9d9d9"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Imagen</label>
                  <input
                    value={valorForm.imagen}
                    onChange={(e) => setValorForm((prev) => ({ ...prev, imagen: e.target.value }))}
                    placeholder="URL de la imagen"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Orden</label>
                <input
                  type="number"
                  min="0"
                  value={valorForm.orden}
                  onChange={(e) => setValorForm((prev) => ({ ...prev, orden: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading || !atributoSeleccionado}
                  className="bg-[#6BAEC9] hover:bg-[#5FA0B3] text-white px-8 py-3 rounded-xl font-semibold shadow transition disabled:opacity-50"
                >
                  {loading ? "⏳ Guardando..." : editandoValor ? "✏️ Actualizar valor" : "➕ Crear valor"}
                </button>
                {editandoValor && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoValor(null);
                      setValorForm(emptyValorForm);
                    }}
                    className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#6BAEC9]/10">
          <div className="px-8 py-5 bg-gradient-to-r from-[#6BAEC9]/5 to-[#A8D7E6]/5 border-b">
            <h2 className="text-xl font-bold text-[#4A4A4A]">
              Atributos ({atributos.length})
            </h2>
          </div>

          {atributos.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="text-5xl mb-4">🎨</div>
              <p className="text-lg font-semibold">No hay atributos todavía</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {atributos.map((atributo) => (
                <div key={atributo.id} className="px-8 py-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-[#4A4A4A]">{atributo.nombre}</h3>
                        <span className="text-xs text-gray-400 font-mono">ID: #{atributo.id}</span>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                          Orden: {atributo.orden}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{atributo.atributovalor.length} valores</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedAttributeId(atributo.id);
                          handleEditAtributo(atributo);
                        }}
                        className="p-2.5 bg-orange-50 hover:bg-orange-100 text-orange-400 rounded-xl transition"
                        title="Editar atributo"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteAtributo(atributo.id)}
                        className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition"
                        title="Eliminar atributo"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#FAFBFC] rounded-2xl p-4 border border-gray-100">
                    <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2 border-b border-gray-100 mb-3">
                      <div className="col-span-1 text-center">ID</div>
                      <div className="col-span-3">Valor</div>
                      <div className="col-span-2">Color</div>
                      <div className="col-span-3">Imagen</div>
                      <div className="col-span-1 text-center">Orden</div>
                      <div className="col-span-2 text-right">Acciones</div>
                    </div>

                    {atributo.atributovalor.length === 0 ? (
                      <p className="text-sm text-gray-400 px-2 py-4">Este atributo no tiene valores todavía.</p>
                    ) : (
                      atributo.atributovalor.map((valor) => (
                        <div key={valor.id} className="grid grid-cols-12 gap-3 items-center px-2 py-3 border-b border-gray-100 last:border-b-0">
                          <div className="col-span-1 text-center text-xs text-gray-500 font-mono">#{valor.id}</div>
                          <div className="col-span-3 font-medium text-gray-800">{valor.valor}</div>
                          <div className="col-span-2 flex items-center gap-2">
                            {valor.colorHex ? (
                              <>
                                <span className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: valor.colorHex }} />
                                <span className="text-sm text-gray-600">{valor.colorHex}</span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </div>
                          <div className="col-span-3 text-sm text-gray-600 truncate">
                            {valor.imagen ? (
                              <a href={valor.imagen} target="_blank" rel="noreferrer" className="text-[#6BAEC9] hover:underline">
                                Ver imagen
                              </a>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                          <div className="col-span-1 text-center text-sm text-gray-600">{valor.orden}</div>
                          <div className="col-span-2 flex justify-end gap-2">
                            <button
                              onClick={() => handleEditValor(atributo, valor)}
                              className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-500 rounded-lg text-xs font-semibold transition"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteValor(atributo.id, valor.id)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs font-semibold transition"
                            >
                              Borrar
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}