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
  _count?: { varianteatributo: number };
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

function variantesQueUsan(valores: Valor[]) {
  return valores.reduce((total, valor) => total + (valor._count?.varianteatributo ?? 0), 0);
}

function alternarEnLista(lista: number[], id: number) {
  return lista.includes(id) ? lista.filter((item) => item !== id) : [...lista, id];
}

function Casilla({
  checked,
  indeterminate = false,
  onChange,
  title,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  title: string;
}) {
  return (
    <input
      type="checkbox"
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      checked={checked}
      onChange={onChange}
      title={title}
      aria-label={title}
      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#6BAEC9]"
    />
  );
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
  const [atributosSeleccionados, setAtributosSeleccionados] = useState<number[]>([]);
  const [valoresSeleccionados, setValoresSeleccionados] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [eliminando, setEliminando] = useState(false);
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

  // La selección nunca incluye filas ocultas por el buscador: así un borrado
  // masivo solo afecta a lo que se está viendo.
  useEffect(() => {
    const atributoIds = new Set(atributosVisibles.map(({ atributo }) => atributo.id));
    const valorIds = new Set(
      atributosVisibles.flatMap(({ valoresVisibles }) => valoresVisibles.map((valor) => valor.id))
    );
    setAtributosSeleccionados((prev) => {
      const next = prev.filter((id) => atributoIds.has(id));
      return next.length === prev.length ? prev : next;
    });
    setValoresSeleccionados((prev) => {
      const next = prev.filter((id) => valorIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [atributosVisibles]);

  const todosAtributosSeleccionados =
    atributosVisibles.length > 0 && atributosSeleccionados.length === atributosVisibles.length;

  function toggleTodosAtributos() {
    setAtributosSeleccionados(
      todosAtributosSeleccionados ? [] : atributosVisibles.map(({ atributo }) => atributo.id)
    );
  }

  function toggleTodosValores(valores: Valor[]) {
    const ids = valores.map((valor) => valor.id);
    const todos = ids.length > 0 && ids.every((id) => valoresSeleccionados.includes(id));
    setValoresSeleccionados((prev) =>
      todos ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))
    );
  }

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

  async function handleBulkDeleteAtributos() {
    const seleccion = atributos.filter((atributo) => atributosSeleccionados.includes(atributo.id));
    if (seleccion.length === 0) return;

    const totalValores = seleccion.reduce((total, atributo) => total + atributo.atributovalor.length, 0);
    const variantes = seleccion.reduce((total, atributo) => total + variantesQueUsan(atributo.atributovalor), 0);
    const aviso = [
      `¿Eliminar ${seleccion.length} ${seleccion.length === 1 ? "atributo" : "atributos"} y sus ${totalValores} valores?`,
      seleccion.map((atributo) => `• ${atributo.nombre}`).join("\n"),
      variantes > 0 ? `⚠️ Se quitarán de ${variantes} asignaciones en variantes de producto.` : null,
      "Esta acción no se puede deshacer.",
    ]
      .filter(Boolean)
      .join("\n\n");
    if (!confirm(aviso)) return;

    const ids = seleccion.map((atributo) => atributo.id);
    setEliminando(true);
    try {
      const res = await fetch("/api/atributos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudieron eliminar los atributos");

      await fetchAtributos();
      setAtributosSeleccionados([]);
      setAtributosAbiertos((prev) => prev.filter((id) => !ids.includes(id)));
      if (selectedAttributeId !== null && ids.includes(selectedAttributeId)) setSelectedAttributeId(null);
      if (editandoAtributo !== null && ids.includes(editandoAtributo)) {
        setEditandoAtributo(null);
        setAtributoForm(emptyAtributoForm);
      }
      if (editandoValor && ids.includes(editandoValor.atributoId)) {
        setEditandoValor(null);
        setValorForm(emptyValorForm);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setEliminando(false);
    }
  }

  async function handleBulkDeleteValores(atributo: Atributo, valores: Valor[]) {
    const seleccion = valores.filter((valor) => valoresSeleccionados.includes(valor.id));
    if (seleccion.length === 0) return;

    const variantes = variantesQueUsan(seleccion);
    const aviso = [
      `¿Eliminar ${seleccion.length} ${seleccion.length === 1 ? "valor" : "valores"} de ${atributo.nombre}?`,
      variantes > 0 ? `⚠️ Se quitarán de ${variantes} variantes de producto que los usan.` : null,
      "Esta acción no se puede deshacer.",
    ]
      .filter(Boolean)
      .join("\n\n");
    if (!confirm(aviso)) return;

    const ids = seleccion.map((valor) => valor.id);
    setEliminando(true);
    try {
      const res = await fetch(`/api/atributos/${atributo.id}/valores`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudieron eliminar los valores");

      await fetchAtributos();
      setValoresSeleccionados((prev) => prev.filter((id) => !ids.includes(id)));
      if (editandoValor && ids.includes(editandoValor.valorId)) {
        setEditandoValor(null);
        setValorForm(emptyValorForm);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setEliminando(false);
    }
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

            {atributosVisibles.length > 0 && (
              <div
                className={`mt-4 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                  atributosSeleccionados.length > 0 ? "border-red-200 bg-red-50/60" : "border-gray-100 bg-white/60"
                }`}
              >
                <label className="flex cursor-pointer items-center gap-2 font-medium text-gray-600">
                  <Casilla
                    checked={todosAtributosSeleccionados}
                    indeterminate={atributosSeleccionados.length > 0 && !todosAtributosSeleccionados}
                    onChange={toggleTodosAtributos}
                    title="Seleccionar todos los atributos visibles"
                  />
                  {atributosSeleccionados.length > 0
                    ? `${atributosSeleccionados.length} ${atributosSeleccionados.length === 1 ? "atributo seleccionado" : "atributos seleccionados"}`
                    : "Seleccionar atributos"}
                </label>

                {atributosSeleccionados.length > 0 && (
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAtributosSeleccionados([])}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Quitar selección
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDeleteAtributos}
                      disabled={eliminando}
                      className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-600 disabled:opacity-50"
                    >
                      {eliminando ? "⏳ Eliminando..." : `🗑️ Eliminar ${atributosSeleccionados.length}`}
                    </button>
                  </div>
                )}
              </div>
            )}
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
                const atributoMarcado = atributosSeleccionados.includes(atributo.id);
                const valoresMarcados = valoresVisibles.filter((valor) => valoresSeleccionados.includes(valor.id));
                const todosValoresMarcados =
                  valoresVisibles.length > 0 && valoresMarcados.length === valoresVisibles.length;

                return (
                  <div key={atributo.id} className="px-4 py-4 md:px-8 md:py-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex flex-1 items-start gap-3">
                        <div className="pt-6">
                          <Casilla
                            checked={atributoMarcado}
                            onChange={() => setAtributosSeleccionados((prev) => alternarEnLista(prev, atributo.id))}
                            title={`Seleccionar ${atributo.nombre}`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleAtributo(atributo.id)}
                          className={`flex flex-1 items-start gap-4 rounded-2xl border px-4 py-4 text-left transition hover:border-[#6BAEC9]/30 hover:bg-[#F5FBFE] ${
                            atributoMarcado ? "border-red-200 bg-red-50/40" : "border-gray-100 bg-[#FAFBFC]"
                          }`}
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
                      </div>

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
                        {valoresMarcados.length > 0 && (
                          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm">
                            <span className="font-medium text-gray-700">
                              {valoresMarcados.length} {valoresMarcados.length === 1 ? "valor seleccionado" : "valores seleccionados"}
                              {variantesQueUsan(valoresMarcados) > 0 && (
                                <span className="ml-2 text-xs text-red-600">
                                  · usados en {variantesQueUsan(valoresMarcados)} variantes
                                </span>
                              )}
                            </span>
                            <div className="ml-auto flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setValoresSeleccionados((prev) =>
                                    prev.filter((id) => !valoresMarcados.some((valor) => valor.id === id))
                                  )
                                }
                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                              >
                                Quitar selección
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBulkDeleteValores(atributo, valoresVisibles)}
                                disabled={eliminando}
                                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-red-600 disabled:opacity-50"
                              >
                                {eliminando ? "⏳ Eliminando..." : `🗑️ Eliminar ${valoresMarcados.length}`}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="overflow-x-auto">
                          <div className="min-w-[780px]">
                            <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2 border-b border-gray-100 mb-3">
                              <div className="col-span-1 flex items-center justify-center gap-2">
                                {valoresVisibles.length > 0 && (
                                  <Casilla
                                    checked={todosValoresMarcados}
                                    indeterminate={valoresMarcados.length > 0 && !todosValoresMarcados}
                                    onChange={() => toggleTodosValores(valoresVisibles)}
                                    title={`Seleccionar todos los valores de ${atributo.nombre}`}
                                  />
                                )}
                                ID
                              </div>
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

                                const seEstaEditando =
                                  editandoValor?.atributoId === atributo.id && editandoValor?.valorId === valor.id;
                                const valorMarcado = valoresSeleccionados.includes(valor.id);
                                const usos = valor._count?.varianteatributo ?? 0;
                                const fondoFila = valorMarcado
                                  ? "bg-red-50/60"
                                  : seEstaEditando
                                    ? "bg-blue-50/50"
                                    : coincideValorDirecto
                                      ? "bg-amber-50/70"
                                      : "";

                                return (
                                  <div key={valor.id}>
                                    <div
                                      className={`grid grid-cols-12 gap-3 items-center px-2 py-3 border-b border-gray-100 rounded-xl ${fondoFila}`}
                                    >
                                      <label className="col-span-1 flex cursor-pointer items-center justify-center gap-2 text-xs text-gray-500 font-mono">
                                        <Casilla
                                          checked={valorMarcado}
                                          onChange={() => setValoresSeleccionados((prev) => alternarEnLista(prev, valor.id))}
                                          title={`Seleccionar ${valor.valor}`}
                                        />
                                        #{valor.id}
                                      </label>
                                      <div className="col-span-3">
                                        <div className="font-medium text-gray-800">{valor.valor}</div>
                                        <div className="text-xs text-gray-400">
                                          {usos > 0 ? `En ${usos} ${usos === 1 ? "variante" : "variantes"}` : "Sin uso en variantes"}
                                        </div>
                                      </div>
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
                                      <div className="col-span-3 flex items-center gap-2">
                                        {valor.imagen ? (
                                          <>
                                            <div className="w-10 h-10 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                                              <img src={valor.imagen} alt={valor.valor} className="w-full h-full object-contain p-1" />
                                            </div>
                                            <a href={valor.imagen} target="_blank" rel="noreferrer" className="text-[#6BAEC9] hover:underline text-sm truncate">
                                              Ver imagen
                                            </a>
                                          </>
                                        ) : (
                                          <span className="text-sm text-gray-400">—</span>
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

                                    {seEstaEditando && (
                                      <div className="border-b border-gray-100 bg-white px-2 py-4 md:px-4">
                                        <form onSubmit={handleSubmitValor} className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-5">
                                          <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-gray-700">✏️ Editando valor</h3>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditandoValor(null);
                                                setValorForm(emptyValorForm);
                                              }}
                                              className="text-gray-400 hover:text-gray-600"
                                            >
                                              <X className="h-4 w-4" />
                                            </button>
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
                                              <label className="block text-sm font-medium text-gray-600 mb-1">Orden</label>
                                              <input
                                                type="number"
                                                min="0"
                                                value={valorForm.orden}
                                                onChange={(e) => setValorForm((prev) => ({ ...prev, orden: parseInt(e.target.value) || 0 }))}
                                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                                              />
                                            </div>
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

                                          <div className="flex gap-3 pt-2 border-t border-gray-200">
                                            <button
                                              type="submit"
                                              disabled={loading}
                                              className="bg-[#6BAEC9] hover:bg-[#5FA0B3] text-white px-6 py-2.5 rounded-xl font-semibold shadow transition disabled:opacity-50 text-sm"
                                            >
                                              {loading ? "⏳ Guardando..." : "✏️ Actualizar valor"}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditandoValor(null);
                                                setValorForm(emptyValorForm);
                                              }}
                                              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition text-sm"
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        </form>
                                      </div>
                                    )}
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
