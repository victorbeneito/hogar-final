"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useClienteAuth } from "@/context/ClienteAuthContext";

export default function CambiarEmail() {
  const { token, setCliente } = useClienteAuth();
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/clientes/email", token, {
        method: "PUT",
        body: JSON.stringify({ password, newEmail }),
      });

      // si el servidor devuelve el cliente (puedes expandir eso luego)
    //   if (res.email) setCliente((prev) => ({ ...prev, email: res.email }));
    if (res.email)
  setCliente((prev) =>
    prev ? { ...prev, email: res.email } : prev
  );

      toast.success("Correo electrónico actualizado correctamente");
      setPassword("");
      setNewEmail("");
    } catch (error) {
      toast.error("Error al cambiar el correo electrónico");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-10 border-t pt-6 max-w-md">
      <h2 className="text-xl font-semibold mb-4">Cambiar correo electrónico</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Contraseña actual</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded-md w-full p-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Nuevo correo electrónico</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="border rounded-md w-full p-2"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Actualizando..." : "Actualizar email"}
        </button>
      </form>
    </div>
  );
}
