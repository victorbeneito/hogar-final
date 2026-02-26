'use client';
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Cliente {
  id: number;
  nombre: string;
  apellidos: string; // ✅ Correcto
  email: string;
  telefono: string;
}

export default function AdminClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 🔹 Cargar lista de clientes
  const fetchClientes = async (term: string = '') => {
    try {
      setLoading(true);

      const url = term
        ? `/api/clientes?search=${encodeURIComponent(term)}`
        : '/api/clientes';

      const res = await fetch(url, {
        headers: {
            // ✅ UNIFICADO: Usamos adminToken
            Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
        },
      });

      const data = await res.json();
      if (data.ok) {
        setClientes(data.clientes || []);
      } else {
        console.error(data.error);
        setClientes([]);
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  // 🔹 Buscar
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClientes(searchTerm.trim());
  };

  // 🔹 Eliminar cliente
  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este cliente? Esta acción borrará también sus pedidos.')) return;
    
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'DELETE',
        headers: {
          // ✅ CORREGIDO: Antes ponía 'token', ahora 'adminToken' para coincidir
          Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
        },
      });
      
      if (res.ok) {
        fetchClientes(searchTerm); // Recargar lista
      } else {
        alert('⚠️ Error al eliminar cliente');
      }
    } catch (error) {
      console.error('Error eliminando cliente:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-[#4A4A4A] mb-12">
          👥 Panel de Clientes
        </h1>

        {/* Botón volver al panel admin */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] hover:from-[#5FA0B3] hover:to-[#91C8D9] shadow-md transition-all duration-300"
          >
            ← Volver al Panel de Administración
          </button>
        </div>

        {/* 🔍 Cuadro de búsqueda rápida */}
        <form
          onSubmit={handleSearch}
          className="flex flex-wrap items-center gap-4 mb-10"
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, apellidos o email..."
            className="flex-1 min-w-[250px] p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-[#A8D7E6]"
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] text-white font-semibold py-3 px-8 rounded-xl hover:from-[#5FA0B3] hover:to-[#91C8D9] transition-all"
          >
            🔍 Buscar
          </button>
        </form>

        {/* Tabla de clientes */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-[#4A4A4A]">
              Clientes ({clientes.length})
            </h2>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  fetchClientes(); 
                }}
                className="text-sm px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
              >
                ✖ Limpiar búsqueda
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-center py-12 text-gray-500">Cargando...</p>
          ) : clientes.length === 0 ? (
            <p className="text-center py-12 text-gray-500">
              No se encontraron clientes.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">
                      Nombre
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">
                      Teléfono
                    </th>
                    <th className="px-8 py-4 text-right text-sm font-semibold text-gray-900">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/clientes/${cliente.id}`)
                      }
                    >
                      <td className="px-8 py-6 font-medium text-gray-900">
                        {/* ✅ Aquí mostramos nombre y apellidos */}
                        {cliente.nombre} {cliente.apellidos || ''}
                      </td>
                      <td className="px-8 py-6 text-gray-600">
                        {cliente.email}
                      </td>
                      <td className="px-8 py-6 text-gray-600">
                        {cliente.telefono || '—'}
                      </td>
                      <td className="px-8 py-6 text-right space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/clientes/${cliente.id}`);
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Ver
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(cliente.id);
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}