"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { SPANISH_FISCAL_DOCUMENT_ERROR, isValidSpanishFiscalDocument, normalizeClientNif } from "@/lib/clientNif";

interface DireccionForm {
  empresa: string;
  direccion: string;
  direccionComplementaria: string;
  codigoPostal: string;
  ciudad: string;
  pais: string;
  provincia: string;
  telefono: string;
  nif: string;
}

export default function DireccionesPage() {
  const { cliente, token, loading, setCliente, logout } = useClienteAuth();

  const router = useRouter();
  const [form, setForm] = useState<DireccionForm>({
    empresa: "",
    direccion: "",
    direccionComplementaria: "",
    codigoPostal: "",
    ciudad: "",
    pais: "España",
    provincia: "",
    telefono: "",
    nif: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [nextUrl, setNextUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !cliente) {
      router.push("/auth");
    }
  }, [cliente, loading, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    setNextUrl(next);
  }, []);

  useEffect(() => {
    const cargarDireccion = async () => {
      if (!token) return;
      try {
        const res = await fetch("/api/clientes/direccion", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.ok && data.direccion) {
          setForm((prev) => ({
            ...prev,
            empresa: data.direccion.empresa || "",
            direccion: data.direccion.direccion || "",
            direccionComplementaria: data.direccion.direccionComplementaria || "",
            codigoPostal: data.direccion.codigoPostal || "",
            ciudad: data.direccion.ciudad || "",
            pais: data.direccion.pais || "España",
            provincia: data.direccion.provincia || "",
            telefono: data.direccion.telefono || "",
            nif: data.direccion.nif || "",
          }));
        }
      } catch {
        // Ignorar errores silenciosos
      }
    };
    cargarDireccion();
  }, [token]);

  const handleChange = (field: keyof DireccionForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    const nifFinal = normalizeClientNif(form.nif);
    if (!nifFinal) {
      setError("El NIF/CIF es obligatorio");
      return;
    }

    if (!isValidSpanishFiscalDocument(nifFinal)) {
      setError(SPANISH_FISCAL_DOCUMENT_ERROR);
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const res = await fetch("/api/clientes/direccion", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          nif: nifFinal,
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        logout();
        router.push("/auth?expired=1");
        return;
      }
      if (!data.ok) throw new Error(data.error || "Error al guardar la dirección");

      setMensaje("Dirección guardada correctamente");

      if (data.cliente) {
        const clienteActualizado = { ...data.cliente, id: Number(data.cliente.id) };
        setCliente(clienteActualizado);
        localStorage.setItem("cliente_datos", JSON.stringify(clienteActualizado));
      } else if (cliente) {
        setCliente({ ...cliente, ...form, nif: nifFinal });
      }

      setTimeout(() => {
        if (nextUrl) {
          router.push(nextUrl);
        } else {
          router.push("/account");
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Error al guardar la dirección");
    } finally {
      setGuardando(false);
    }
  };

  if (loading || !cliente) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-darkNavBg rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">
      <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dirección de Envío</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Mantén tus datos actualizados para recibir tus pedidos sin incidencias.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Nombre y Apellidos (ReadOnly) */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Nombre</label>
          <input
            type="text"
            value={cliente.nombre}
            readOnly
            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Apellidos</label>
          <input
            type="text"
            value={cliente.apellidos}
            readOnly
            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed outline-none"
          />
        </div>

        {/* Empresa */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Empresa (opcional)</label>
          <input
            type="text"
            value={form.empresa}
            onChange={(e) => handleChange("empresa", e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Dirección */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Dirección *</label>
          <input
            type="text"
            value={form.direccion}
            onChange={(e) => handleChange("direccion", e.target.value)}
            required
            placeholder="Calle, número, piso..."
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Dirección complementaria */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Info Adicional (opcional)</label>
          <input
            type="text"
            value={form.direccionComplementaria}
            onChange={(e) => handleChange("direccionComplementaria", e.target.value)}
            placeholder="Bloque, escalera, puerta..."
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* CP y Ciudad */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Código Postal *</label>
          <input
            type="text"
            value={form.codigoPostal}
            onChange={(e) => handleChange("codigoPostal", e.target.value)}
            required
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Ciudad *</label>
          <input
            type="text"
            value={form.ciudad}
            onChange={(e) => handleChange("ciudad", e.target.value)}
            required
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* País y Provincia */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">País *</label>
          <input
            type="text"
            value={form.pais}
            onChange={(e) => handleChange("pais", e.target.value)}
            required
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Provincia *</label>
          <input
            type="text"
            value={form.provincia}
            onChange={(e) => handleChange("provincia", e.target.value)}
            required
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Teléfono y NIF */}
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Teléfono *</label>
          <input
            type="tel"
            value={form.telefono}
            onChange={(e) => handleChange("telefono", e.target.value)}
            required
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">NIF / DNI / CIF *</label>
          <input
            type="text"
            value={form.nif}
            onChange={(e) => handleChange("nif", e.target.value)}
            required
            placeholder="12345678Z / B12345678"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Se valida la letra del DNI/NIE y el dígito de control del CIF.
          </p>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="md:col-span-2 text-red-500 dark:text-red-400 text-sm font-medium text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {error}
          </div>
        )}
        {mensaje && (
          <div className="md:col-span-2 text-green-600 dark:text-green-400 text-sm font-medium text-center bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            {mensaje}
          </div>
        )}

        {/* Botones */}
        <div className="md:col-span-2 flex justify-end gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-bold"
            onClick={() => router.push("/account")}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-8 py-2.5 rounded-lg bg-primary text-white font-bold tracking-wide hover:bg-primaryHover disabled:opacity-60 transition-all shadow-md hover:shadow-lg transform active:scale-95"
          >
            {guardando ? "Guardando..." : "Guardar Dirección"}
          </button>
        </div>
      </form>
    </div>
  );
}
