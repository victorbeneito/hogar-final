"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

export type Periodo = "hoy" | "7dias" | "mes" | "trimestre" | "anio" | "custom";

interface PeriodoSelectorProps {
  periodo: Periodo;
  desde?: string;
  hasta?: string;
  onChange: (periodo: Periodo, desde?: string, hasta?: string) => void;
}

export default function PeriodoSelector({
  periodo,
  desde: defaultDesde,
  hasta: defaultHasta,
  onChange,
}: PeriodoSelectorProps) {
  const [showCustom, setShowCustom] = useState(periodo === "custom");
  const [desde, setDesde] = useState(defaultDesde || "");
  const [hasta, setHasta] = useState(defaultHasta || "");

  const presets: { id: Periodo; label: string }[] = [
    { id: "hoy", label: "Hoy" },
    { id: "7dias", label: "7 días" },
    { id: "mes", label: "Mes" },
    { id: "trimestre", label: "Trimestre" },
    { id: "anio", label: "Año" },
    { id: "custom", label: "Personalizado" },
  ];

  const handlePresetClick = (p: Periodo) => {
    setShowCustom(p === "custom");
    onChange(p);
  };

  const handleCustom = () => {
    if (desde && hasta) {
      onChange("custom", desde, hasta);
    }
  };

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => handlePresetClick(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              periodo === p.id
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCustom}
              disabled={!desde || !hasta}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
