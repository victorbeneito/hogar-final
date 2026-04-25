"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useClienteAuth } from "@/context/ClienteAuthContext";
import { getCart } from "@/lib/cartService";

type CheckoutShippingOption = {
  id: string;
  metodo: "pickup" | "delivery";
  label: string;
  descripcion: string;
  coste: number;
  gratisAplicado: boolean;
  zonaId?: string | null;
  zonaNombre?: string | null;
  carrierId?: string | null;
  carrierName?: string | null;
  carrierImage?: string | null;
};

type CheckoutShippingSelection = CheckoutShippingOption & {
  subtotal: number;
  comentarios?: string;
};

export default function EnvioPage() {
  const router = useRouter();
  const { cliente, loading, token } = useClienteAuth();

  const [envioSeleccionado, setEnvioSeleccionado] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [options, setOptions] = useState<CheckoutShippingOption[]>([]);
  const [zoneLabel, setZoneLabel] = useState<string | null>(null);
  const [warning, setWarning] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [comentarios, setComentarios] = useState("");

  useEffect(() => {
    if (!loading && !cliente) {
      toast.error("Debes iniciar sesión antes de continuar.");
      router.push("/auth?redirect=/checkout/envio");
    }
  }, [cliente, loading, router]);

  useEffect(() => {
    const items = getCart();
    const calculatedSubtotal = items.reduce((acc, item) => acc + (item.precioFinal ?? item.precio) * item.cantidad, 0);
    setSubtotal(calculatedSubtotal);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadShippingOptions() {
      if (!token || !cliente) return;

      setLoadingOptions(true);
      setWarning("");

      try {
        const direccionRes = await fetch("/api/clientes/direccion", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const direccionData = await direccionRes.json();
        const direccion = direccionData?.direccion;

        const params = new URLSearchParams({ subtotal: String(subtotal) });
        if (direccion?.pais) params.set("pais", String(direccion.pais));
        if (direccion?.provincia) params.set("provincia", String(direccion.provincia));
        if (direccion?.ciudad) params.set("ciudad", String(direccion.ciudad));
        if (direccion?.codigoPostal) params.set("codigoPostal", String(direccion.codigoPostal));

        const res = await fetch(`/api/transportes/opciones?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();

        if (!active) return;

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "No se pudieron cargar las opciones de envío");
        }

        const normalizedOptions = Array.isArray(data.options) ? data.options : [];
        const orderedOptions = [...normalizedOptions].sort((a, b) => {
          if (a.metodo === b.metodo) return 0;
          return a.metodo === "delivery" ? -1 : 1;
        });

        setOptions(orderedOptions);
        setZoneLabel(data.zoneName || null);
        setWarning(data.warning || "");

        const saved = localStorage.getItem("checkout_envio");
        if (saved) {
          const parsed = JSON.parse(saved);
          const candidateId = parsed?.id || parsed?.metodo;
          const savedOption = candidateId ? orderedOptions.find((option) => option.id === candidateId || option.metodo === candidateId) : null;
          if (typeof parsed?.comentarios === "string") {
            setComentarios(parsed.comentarios);
          }
          if (savedOption?.metodo === "delivery") {
            setEnvioSeleccionado(savedOption.id);
            return;
          }
        }

        const defaultOption =
          orderedOptions.find((option: CheckoutShippingOption) => option.metodo === "delivery") ||
          orderedOptions[0] ||
          null;
        if (defaultOption) setEnvioSeleccionado(defaultOption.id);
      } catch (loadError: any) {
        if (active) {
          setWarning(loadError.message || "No se pudieron cargar las opciones de envío");
          setOptions([]);
        }
      } finally {
        if (active) setLoadingOptions(false);
      }
    }

    loadShippingOptions();

    return () => {
      active = false;
    };
  }, [cliente, subtotal, token]);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === envioSeleccionado) || null,
    [envioSeleccionado, options]
  );

  const handleContinue = () => {
    if (!selectedOption) {
      toast.error("Por favor selecciona un método de envío.");
      return;
    }

    const envioData: CheckoutShippingSelection = {
      ...selectedOption,
      subtotal,
      comentarios: comentarios.trim(),
    };

    localStorage.setItem("checkout_envio", JSON.stringify(envioData));
    localStorage.setItem("checkout_comentarios", comentarios.trim());
    router.push("/checkout/resumen");
  };

  if (loading || loadingOptions) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-fondo dark:bg-darkBg transition-colors">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg flex flex-col transition-colors duration-300">
      <main className="flex-1 flex items-start justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
              Método de Envío 🚚
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Elige cómo quieres recibir tu pedido.</p>

            <div className="hidden md:flex justify-center mt-6 gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <span className="text-green-500 cursor-pointer hover:underline" onClick={() => router.push('/checkout/direcciones')}>1. Dirección</span>
              <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
              <span className="text-primary border-b-2 border-primary pb-1">2. Envío</span>
              <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
              <span>3. Resumen</span>
              <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
              <span>4. Pago</span>
            </div>
          </div>

          <div className="bg-white dark:bg-darkNavBg rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8 transition-colors">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gray-400 font-bold">Destino</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {zoneLabel ? `Zona detectada: ${zoneLabel}` : "Zona detectada desde tu dirección"}
                </p>
              </div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Subtotal: <span className="text-primary">{subtotal.toFixed(2)} €</span>
              </div>
            </div>

            {warning && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {warning}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4">
              {options.map((option) => (
                <label
                  key={option.id}
                  className={`relative flex items-center gap-4 p-4 md:p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                    envioSeleccionado === option.id
                      ? "border-primary bg-yellow-50 dark:bg-yellow-900/10 shadow-md"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 bg-transparent"
                  }`}
                >
                  <input
                    type="radio"
                    name="envio"
                    value={option.id}
                    checked={envioSeleccionado === option.id}
                    onChange={() => setEnvioSeleccionado(option.id)}
                    className="absolute opacity-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 md:gap-4 min-w-0">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                        {option.carrierImage ? (
                          <img src={option.carrierImage} alt={option.carrierName || option.label} className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-3xl md:text-4xl">{option.metodo === "pickup" ? "🏬" : "🚚"}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm md:text-base uppercase tracking-[0.2em] text-gray-400 font-bold">
                          {option.metodo === "pickup" ? "Recogida" : option.carrierName || "Transportista"}
                        </p>
                        <h3 className="font-bold text-xl md:text-2xl text-gray-900 dark:text-white mt-1 truncate">{option.label}</h3>
                        <p className="mt-2 text-sm md:text-base text-gray-500 dark:text-gray-400 max-w-full leading-snug">
                          {option.descripcion}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end text-right gap-2">
                        <span className={`inline-flex font-bold py-1 px-3 rounded-full text-sm ${option.coste === 0 ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20" : "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700"}`}>
                          {option.coste === 0 ? "Gratis" : `${option.coste.toFixed(2)} €`}
                          {option.gratisAplicado ? " · Envío gratis aplicado" : ""}
                        </span>
                      </div>
                      {envioSeleccionado === option.id && (
                        <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg p-5">
              <label className="block">
                <span className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                  Enviar comentarios sobre el pedido
                </span>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  rows={4}
                  placeholder="Escribe aquí cualquier indicación sobre el pedido, entrega, horario, acceso, etc."
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </label>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Si no quieres añadir nada, puedes dejarlo en blanco.
              </p>
            </div>

            {options.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 mt-6">
                No hay opciones disponibles para esta dirección.
              </div>
            )}

            <div className="flex flex-col-reverse md:flex-row justify-between gap-4 mt-10 pt-6 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => router.push('/checkout/direcciones')}
                className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-bold"
              >
                &larr; Atrás
              </button>

              <button
                onClick={handleContinue}
                disabled={!selectedOption}
                className="flex-1 md:flex-none px-10 py-3 rounded-lg bg-primary text-white font-bold tracking-wide hover:bg-primaryHover transition-all shadow-lg shadow-yellow-500/30 transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Continuar al Resumen &rarr;
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
