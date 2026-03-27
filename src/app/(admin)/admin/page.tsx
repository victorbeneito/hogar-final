"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProductosPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch("/api/admin/productos?limit=20&page=1")
      .then(r => r.json())
      .then(data => {
        setProductos(data.productos ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Productos <span className="text-sm font-normal text-gray-400">({total})</span>
        </h1>
        <Link
          href="/admin/productos/nuevo"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Nuevo producto
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : productos.length === 0 ? (
        <p className="text-gray-400 text-sm">No hay productos todavía.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Referencia</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-center">Activo</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productos.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">#{p.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{p.referencia ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{p.precio.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-right">{p.stock}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${p.activo ? "bg-green-500" : "bg-red-400"}`} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/admin/productos/${p.id}`} className="text-blue-600 hover:underline text-xs">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
