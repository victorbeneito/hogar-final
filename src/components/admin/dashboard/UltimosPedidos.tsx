import Link from "next/link";
import { Eye } from "lucide-react";

interface Pedido {
  id: number;
  numeroPedido: string;
  nombre: string;
  apellidos?: string;
  estado: string;
  totalFinal: number;
  fechaPedido: string;
  pagoMetodo: string;
}

interface UltimosPedidosProps {
  pedidos: Pedido[];
}

const estadoColors: { [key: string]: string } = {
  PENDIENTE: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  PROCESANDO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ENVIADO: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  ENTREGADO: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CANCELADO: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function UltimosPedidos({ pedidos }: UltimosPedidosProps) {
  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Últimos Pedidos
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-gray-500 dark:text-gray-400 font-medium">
                Nº Pedido
              </th>
              <th className="px-4 py-3 text-left text-gray-500 dark:text-gray-400 font-medium">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-gray-500 dark:text-gray-400 font-medium">
                Estado
              </th>
              <th className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-medium">
                Total
              </th>
              <th className="px-4 py-3 text-left text-gray-500 dark:text-gray-400 font-medium">
                Fecha
              </th>
              <th className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 font-medium">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No hay pedidos
                </td>
              </tr>
            ) : (
              pedidos.map((pedido) => (
                <tr
                  key={pedido.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {pedido.numeroPedido}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {pedido.nombre} {pedido.apellidos}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        estadoColors[pedido.estado] ||
                        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {pedido.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                    €{pedido.totalFinal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                    {new Date(pedido.fechaPedido).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/admin/pedidos/${pedido.id}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
