import Link from "next/link";
import { Mail, CheckCircle2, XCircle } from "lucide-react";

interface Cliente {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  createdAt: string;
  activo: boolean;
}

interface UltimosClientesProps {
  clientes: Cliente[];
}

export default function UltimosClientes({ clientes }: UltimosClientesProps) {
  const getInitials = (nombre: string, apellidos: string) => {
    return `${nombre[0] || ""}${apellidos[0] || ""}`.toUpperCase();
  };

  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Últimos Clientes Registrados
      </h3>
      <div className="space-y-3">
        {clientes.length === 0 ? (
          <p className="text-center text-gray-500 py-6">No hay clientes</p>
        ) : (
          clientes.map((cliente) => (
            <Link
              key={cliente.id}
              href={`/admin/clientes/${cliente.id}`}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {getInitials(cliente.nombre, cliente.apellidos)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {cliente.nombre} {cliente.apellidos}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Mail className="w-3 h-3" />
                    {cliente.email}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(cliente.createdAt).toLocaleDateString("es-ES")}
                </span>
                {cliente.activo ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
