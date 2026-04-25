"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type ClienteForm = {
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
  telefono: string;
  empresa: string;
  nif: string;
  direccion: string;
  direccionComplementaria: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
};

const campos: Array<{ name: keyof ClienteForm; label: string; type?: string; full?: boolean }> = [
  { name: "nombre", label: "Nombre" },
  { name: "apellidos", label: "Apellidos" },
  { name: "email", label: "Email", type: "email" },
  { name: "password", label: "Contraseña", type: "password" },
  { name: "telefono", label: "Teléfono" },
  { name: "empresa", label: "Empresa" },
  { name: "nif", label: "NIF" },
  { name: "direccion", label: "Dirección", full: true },
  { name: "direccionComplementaria", label: "Dirección 2", full: true },
  { name: "codigoPostal", label: "Código postal" },
  { name: "ciudad", label: "Ciudad" },
  { name: "provincia", label: "Provincia" },
  { name: "pais", label: "País" },
];

export default function NuevoClientePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"datos" | "direccion">("datos");
  const [form, setForm] = useState<ClienteForm>({
    nombre: "",
    apellidos: "",
    email: "",
    password: "",
    telefono: "",
    empresa: "",
    nif: "",
    direccion: "",
    direccionComplementaria: "",
    codigoPostal: "",
    ciudad: "",
    provincia: "",
    pais: "España",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name as keyof ClienteForm]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("adminToken") || "";
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo crear el cliente");
      }

      router.push(`/admin/clientes/${data.cliente.id}`);
    } catch (error: any) {
      alert(error.message || "Error creando cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-[#6BAEC9]/10 px-3 py-1 font-semibold text-[#6BAEC9]">
                Alta
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-600">
                Cliente nuevo
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#4A4A4A] sm:text-4xl">
                + Nuevo cliente
              </h1>
              <p className="mt-1 text-sm text-gray-500 sm:text-base">
                Crea un cliente con su dirección principal desde el panel.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/admin/clientes")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-500 px-5 py-3 font-semibold text-white transition hover:bg-gray-600"
            >
              ← Volver a clientes
            </button>
            <button
              type="submit"
              form="nuevo-cliente-form"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6BAEC9] px-5 py-3 font-semibold text-white transition hover:bg-[#5FA0B3] disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear cliente"}
            </button>
          </div>
        </div>

        <form id="nuevo-cliente-form" onSubmit={handleSubmit} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
          <div className="border-b border-gray-200 px-3 sm:px-6">
            <nav className="flex gap-1 overflow-x-auto py-2">
              {[
                { id: "datos", label: "Datos", hint: "Perfil y acceso" },
                { id: "direccion", label: "Dirección", hint: "Principal" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as "datos" | "direccion")}
                  className={`min-w-[140px] whitespace-nowrap rounded-t-xl border-b-2 px-4 py-3 text-left transition ${
                    activeTab === tab.id
                      ? "border-[#6BAEC9] bg-[#6BAEC9]/5 text-[#6BAEC9]"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  <div className="text-sm font-semibold">{tab.label}</div>
                  <div className="text-xs opacity-70">{tab.hint}</div>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
              <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-gray-800">
                    {activeTab === "datos" ? "Datos del cliente" : "Dirección principal"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {activeTab === "datos"
                      ? "Información básica, acceso y datos de facturación."
                      : "Datos de envío que se guardarán como dirección principal."}
                  </p>
                </div>

                {activeTab === "datos" ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {campos
                      .filter((campo) => !["direccion", "direccionComplementaria", "codigoPostal", "ciudad", "provincia", "pais"].includes(String(campo.name)))
                      .map((campo) => (
                        <div key={campo.name} className={campo.full ? "sm:col-span-2" : ""}>
                          <label className="mb-1 block text-sm font-semibold text-gray-600">{campo.label}</label>
                          <input
                            type={campo.type || "text"}
                            name={campo.name}
                            value={form[campo.name]}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
                            required={campo.name === "nombre" || campo.name === "email" || campo.name === "password"}
                          />
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {campos
                      .filter((campo) => ["direccion", "direccionComplementaria", "codigoPostal", "ciudad", "provincia", "pais"].includes(String(campo.name)))
                      .map((campo) => (
                        <div key={campo.name} className={campo.full ? "sm:col-span-2" : ""}>
                          <label className="mb-1 block text-sm font-semibold text-gray-600">{campo.label}</label>
                          <input
                            type={campo.type || "text"}
                            name={campo.name}
                            value={form[campo.name]}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
                          />
                        </div>
                      ))}
                  </div>
                )}
              </section>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                  <h3 className="mb-4 text-lg font-bold text-gray-800">Resumen</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400">Nombre</span>
                      <span className="text-right font-medium text-gray-700">{form.nombre || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400">Email</span>
                      <span className="text-right font-medium text-gray-700">{form.email || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400">Teléfono</span>
                      <span className="text-right font-medium text-gray-700">{form.telefono || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400">Empresa</span>
                      <span className="text-right font-medium text-gray-700">{form.empresa || "—"}</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                  <h3 className="mb-4 text-lg font-bold text-gray-800">Dirección principal</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>{form.direccion || "—"}</p>
                    <p>{form.direccionComplementaria || "—"}</p>
                    <p>
                      {form.codigoPostal || "—"} · {form.ciudad || "—"}
                    </p>
                    <p>
                      {form.provincia || "—"} · {form.pais || "España"}
                    </p>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
