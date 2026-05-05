"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { ATRIBUTO_TIPOS, getAtributoTipoLabel, type AtributoTipo } from "@/lib/atributoTipo";

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
  tipo: AtributoTipo;
  orden: number;
  atributovalor: Valor[];
};

type AtributoForm = {
  nombre: string;
  tipo: AtributoTipo;
  orden: number;
};

type ValorForm = {
  valor: string;
  colorHex: string;
  imagen: string;
  orden: number;
};

type AtributoVista = {
  atributo: Atributo;
  valoresVisibles: Valor[];
  coincideAtributo: boolean;
};

const emptyAtributoForm: AtributoForm = { nombre: "", tipo: "desplegable", orden: 0 };
const emptyValorForm: ValorForm = { valor: "", colorHex: "", imagen: "", orden: 0 };

function normalizarTexto(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function contieneTexto(value: unknown, query: string) {
  if (!query) return false;
  return normalizarTexto(value).includes(query);
}

export default function AdminAtributosPage() {
  const [atributos, setAtributos] = useState<Atributo[]>([]);
  const [atributoForm, setAtributoForm] = useState<AtributoForm>(emptyAtributoForm);
  const [valorForm, setValorForm] = useState<ValorForm>(emptyValorForm);
  const [editandoAtributo, setEditandoAtributo] = useState<number | null>(null);
  const [editandoValor, setEditandoValor] = useState<{ atributoId: number; valorId: number } | null>(null);
  const [selectedAttributeId, setSelectedAttributeId] = useState<number | null>(null);
  const [busquedaValores, setBusquedaValores] = useState("");
  const [atributosAbiertos, setAtributosAbiertos] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function loadImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });
  }

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

  const terminoBusqueda = useMemo(() => normalizarTexto(busquedaValores), [busquedaValores]);

  const atributosVisibles = useMemo<AtributoVista[]>(() => {
    if (!terminoBusqueda) {
      return atributos.map((atributo) => ({
        atributo,
        valoresVisibles: atributo.atributovalor,
        coincideAtributo: true,
      }));
    }

    return atributos.flatMap((atributo) => {
      const coincideAtributo =
        contieneTexto(atributo.nombre, terminoBusqueda) ||
        contieneTexto(getAtributoTipoLabel(atributo.tipo), terminoBusqueda) ||
        contieneTexto(atributo.id, terminoBusqueda);

      const valoresCoincidentes = atributo.atributovalor.filter((valor) => {
        return (
          contieneTexto(valor.valor, terminoBusqueda) ||
          contieneTexto(valor.colorHex, terminoBusqueda) ||
          contieneTexto(valor.imagen, terminoBusqueda) ||
          contieneTexto(valor.id, terminoBusqueda) ||
          contieneTexto(valor.orden, terminoBusqueda)
        );
      });

      if (!coincideAtributo && valoresCoincidentes.length === 0) {
        return [];
      }

      return [
        {
          atributo,
          valoresVisibles: coincideAtributo ? atributo.atributovalor : valoresCoincidentes,
          coincideAtributo,
        },
      ];
    });
  }, [atributos, terminoBusqueda]);

  const totalValoresVisibles = useMemo(
    () => atributosVisibles.reduce((total, item) => total + item.valoresVisibles.length, 0),
    [atributosVisibles]
  );

  useEffect(() => {
    if (!terminoBusqueda) return;

    setAtributosAbiertos((prev) => {
      const merged = new Set(prev);
      let changed = false;

      atributosVisibles.forEach(({ atributo }) => {
        if (!merged.has(atributo.id)) {
          merged.add(atributo.id);
          changed = true;
        }
      });

      return changed ? Array.from(merged) : prev;
    });
  }, [atributosVisibles, terminoBusqueda]);

  function toggleAtributo(id: number) {
    setAtributosAbiertos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function expandirTodo() {
    setAtributosAbiertos(atributosVisibles.map(({ atributo }) => atributo.id));
  }

  function contraerTodo() {
    setAtributosAbiertos([]);
  }

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

  async function handleValorImageFile(file: File | null) {
    if (!file) return;
    const image = await loadImageFile(file);
    setValorForm((prev) => ({ ...prev, imagen: image }));
  }

  function handleEditAtributo(atributo: Atributo) {
    setAtributoForm({ nombre: atributo.nombre, tipo: atributo.tipo ?? "desplegable", orden: atributo.orden });
    setEditandoAtributo(atributo.id);
    setAtributosAbiertos((prev) => (prev.includes(atributo.id) ? prev : [...prev, atributo.id]));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleEditValor(atributo: Atributo, valor: Valor) {
    setSelectedAttributeId(atributo.id);
    setAtributosAbiertos((prev) => (prev.includes(atributo.id) ? prev : [...prev, atributo.id]));
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
    setAtributosAbiertos((prev) => prev.filter((item) => item !== id));
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tipo</label>
                  <select
                    value={atributoForm.tipo}
                    onChange={(e) => setAtributoForm((prev) => ({ ...prev, tipo: e.target.value as AtributoTipo }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition bg-white"
                  >
                    {ATRIBUTO_TIPOS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                  <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                    <input
                      value={valorForm.imagen}
                      onChange={(e) => setValorForm((prev) => ({ ...prev, imagen: e.target.value }))}
                      placeholder="URL de la imagen o pega una data URL"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition bg-white"
                    />
                    <label className="block text-xs font-medium text-gray-500">O subir archivo desde el ordenador</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleValorImageFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-[#6BAEC9] file:px-4 file:py-2 file:text-white file:font-semibold hover:file:opacity-90"
                    />
                    <div className="flex items-start gap-3">
                      {valorForm.imagen ? (
                        <div className="w-20 h-20 rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                          <img src={valorForm.imagen} alt="Vista previa" className="w-full h-full object-contain p-2" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center text-[11px] text-gray-400 flex-shrink-0 text-center px-2">
                          Sin imagen
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-xs text-gray-500">
                          Puedes usar una URL o subir un archivo. Si subes archivo, se guardará dentro del valor como imagen embebida.
                        </p>
                        {valorForm.imagen && (
                          <button
                            type="button"
                            onClick={() => setValorForm((prev) => ({ ...prev, imagen: "" }))}
                            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                          >
                            Quitar imagen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#4A4A4A]">
                  Atributos ({atributosVisibles.length}
                  {terminoBusqueda ? ` de ${atributos.length}` : ""})
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Pulsa sobre un atributo para desplegar o comprimir sus valores.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={expandirTodo}
                  className="px-4 py-2 rounded-xl border border-[#6BAEC9]/20 bg-white text-sm font-semibold text-[#4A4A4A] hover:bg-[#6BAEC9]/5 transition"
                >
                  Expandir todo
                </button>
                <button
                  type="button"
                  onClick={contraerTodo}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Contraer todo
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={busquedaValores}
                    onChange={(e) => setBusquedaValores(e.target.value)}
                    placeholder="Buscar atributo, valor, color, #hex, imagen o ID"
                    className="w-full rounded-xl border border-gray-200 bg-white pl-11 pr-11 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#6BAEC9] focus:ring-2 focus:ring-[#6BAEC9]/20"
                  />
                  {busquedaValores && (
                    <button
                      type="button"
                      onClick={() => setBusquedaValores("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 xl:whitespace-nowrap">
                  <SlidersHorizontal className="h-4 w-4 text-[#6BAEC9]" />
                  <span>{totalValoresVisibles} valores visibles</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">{atributos.length} atributos totales</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">{totalValoresVisibles} valores mostrados</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">{atributosAbiertos.length} desplegados</span>
                {terminoBusqueda && (
                  <span className="rounded-full bg-[#6BAEC9]/10 px-3 py-1 font-medium text-[#4F87A0]">
                    Filtro: “{busquedaValores}”
                  </span>
                )}
              </div>
            </div>
          </div>

          {atributos.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="text-5xl mb-4">🎨</div>
              <p className="text-lg font-semibold">No hay atributos todavía</p>
            </div>
          ) : atributosVisibles.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="text-5xl mb-4">🔎</div>
              <p className="text-lg font-semibold">No hay coincidencias</p>
              <p className="mt-2 text-sm">Prueba con otro valor, color o nombre de atributo.</p>
              <button
                type="button"
                onClick={() => setBusquedaValores("")}
                className="mt-5 rounded-xl bg-[#6BAEC9] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#5FA0B3]"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {atributosVisibles.map(({ atributo, valoresVisibles, coincideAtributo }) => {
                const abierto = atributosAbiertos.includes(atributo.id);

                return (
                  <div key={atributo.id} className="px-4 py-4 md:px-8 md:py-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <button
                        type="button"
                        onClick={() => toggleAtributo(atributo.id)}
                        className="flex flex-1 items-start gap-4 rounded-2xl border border-gray-100 bg-[#FAFBFC] px-4 py-4 text-left transition hover:border-[#6BAEC9]/30 hover:bg-[#F5FBFE]"
                      >
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#6BAEC9] shadow-sm ring-1 ring-gray-100">
                          {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg md:text-xl font-bold text-[#4A4A4A]">{atributo.nombre}</h3>
                            <span className="text-xs text-gray-400 font-mono">ID: #{atributo.id}</span>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              {getAtributoTipoLabel(atributo.tipo)}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                              Orden: {atributo.orden}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {valoresVisibles.length} valores
                            </span>
                            {terminoBusqueda && coincideAtributo && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                Coincide por nombre
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {abierto ? "Pulsa para comprimir esta sección." : "Pulsa para ver todos los valores de este atributo."}
                          </p>
                        </div>
                      </button>

                      <div className="flex gap-2 self-start lg:pt-1">
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

                    {abierto && (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
                        <div className="overflow-x-auto">
                          <div className="min-w-[780px]">
                            <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2 border-b border-gray-100 mb-3">
                              <div className="col-span-1 text-center">ID</div>
                              <div className="col-span-3">Valor</div>
                              <div className="col-span-2">Color</div>
                              <div className="col-span-3">Imagen</div>
                              <div className="col-span-1 text-center">Orden</div>
                              <div className="col-span-2 text-right">Acciones</div>
                            </div>

                            {valoresVisibles.length === 0 ? (
                              <p className="text-sm text-gray-400 px-2 py-4">
                                {terminoBusqueda ? "No hay valores que coincidan con ese filtro." : "Este atributo no tiene valores todavía."}
                              </p>
                            ) : (
                              valoresVisibles.map((valor) => {
                                const coincideValorDirecto =
                                  terminoBusqueda &&
                                  (contieneTexto(valor.valor, terminoBusqueda) ||
                                    contieneTexto(valor.colorHex, terminoBusqueda) ||
                                    contieneTexto(valor.imagen, terminoBusqueda) ||
                                    contieneTexto(valor.id, terminoBusqueda) ||
                                    contieneTexto(valor.orden, terminoBusqueda));

                                return (
                                  <div
                                    key={valor.id}
                                    className={`grid grid-cols-12 gap-3 items-center px-2 py-3 border-b border-gray-100 last:border-b-0 rounded-xl ${coincideValorDirecto ? "bg-amber-50/70" : ""}`}
                                  >
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
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}