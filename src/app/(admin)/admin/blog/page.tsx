"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, RefreshCw, ExternalLink } from "lucide-react";

type Articulo = {
  id: number;
  titulo: string;
  slug: string;
  extracto: string | null;
  imagenPortada: string | null;
  autor: string;
  activo: boolean;
  destacado: boolean;
  etiquetas: string | null;
  vistas: number;
  fechaPublicacion: string;
  createdAt: string;
};

export default function BlogAdminPage() {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");

  async function cargar() {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/blog/articulos?limit=50&q=${encodeURIComponent(busqueda)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await res.json();
      if (data.ok) setArticulos(data.articulos);
    } catch {
      toast.error("Error cargando artículos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [busqueda]);

  async function eliminar(id: number, titulo: string) {
    if (!confirm(`¿Eliminar el artículo "${titulo}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(id);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/blog/articulos/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Artículo eliminado");
        setArticulos((prev) => prev.filter((a) => a.id !== id));
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Error eliminando artículo");
    } finally {
      setEliminando(null);
    }
  }

  async function toggleActivo(articulo: Articulo) {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/blog/articulos/${articulo.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ ...articulo, activo: !articulo.activo }),
      });
      const data = await res.json();
      if (data.ok) {
        setArticulos((prev) => prev.map((a) => (a.id === articulo.id ? { ...a, activo: !a.activo } : a)));
        toast.success(articulo.activo ? "Artículo desactivado" : "Artículo publicado");
      }
    } catch {
      toast.error("Error actualizando estado");
    }
  }

  const articulosFiltrados = articulos.filter((a) =>
    busqueda === "" || a.titulo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog de tu Hogar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {articulos.length} artículo{articulos.length !== 1 ? "s" : ""} en total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={cargar}
            title="Recargar"
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/admin/blog/nuevo"
            className="flex items-center gap-2 px-4 py-2 bg-[#3498db] text-white rounded-lg hover:bg-[#2980b9] transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo artículo
          </Link>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar artículos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full sm:w-96 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] text-sm"
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando artículos...</div>
      ) : articulosFiltrados.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">No hay artículos todavía</p>
          <Link
            href="/admin/blog/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3498db] text-white rounded-lg hover:bg-[#2980b9] text-sm"
          >
            <Plus className="w-4 h-4" /> Crear el primer artículo
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Artículo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Autor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Vistas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {articulosFiltrados.map((articulo) => (
                  <tr key={articulo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {articulo.imagenPortada ? (
                          <img
                            src={articulo.imagenPortada}
                            alt=""
                            className="w-12 h-10 object-cover rounded-lg flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">
                            📝
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                            {articulo.titulo}
                          </p>
                          {articulo.extracto && (
                            <p className="text-xs text-gray-400 truncate max-w-xs">{articulo.extracto}</p>
                          )}
                          {articulo.destacado && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-amber-600">
                              <Star className="w-3 h-3" /> Destacado
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 hidden md:table-cell whitespace-nowrap">
                      {articulo.autor}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden lg:table-cell whitespace-nowrap text-xs">
                      {new Date(articulo.fechaPublicacion).toLocaleDateString("es-ES", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {articulo.vistas.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActivo(articulo)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          articulo.activo
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {articulo.activo ? (
                          <><Eye className="w-3 h-3" /> Publicado</>
                        ) : (
                          <><EyeOff className="w-3 h-3" /> Borrador</>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {articulo.activo && (
                          <a
                            href={`/blog/${articulo.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-[#3498db] transition-colors"
                            title="Ver en tienda"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <Link
                          href={`/admin/blog/${articulo.id}`}
                          className="p-1.5 text-gray-400 hover:text-[#3498db] transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => eliminar(articulo.id, articulo.titulo)}
                          disabled={eliminando === articulo.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
