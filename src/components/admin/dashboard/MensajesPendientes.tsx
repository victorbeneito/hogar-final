import Link from "next/link";
import { MessageCircle, ChevronRight } from "lucide-react";

interface Mensaje {
  id: number;
  pedidoId: number;
  autor: string;
  autorNombre?: string;
  mensaje: string;
  privado: boolean;
  createdAt: string;
  pedido: {
    id: number;
    numeroPedido: string;
    nombre: string;
    apellidos: string;
  };
}

interface MensajesPendientesProps {
  mensajes: Mensaje[];
  total: number;
}

export default function MensajesPendientes({ mensajes, total }: MensajesPendientesProps) {
  const truncateMessage = (msg: string, length: number = 50) => {
    return msg.length > length ? msg.substring(0, length) + "..." : msg;
  };

  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Mensajes de Clientes
        </h3>
        {total > 0 && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold">
            {total}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {mensajes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Sin mensajes nuevos</p>
          </div>
        ) : (
          mensajes.map((msg) => (
            <Link
              key={msg.id}
              href={`/admin/pedidos/${msg.pedido.id}`}
              className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {msg.pedido.numeroPedido}
                    </p>
                    <span className="text-xs text-gray-400">
                      {msg.pedido.nombre}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {truncateMessage(msg.mensaje, 80)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-1" />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(msg.createdAt).toLocaleDateString("es-ES")}
              </p>
            </Link>
          ))
        )}
      </div>

      {mensajes.length > 0 && (
        <Link
          href="/admin/pedidos"
          className="mt-4 block text-center py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition text-sm font-medium"
        >
          Ver todos los mensajes
        </Link>
      )}
    </div>
  );
}
