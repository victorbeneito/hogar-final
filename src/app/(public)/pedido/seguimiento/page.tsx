"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface PedidoSeguimiento {
  numeroPedido: string;
  nombre: string;
  apellidos: string | null;
  estado: string;
  estadoPago: string;
  fechaPedido: string;
  fechaEnvio: string | null;
  fechaEntrega: string | null;
  envioMetodo: string;
  envioCoste: number;
  transportistaNombre: string | null;
  numeroSeguimiento: string | null;
  trackingUrl: string | null;
  pagoMetodo: string;
  subtotal: number;
  descuento: number;
  totalFinal: number;
  direccion: string | null;
  direccionComplementaria: string | null;
  cp: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  pedidoproducto: {
    nombre: string;
    varianteInfo: string | null;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
}

function formatearFecha(valor: string | null) {
  if (!valor) return null;
  try {
    return new Date(valor).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return null;
  }
}

function SeguimientoContenido() {
  const searchParams = useSearchParams();

  const [ref, setRef] = useState(searchParams.get("ref") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [pedido, setPedido] = useState<PedidoSeguimiento | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(async (refBusqueda: string, emailBusqueda: string) => {
    if (!refBusqueda.trim() || !emailBusqueda.trim()) {
      setError("Introduce la referencia del pedido y tu email");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const params = new URLSearchParams({ ref: refBusqueda.trim(), email: emailBusqueda.trim() });
      const res = await fetch(`/api/pedidos/seguimiento?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setPedido(null);
        setError(data.error || "No se pudo consultar el pedido");
        return;
      }

      setPedido(data.pedido);
    } catch {
      setPedido(null);
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }, []);

  // Búsqueda automática cuando se llega desde el enlace del email
  useEffect(() => {
    const refUrl = searchParams.get("ref");
    const emailUrl = searchParams.get("email");
    if (refUrl && emailUrl) void buscar(refUrl, emailUrl);
  }, [buscar, searchParams]);

  const fechaPedido = formatearFecha(pedido?.fechaPedido ?? null);
  const fechaEnvio = formatearFecha(pedido?.fechaEnvio ?? null);
  const fechaEntrega = formatearFecha(pedido?.fechaEntrega ?? null);

  const inputClass =
    "w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all";

  return (
    <div className="min-h-screen bg-fondo dark:bg-darkBg py-10 md:py-16 px-4 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
            Seguimiento de tu pedido 📦
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Consulta el estado con la referencia del pedido y el email con el que compraste.
          </p>
        </div>

        {/* Buscador */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void buscar(ref, email);
          }}
          className="bg-white dark:bg-darkNavBg rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
        >
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Referencia</label>
            <input type="text" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="PED-2026-0001" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="px-6 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primaryHover disabled:opacity-60 transition-all shadow-lg shadow-yellow-500/20"
          >
            {cargando ? "Buscando..." : "Consultar"}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm font-medium mb-8">
            {error}
          </div>
        )}

        {pedido && (
          <div className="space-y-6">
            {/* Estado */}
            <div className="bg-white dark:bg-darkNavBg rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pedido</p>
                  <p className="text-2xl font-mono font-bold text-primary">{pedido.numeroPedido}</p>
                  {fechaPedido && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Realizado el {fechaPedido}</p>}
                </div>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wide">
                  {pedido.estado}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Envío</p>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {pedido.transportistaNombre || pedido.envioMetodo}
                  </p>
                  {fechaEnvio && <p className="text-gray-500 dark:text-gray-400">Enviado el {fechaEnvio}</p>}
                  {fechaEntrega && <p className="text-gray-500 dark:text-gray-400">Entregado el {fechaEntrega}</p>}
                  {pedido.numeroSeguimiento && (
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      Seguimiento:{" "}
                      {pedido.trackingUrl ? (
                        <a href={pedido.trackingUrl} target="_blank" rel="noreferrer" className="text-primary underline font-semibold">
                          {pedido.numeroSeguimiento}
                        </a>
                      ) : (
                        <span className="font-semibold">{pedido.numeroSeguimiento}</span>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Dirección de entrega</p>
                  <p className="text-gray-900 dark:text-white font-semibold break-words">
                    {[pedido.direccion, pedido.direccionComplementaria].filter(Boolean).join(", ") || "-"}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 break-words">
                    {[pedido.ciudad, pedido.cp ? `(${pedido.cp})` : "", pedido.provincia, pedido.pais].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Artículos */}
            <div className="bg-white dark:bg-darkNavBg rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-bold text-gray-800 dark:text-white">Artículos ({pedido.pedidoproducto.length})</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {pedido.pedidoproducto.map((item, i) => (
                  <div key={i} className="p-5 flex justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white break-words">{item.nombre}</p>
                      {item.varianteInfo && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{item.varianteInfo}</p>}
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">x{item.cantidad}</p>
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {Number(item.subtotal).toFixed(2)} €
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span>{Number(pedido.subtotal).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Envío</span>
                  <span>{Number(pedido.envioCoste) === 0 ? "Gratis" : `${Number(pedido.envioCoste).toFixed(2)} €`}</span>
                </div>
                {Number(pedido.descuento) > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Descuento</span>
                    <span>- {Number(pedido.descuento).toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 mt-1 border-t border-gray-200 dark:border-gray-600">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-xl font-extrabold text-primary">{Number(pedido.totalFinal).toFixed(2)} €</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-10">
          <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors">
            ← Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SeguimientoPedidoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center items-center bg-fondo dark:bg-darkBg">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <SeguimientoContenido />
    </Suspense>
  );
}
