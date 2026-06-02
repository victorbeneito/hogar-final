"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, Loader } from "lucide-react";

export default function MigracionesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleMigrarComposicion() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/migrate-composicion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: "success",
          text: data.message || "✅ Migración completada exitosamente"
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Error en la migración"
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Error al conectar con el servidor"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Migraciones de BD
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Ejecuta migraciones manuales de la base de datos
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Campo "composicion" en productos
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Crea el campo <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">composicion</code> en la tabla <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">producto</code> si no existe.
          </p>

          <button
            onClick={handleMigrarComposicion}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            {loading ? "Ejecutando..." : "Ejecutar migración"}
          </button>

          {message && (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm ${
                  message.type === "success"
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {message.text}
              </p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            ℹ️ <strong>Nota:</strong> Si el campo ya existe, no será duplicado. Si ve un error "Duplicate column name", significa que el campo ya está creado y puede proceder a importar productos.
          </p>
        </div>
      </div>
    </div>
  );
}
