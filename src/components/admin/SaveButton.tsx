"use client";
import { useState } from "react";
import { Check, Loader2, Save } from "lucide-react";

type Props = {
  onSave: () => Promise<void>;
  label?: string;
};

export default function SaveButton({ onSave, label = "Guardar" }: Props) {
  const [estado, setEstado] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleClick() {
    setEstado("saving");
    try {
      await onSave();
      setEstado("saved");
      setTimeout(() => setEstado("idle"), 2500);
    } catch {
      setEstado("error");
      setTimeout(() => setEstado("idle"), 3000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={estado === "saving"}
      className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition
        ${estado === "saving" ? "bg-blue-400 cursor-not-allowed text-white" :
          estado === "saved"  ? "bg-green-500 text-white" :
          estado === "error"  ? "bg-red-500 text-white" :
                                "bg-blue-600 hover:bg-blue-700 text-white"}
      `}
    >
      {estado === "saving" && <Loader2 size={15} className="animate-spin" />}
      {estado === "saved"  && <Check size={15} />}
      {estado === "idle"   && <Save size={15} />}
      {estado === "saving" ? "Guardando..." :
       estado === "saved"  ? "¡Guardado!" :
       estado === "error"  ? "Error al guardar" : label}
    </button>
  );
}
