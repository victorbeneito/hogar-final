"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Cliente {
  id: number;
  nombre: string;
  apellidos?: string | null;
  email: string;
  telefono?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  empresa?: string | null;
  activo?: boolean;
}

export default function AdminClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchClientes = async (term: string = "") => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("adminToken") || "";
      const url = term ? `/api/clientes?search=${encodeURIComponent(term)}` : "/api/clientes";

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudieron cargar los clientes");
      }

      setClientes(data.clientes || []);
    } catch (err: any) {
      setClientes([]);
      setError(err.message || "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchClientes(searchTerm.trim());
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este cliente? Esta acción borrará también sus pedidos.")) return;

    const token = localStorage.getItem("adminToken") || "";
    const res = await fetch(`/api/clientes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      alert(data.error || "Error al eliminar cliente");
      return;
    }

    fetchClientes(searchTerm);
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#4A4A4A]">👥 Panel de Clientes</h1>
            <p className="text-sm text-gray-500 mt-2">Gestiona el perfil, las direcciones y los pedidos de cada cliente.</p>
          </div>
          <Link
            href="/admin/clientes/nuevo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-[#6BAEC9] hover:bg-[#5FA0B3] shadow-md transition-all"
          >
            + Nuevo cliente
          </Link>
        </div>

        <div className="mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] hover:from-[#5FA0B3] hover:to-[#91C8D9] shadow-md transition-all duration-300"
          >
            ← Volver al Panel de Administración
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4 mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, apellidos, email o teléfono..."
            className="flex-1 min-w-[250px] p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-[#A8D7E6]"
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] text-white font-semibold py-3 px-8 rounded-xl hover:from-[#5FA0B3] hover:to-[#91C8D9] transition-all"
          >
            🔍 Buscar
          </button>
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                fetchClientes();
              }}
              className="text-sm px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
            >
              ✖ Limpiar
            </button>
          )}
        </form>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-[#4A4A4A]">Clientes ({clientes.length})</h2>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          ) : loading ? (
            <p className="text-center py-12 text-gray-500">Cargando...</p>
          ) : clientes.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-500 mb-4">
                No se encontraron clientes.
              </p>
              <Link
                href="/admin/clientes/nuevo"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white bg-[#6BAEC9] hover:bg-[#5FA0B3]"
              >
                Crear primer cliente
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">Cliente</th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">Contacto</th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">Estado</th>
                    <th className="px-8 py-4 text-right text-sm font-semibold text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/admin/clientes/${cliente.id}`)}
                    >
                      <td className="px-8 py-6">
                        <div className="font-medium text-gray-900">
                          {cliente.nombre} {cliente.apellidos || ""}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">ID {cliente.id}</div>
                      </td>
                      <td className="px-8 py-6 text-gray-600">
                        <div>{cliente.email}</div>
                        <div>{cliente.telefono || "—"}</div>
                      </td>
                      <td className="px-8 py-6 text-gray-600">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${cliente.activo === false ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {cliente.activo === false ? "Inactivo" : "Activo"}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/clientes/${cliente.id}`);
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Ver ficha
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
