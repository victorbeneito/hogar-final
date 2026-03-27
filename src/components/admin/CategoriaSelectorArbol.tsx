"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown, Check } from "lucide-react";

type Categoria = {
  id: number;
  nombre: string;
  parentId: number | null;
  hijos?: Categoria[];
};

type Props = {
  categorias: Categoria[];
  selectedId: number | null;
  onChange: (id: number) => void;
};

function buildTree(cats: Categoria[]): Categoria[] {
  const map: Record<number, Categoria> = {};
  cats.forEach((c) => (map[c.id] = { ...c, hijos: [] }));
  const roots: Categoria[] = [];
  cats.forEach((c) => {
    if (c.parentId && map[c.parentId]) {
      map[c.parentId].hijos!.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });
  return roots;
}

function NodoCategoria({ nodo, selectedId, onChange, nivel = 0 }: {
  nodo: Categoria; selectedId: number | null; onChange: (id: number) => void; nivel?: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const tieneHijos = nodo.hijos && nodo.hijos.length > 0;
  const seleccionado = selectedId === nodo.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer text-sm transition ${
          seleccionado ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"
        }`}
        style={{ paddingLeft: `${nivel * 16 + 8}px` }}
      >
        <span
          className="w-4 h-4 flex items-center justify-center text-gray-400"
          onClick={() => tieneHijos && setAbierto(!abierto)}
        >
          {tieneHijos ? (abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
        </span>
        <span className="flex-1" onClick={() => onChange(nodo.id)}>
          {nodo.nombre}
        </span>
        {seleccionado && <Check size={14} className="text-blue-600" />}
      </div>
      {abierto && tieneHijos && nodo.hijos!.map((hijo) => (
        <NodoCategoria key={hijo.id} nodo={hijo} selectedId={selectedId} onChange={onChange} nivel={nivel + 1} />
      ))}
    </div>
  );
}

export default function CategoriaSelectorArbol({ categorias, selectedId, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const tree = buildTree(categorias);
  const seleccionada = categorias.find((c) => c.id === selectedId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 transition"
      >
        <span className={seleccionada ? "text-gray-800" : "text-gray-400"}>
          {seleccionada ? seleccionada.nombre : "Selecciona una categoría..."}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>
      {abierto && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {tree.map((nodo) => (
            <NodoCategoria
              key={nodo.id}
              nodo={nodo}
              selectedId={selectedId}
              onChange={(id) => { onChange(id); setAbierto(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
