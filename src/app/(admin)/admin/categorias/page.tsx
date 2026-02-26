'use client';
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";

interface Categoria {
  id: number;
  nombre: string;
}

export default function AdminCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const res = await fetch('/api/categorias');
      const data = await res.json();
      setCategorias(data.categorias || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const method = editando ? 'PUT' : 'POST';
      const url = editando ? `/api/categorias/${editando}` : '/api/categorias';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaCategoria })
      });

      if (res.ok) {
        fetchCategorias();
        setNuevaCategoria('');
        setEditando(null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (categoria: Categoria) => {
    setNuevaCategoria(categoria.nombre);
    setEditando(categoria.id);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar esta categoría?')) {
      try {
        await fetch(`/api/categorias/${id}`, { method: 'DELETE' });
        fetchCategorias();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-[#4A4A4A] mb-12">🏷️ Categorías</h1>
        {/* Botón volver al panel de administración */}
<div className="mb-12">
  <button
    onClick={() => router.push("/admin")}
    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] hover:from-[#5FA0B3] hover:to-[#91C8D9] shadow-md transition-all duration-300"
  >
    ← Volver al Panel de Administración
  </button>
</div>

        
        {/* FORMULARIO */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 border border-[#6BAEC9]/10">
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-lg font-semibold text-[#4A4A4A] mb-3">
                {editando ? 'Editar Categoría' : 'Nueva Categoría'}
              </label>
              <input
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                placeholder="Nombre de la categoría"
                className="w-full p-4 border border-[#DDC9A3]/50 rounded-2xl text-lg focus:ring-4 focus:ring-[#6BAEC9]/20 focus:border-[#6BAEC9] transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#6BAEC9] hover:bg-[#A8D7E6] text-white px-10 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all whitespace-nowrap disabled:opacity-50"
            >
              {loading ? '⏳ Guardando...' : (editando ? '✏️ Actualizar' : '➕ Crear')}
            </button>
            {editando && (
              <button
                type="button"
                onClick={() => {
                  setEditando(null);
                  setNuevaCategoria('');
                }}
                className="px-10 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-2xl font-semibold transition-all"
              >
                ❌ Cancelar
              </button>
            )}
          </form>
        </div>

        {/* LISTA CATEGORÍAS */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#6BAEC9]/10">
          <div className="px-8 py-6 bg-gradient-to-r from-[#6BAEC9]/5 to-[#A8D7E6]/5 border-b">
            <h2 className="text-2xl font-bold text-[#4A4A4A]">
              Categorías ({categorias.length})
            </h2>
          </div>
          
          <div className="divide-y divide-[#F8F8F5]/50">
            {categorias.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-6 text-gray-300">🏷️</div>
                <h3 className="text-2xl font-bold text-[#4A4A4A] mb-2">No hay categorías</h3>
                <p className="text-gray-500">Crea la primera categoría arriba</p>
              </div>
            ) : (
              categorias.map((categoria) => (
                <div key={categoria.id} className="px-8 py-6 hover:bg-[#F8F8F5] transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#6BAEC9] to-[#A8D7E6] rounded-xl flex items-center justify-center shadow-md">
                      <span className="text-xl font-bold text-white">{categoria.nombre.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#4A4A4A]">{categoria.nombre}</h3>
                      <p className="text-sm text-[#6BAEC9]">ID: {categoria.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEdit(categoria)}
                      className="p-3 bg-[#F7A38B]/10 hover:bg-[#F7A38B]/20 text-[#F7A38B] rounded-xl hover:scale-105 transition-all shadow-md"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(categoria.id)}
                      className="p-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl hover:scale-105 transition-all shadow-md"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
