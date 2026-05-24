'use client';
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";

// ✅ CAMBIO 1: ID ahora es number y logo_url pasa a ser imagen (según tu DB)
interface Marca {
  id: number;
  nombre: string;
  descripcion?: string;
  imagen?: string; 
}

export default function AdminMarcas() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  
  // ✅ CAMBIO 2: Usamos 'imagen' en el estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    imagen: '' 
  });
  
  // ✅ CAMBIO 3: El estado de edición ahora espera un número o null
  const [editando, setEditando] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchMarcas();
  }, []);

  const fetchMarcas = async () => {
    try {
      const res = await fetch('/api/marcas');
      const data = await res.json();
      setMarcas(data.marcas || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const method = editando ? 'PUT' : 'POST';
      const url = editando ? `/api/marcas/${editando}` : '/api/marcas';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        fetchMarcas();
        setFormData({ nombre: '', descripcion: '', imagen: '' });
        setEditando(null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (marca: Marca) => {
    setFormData({
      nombre: marca.nombre,
      descripcion: marca.descripcion || '',
      imagen: marca.imagen || '' // ✅ Usamos imagen
    });
    setEditando(marca.id);
  };

  // ✅ CAMBIO 4: La función recibe un number
  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar esta marca?')) {
      try {
        await fetch(`/api/marcas/${id}`, { method: 'DELETE' });
        fetchMarcas();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-[#4A4A4A] mb-12">🏪 Marcas</h1>

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
          <h2 className="text-2xl font-bold text-[#4A4A4A] mb-6">
            {editando ? '✏️ Editar Marca' : '➕ Nueva Marca'}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-lg font-semibold text-[#4A4A4A] mb-3">Nombre *</label>
              <input
                name="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                placeholder="Nike, Adidas, etc."
                className="w-full p-4 border border-[#DDC9A3]/50 rounded-2xl focus:ring-4 focus:ring-[#6BAEC9]/20 text-lg"
                required
              />
            </div>
            
            <div className="lg:col-span-2">
              <label className="block text-lg font-semibold text-[#4A4A4A] mb-3">Descripción</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                rows={3}
                placeholder="Descripción de la marca..."
                className="w-full p-4 border border-[#DDC9A3]/50 rounded-2xl focus:ring-4 focus:ring-[#6BAEC9]/20 text-lg resize-vertical"
              />
            </div>
            
            <div>
              <label className="block text-lg font-semibold text-[#4A4A4A] mb-3">URL de la Imagen</label>
              <input
                name="imagen"
                value={formData.imagen}
                onChange={(e) => setFormData({...formData, imagen: e.target.value})}
                placeholder="https://ejemplo.com/logo.png"
                className="w-full p-4 border border-[#DDC9A3]/50 rounded-2xl focus:ring-4 focus:ring-[#6BAEC9]/20 text-lg"
              />
            </div>
            
            <div className="lg:col-span-3 flex gap-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] text-white py-4 px-8 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
              >
                {loading ? '⏳ Guardando...' : (editando ? '✏️ Actualizar' : '➕ Crear Marca')}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={() => {
                    setEditando(null);
                    setFormData({ nombre: '', descripcion: '', imagen: '' });
                  }}
                  className="px-12 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-2xl font-semibold transition-all"
                >
                  ❌ Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* LISTA MARCAS */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#6BAEC9]/10">
          <div className="px-8 py-6 bg-gradient-to-r from-[#6BAEC9]/5 to-[#A8D7E6]/5 border-b">
            <h2 className="text-2xl font-bold text-[#4A4A4A]">
              Marcas ({marcas.length})
            </h2>
          </div>
          
          <div className="divide-y divide-[#F8F8F5]/50">
            {marcas.length === 0 ? (
              <div className="p-16 text-center">
                <div className="text-7xl mb-6 text-gray-200">🏪</div>
                <h3 className="text-2xl font-bold text-[#4A4A4A] mb-2">No hay marcas</h3>
                <p className="text-gray-500 text-lg">¡Crea la primera marca arriba!</p>
              </div>
            ) : (
              marcas.map((marca) => (
                <div key={marca.id} className="px-8 py-8 hover:bg-[#F8F8F5] transition-colors group">
                  <div className="flex items-start lg:items-center gap-6">
                    {/* LOGO */}
                    <div className="flex-shrink-0">
                      {marca.imagen ? (
                        <img 
                          src={marca.imagen} 
                          alt={marca.nombre}
                          className="w-20 h-20 rounded-2xl object-cover shadow-lg border-4 border-[#F8F8F5]"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-logo.png';
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-[#6BAEC9] to-[#A8D7E6] rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl font-bold text-white">{marca.nombre.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* INFO */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold text-[#4A4A4A] mb-2 truncate">{marca.nombre}</h3>
                      {marca.descripcion && (
                        <p className="text-lg text-[#6BAEC9] mb-1 line-clamp-2">{marca.descripcion}</p>
                      )}
                      {/* ✅ CAMBIO 5: Quitamos el .slice() */}
                      <p className="text-sm text-[#DDC9A3] font-mono">ID: #{marca.id}</p>
                    </div>
                    
                    {/* ACCIONES */}
                    <div className="flex gap-3 ml-auto">
                      <button
                        onClick={() => handleEdit(marca)}
                        className="p-3 bg-[#F7A38B]/10 hover:bg-[#F7A38B]/20 text-[#F7A38B] rounded-2xl hover:scale-110 transition-all shadow-md group-hover:shadow-lg"
                        title="Editar marca"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(marca.id)}
                        className="p-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-2xl hover:scale-110 transition-all shadow-md group-hover:shadow-lg"
                        title="Eliminar marca"
                      >
                        🗑️
                      </button>
                    </div>
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