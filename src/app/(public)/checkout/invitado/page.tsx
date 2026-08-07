"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { getCart } from "@/lib/cartService";
import {
  EMAIL_REGEX,
  getGuestCheckout,
  setGuestCheckout,
  type GuestCheckoutData,
} from "@/lib/guestCheckout";
import {
  SPANISH_FISCAL_DOCUMENT_ERROR,
  isValidSpanishFiscalDocument,
  normalizeClientNif,
} from "@/lib/clientNif";

const FORM_INICIAL: GuestCheckoutData = {
  nombre: "",
  apellidos: "",
  email: "",
  telefono: "",
  nif: "",
  empresa: "",
  direccion: "",
  direccionComplementaria: "",
  codigoPostal: "",
  ciudad: "",
  provincia: "",
  pais: "España",
  aceptaMarketing: false,
};

export default function CheckoutInvitadoPage() {
  const router = useRouter();
  const { cliente, loading } = useClienteAuth();

  const [form, setForm] = useState<GuestCheckoutData>(FORM_INICIAL);
  const [emailConfirmacion, setEmailConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [cuentaExistente, setCuentaExistente] = useState(false);

  useEffect(() => {
    if (loading) return;

    // Si ya tiene sesión, el flujo normal con cuenta es mejor
    if (cliente) {
      router.replace("/checkout/direcciones");
      return;
    }

    if (getCart().length === 0) {
      router.replace("/carrito");
      return;
    }

    // Recuperar datos si vuelve atrás desde envío/resumen
    const guardado = getGuestCheckout();
    if (guardado) {
      setForm({ ...FORM_INICIAL, ...guardado });
      setEmailConfirmacion(guardado.email);
    }
  }, [cliente, loading, router]);

  const handleChange = (campo: keyof GuestCheckoutData, valor: string | boolean) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (error) setError("");
    if (cuentaExistente) setCuentaExistente(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    const email = form.email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      setError("Introduce un email válido: es donde recibirás la confirmación y el seguimiento del pedido.");
      return;
    }

    if (email !== emailConfirmacion.trim().toLowerCase()) {
      setError("Los dos correos no coinciden. Revísalos, es tu única vía de contacto con el pedido.");
      return;
    }

    const nif = normalizeClientNif(form.nif);
    if (!nif) {
      setError("El NIF/CIF es obligatorio");
      return;
    }
    if (!isValidSpanishFiscalDocument(nif)) {
      setError(SPANISH_FISCAL_DOCUMENT_ERROR);
      return;
    }

    const datos: GuestCheckoutData = {
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      email,
      telefono: form.telefono.trim(),
      nif,
      empresa: form.empresa?.trim() || "",
      direccion: form.direccion.trim(),
      direccionComplementaria: form.direccionComplementaria?.trim() || "",
      codigoPostal: form.codigoPostal.trim(),
      ciudad: form.ciudad.trim(),
      provincia: form.provincia.trim(),
      pais: form.pais.trim() || "España",
      aceptaMarketing: Boolean(form.aceptaMarketing),
    };

    setGuardando(true);
    setError("");

    try {
      const res = await fetch("/api/checkout/invitado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setCuentaExistente(Boolean(data.cuentaExistente));
        setError(data.error || "No se pudieron validar los datos");
        return;
      }

      setGuestCheckout(datos);
      router.push("/checkout/envio");
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-fondo dark:bg-darkBg transition-colors">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const inputClass =
    "w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all";
  const labelClass = "block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5";

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg flex flex-col transition-colors duration-300">
      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-10 lg:gap-20 items-start">

          {/* --- COLUMNA IZQUIERDA --- */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-4">
                Compra sin registrarte 🚚
              </h1>
              <p className="text-base text-gray-600 dark:text-gray-400 max-w-md">
                Rellena una sola vez tus datos de envío. No creamos contraseña ni cuenta: usaremos tu correo
                para enviarte la confirmación del pedido, el aviso de envío y cualquier comunicación.
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-darkNavBg border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Qué te enviaremos por email</p>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span>📩</span> Confirmación con el número de pedido</li>
                <li className="flex gap-2"><span>📦</span> Aviso de envío con el seguimiento</li>
                <li className="flex gap-2"><span>💬</span> Respuestas si escribimos sobre tu pedido</li>
              </ul>
            </div>

            <div className="hidden md:flex pt-2 gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <span className="text-primary border-b-2 border-primary pb-1">1. Datos</span>
              <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
              <span>2. Envío</span>
              <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
              <span>3. Resumen</span>
              <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
              <span>4. Pago</span>
            </div>
          </div>

          {/* --- COLUMNA DERECHA: FORMULARIO --- */}
          <div className="bg-white dark:bg-darkNavBg rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8 transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center tracking-wide uppercase border-b dark:border-gray-700 pb-4">
              Datos de contacto y entrega
            </h2>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className={labelClass}>Nombre *</label>
                <input type="text" value={form.nombre} onChange={(e) => handleChange("nombre", e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Apellidos *</label>
                <input type="text" value={form.apellidos} onChange={(e) => handleChange("apellidos", e.target.value)} required className={inputClass} />
              </div>

              {/* Email + confirmación: es la única vía de contacto del invitado */}
              <div className="md:col-span-2">
                <label className={labelClass}>Email *</label>
                <input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required placeholder="tucorreo@ejemplo.com" className={inputClass} />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Aquí recibirás la confirmación y el seguimiento del pedido.</p>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Repite el email *</label>
                <input type="email" value={emailConfirmacion} onChange={(e) => setEmailConfirmacion(e.target.value)} required onPaste={(e) => e.preventDefault()} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Teléfono *</label>
                <input type="tel" value={form.telefono} onChange={(e) => handleChange("telefono", e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>NIF / DNI / CIF *</label>
                <input type="text" value={form.nif} onChange={(e) => handleChange("nif", e.target.value)} required placeholder="12345678Z / B12345678" className={inputClass} />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Empresa (opcional)</label>
                <input type="text" value={form.empresa} onChange={(e) => handleChange("empresa", e.target.value)} className={inputClass} />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Dirección *</label>
                <input type="text" value={form.direccion} onChange={(e) => handleChange("direccion", e.target.value)} required placeholder="Calle, número, piso..." className={inputClass} />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Info Adicional (opcional)</label>
                <input type="text" value={form.direccionComplementaria} onChange={(e) => handleChange("direccionComplementaria", e.target.value)} placeholder="Bloque, escalera, código portero..." className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Código Postal *</label>
                <input type="text" value={form.codigoPostal} onChange={(e) => handleChange("codigoPostal", e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ciudad *</label>
                <input type="text" value={form.ciudad} onChange={(e) => handleChange("ciudad", e.target.value)} required className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Provincia *</label>
                <input type="text" value={form.provincia} onChange={(e) => handleChange("provincia", e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>País *</label>
                <input type="text" value={form.pais} onChange={(e) => handleChange("pais", e.target.value)} required className={inputClass} />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.aceptaMarketing)}
                    onChange={(e) => handleChange("aceptaMarketing", e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-primary"
                  />
                  <span>Quiero recibir novedades y ofertas por email (opcional).</span>
                </label>
              </div>

              {error && (
                <div className="md:col-span-2 text-red-600 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  {error}
                  {cuentaExistente && (
                    <Link
                      href="/auth?redirect=/checkout/direcciones"
                      className="block mt-2 font-bold underline text-red-700 dark:text-red-300"
                    >
                      Iniciar sesión con ese email →
                    </Link>
                  )}
                </div>
              )}

              <div className="md:col-span-2 flex flex-col-reverse md:flex-row justify-between gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => router.push("/checkout/identificacion")}
                  className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-bold"
                >
                  &larr; Volver
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 md:flex-none px-10 py-3 rounded-lg bg-primary text-white font-bold tracking-wide hover:bg-primaryHover disabled:opacity-60 transition-all shadow-lg shadow-yellow-500/30 transform active:scale-95"
                >
                  {guardando ? "Comprobando..." : "Continuar a Envío →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
