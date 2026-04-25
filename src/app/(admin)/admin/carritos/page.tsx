"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type CartRow = {
  id: number;
  sessionId: string;
  clienteId: number | null;
  cliente: { id: number; nombre: string; email: string; telefono: string } | null;
  total: number;
  totalItems: number;
  estado: "activo" | "abandonado" | "convertido";
  createdAt: string | null;
  updatedAt: string | null;
  pedido: { id: number; numeroPedido: string; estado: string; totalFinal: number } | null;
};

const estadoClass: Record<CartRow["estado"], string> = {
  activo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  abandonado: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  convertido: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

export default function CarritosAdminPage() {
  const router = useRouter();
  const [carritos, setCarritos] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");

  const cargarCarritos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (estado) params.set("estado", estado);
      const res = await fetch(`/api/carritos?${params.toString()}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se han podido cargar los carritos");
      setCarritos(data.carritos || []);
    } catch (error: any) {
      toast.error(error.message || "Error cargando carritos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarCarritos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumen = useMemo(() => {
    return {
      total: carritos.length,
      abandonados: carritos.filter((cart) => cart.estado === "abandonado").length,
      convertidos: carritos.filter((cart) => cart.estado === "convertido").length,
    };
  }, [carritos]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Carritos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control de carritos activos, abandonados y convertidos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void cargarCarritos()}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg text-sm font-semibold text-gray-700 dark:text-gray-200"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-4">
          <div className="text-xs uppercase tracking-wider text-gray-400">Total</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{resumen.total}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-4">
          <div className="text-xs uppercase tracking-wider text-gray-400">Abandonados</div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-300">{resumen.abandonados}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-4">
          <div className="text-xs uppercase tracking-wider text-gray-400">Convertidos</div>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-300">{resumen.convertidos}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void cargarCarritos()}
          placeholder="Buscar por sesión, cliente o email..."
          className="w-full md:max-w-xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-3 text-sm text-gray-900 dark:text-white"
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="w-full md:w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg px-4 py-3 text-sm text-gray-900 dark:text-white"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="abandonado">Abandonados</option>
          <option value="convertido">Convertidos</option>
        </select>
        <button
          onClick={() => void cargarCarritos()}
          className="w-full md:w-auto px-5 py-3 rounded-xl bg-primary text-white font-semibold text-sm"
        >
          Filtrar
        </button>
      </div>

      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">Cargando carritos...</div>
        ) : carritos.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">No hay carritos para mostrar.</div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Items</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Actualizado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {carritos.map((cart) => (
                    <tr key={cart.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">#{cart.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {cart.cliente?.nombre || "Cliente no identificado"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{cart.cliente?.email || cart.sessionId}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{cart.total.toFixed(2)} €</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{cart.totalItems}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${estadoClass[cart.estado]}`}>
                          {cart.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {cart.updatedAt ? new Date(cart.updatedAt).toLocaleString("es-ES") : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/carritos/${cart.id}`}
                          className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800 lg:hidden">
              {carritos.map((cart) => (
                <div key={cart.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">#{cart.id}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {cart.cliente?.nombre || "Cliente no identificado"}
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${estadoClass[cart.estado]}`}>
                      {cart.estado}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                      <div className="text-xs uppercase text-gray-400">Total</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{cart.total.toFixed(2)} €</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                      <div className="text-xs uppercase text-gray-400">Items</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{cart.totalItems}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between gap-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {cart.updatedAt ? new Date(cart.updatedAt).toLocaleString("es-ES") : ""}
                    </div>
                    <Link
                      href={`/admin/carritos/${cart.id}`}
                      className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                    >
                      Ver carrito
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
