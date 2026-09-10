"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, PlayCircle, ShieldAlert } from "lucide-react";

type FilaHistorial = {
  numeroPedido: string;
  estado: string;
  ultimoHito: string | null;
  fechaUltimoHito: string | null;
  error?: string;
};

type FilaFactura = {
  numeroPedido: string;
  fechaPedido: string;
  total: number;
  estadoPago: string;
  numeroFactura: string | null;
  fechaFactura: string | null;
  fechaDesplazada: boolean;
  error?: string;
};

type FilaRevi = { numeroPedido: string; fechaPedido: string; error?: string };

type Reporte = {
  simulacro: boolean;
  desde: string;
  hasta: string | null;
  totalPedidos: number;
  historial: FilaHistorial[];
  facturas: FilaFactura[];
  sinEstadoFacturable: number;
  revi: FilaRevi[];
  serie: { siguienteNumero: number; ultimaFecha: string | null };
};

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("es-ES") : "—";
const eur = (n: number) =>
  n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export default function RegularizarPedidosPage() {
  const [pasos, setPasos] = useState({ historial: true, facturas: true, revi: true });
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState("");

  const query = new URLSearchParams({
    historial: String(pasos.historial),
    facturas: String(pasos.facturas),
    revi: String(pasos.revi),
  }).toString();

  const simular = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/regularizar-pedidos?${query}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setReporte(data.reporte);
    } catch (e: any) {
      setError(e.message);
      setReporte(null);
    } finally {
      setCargando(false);
    }
  };

  const aplicar = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/regularizar-pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacion, pasos }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setReporte(data.reporte);
      setConfirmacion("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const hayDesplazadas = reporte?.facturas.some((f) => f.fechaDesplazada) ?? false;
  const hayPagoPendiente = reporte?.facturas.some((f) => f.estadoPago !== "PAGADO") ?? false;
  const hayErrores =
    (reporte?.historial.some((h) => h.error) ||
      reporte?.facturas.some((f) => f.error) ||
      reporte?.revi.some((v) => v.error)) ??
    false;

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-6 md:py-8 px-3 sm:px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/admin/facturas"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#4A4A4A] mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a facturas
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-[#4A4A4A] mb-1">
          Regularizar pedidos
        </h1>
        <p className="text-sm text-gray-500 mb-6 max-w-3xl">
          Pone al día los pedidos que se cambiaron de estado en bloque antes de que el
          proceso estuviera completo: rellena el historial que falta, emite las facturas
          pendientes en orden cronológico y envía las invitaciones de reseña que no
          llegaron a salir. Empieza siempre por el simulacro.
        </p>

        {/* Pasos */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Pasos a ejecutar
          </p>
          <div className="grid gap-2 sm:grid-cols-3 mb-4">
            {(
              [
                ["historial", "Reparar historial de estados"],
                ["facturas", "Emitir facturas pendientes"],
                ["revi", "Enviar invitaciones de Revi"],
              ] as const
            ).map(([clave, etiqueta]) => (
              <label
                key={clave}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={pasos[clave]}
                  onChange={(e) => setPasos((p) => ({ ...p, [clave]: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 accent-[#6BAEC9]"
                />
                <span className="text-gray-700">{etiqueta}</span>
              </label>
            ))}
          </div>
          <button
            onClick={simular}
            disabled={cargando || (!pasos.historial && !pasos.facturas && !pasos.revi)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6BAEC9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5FA0B3] disabled:opacity-40"
          >
            <PlayCircle className="w-4 h-4" />
            {cargando ? "Calculando…" : "Simular (no escribe nada)"}
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {reporte && (
          <>
            <div className="rounded-2xl bg-white border border-gray-200 p-5 mb-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    reporte.simulacro
                      ? "bg-[#6BAEC9]/15 text-[#3d7f96]"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {reporte.simulacro ? "SIMULACRO" : "APLICADO"}
                </span>
                <span className="text-gray-600">
                  Pedidos en rango: <strong>{reporte.totalPedidos}</strong>
                </span>
                <span className="text-gray-600">
                  Serie: siguiente nº <strong>{reporte.serie.siguienteNumero}</strong>
                </span>
                <span className="text-gray-600">
                  Última factura emitida: <strong>{fmt(reporte.serie.ultimaFecha)}</strong>
                </span>
                {pasos.facturas && reporte.sinEstadoFacturable > 0 && (
                  <span className="text-gray-600" title="No se tocan: su estado actual no emite factura">
                    Sin estado facturable: <strong>{reporte.sinEstadoFacturable}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* 1. Historial */}
            {pasos.historial && (
              <Bloque titulo="1. Historial desfasado" n={reporte.historial.length}>
                {reporte.historial.length === 0 ? (
                  <Vacio texto="Ningún pedido tiene el historial desfasado." />
                ) : (
                  <Tabla cabeceras={["Pedido", "Estado actual", "Último hito", "Fecha"]}>
                    {reporte.historial.map((h) => (
                      <tr key={h.numeroPedido} className="border-t border-gray-100">
                        <Td>{h.numeroPedido}</Td>
                        <Td>{h.estado}</Td>
                        <Td>{h.ultimoHito ?? "(ninguno)"}</Td>
                        <Td>
                          {fmt(h.fechaUltimoHito)}
                          {h.error && <span className="text-red-600"> ❌ {h.error}</span>}
                        </Td>
                      </tr>
                    ))}
                  </Tabla>
                )}
              </Bloque>
            )}

            {/* 2. Facturas */}
            {pasos.facturas && (
              <Bloque titulo="2. Facturas a emitir" n={reporte.facturas.length}>
                {reporte.facturas.length === 0 ? (
                  <Vacio
                    texto={
                      reporte.sinEstadoFacturable > 0
                        ? `No hay nada que emitir. Hay ${reporte.sinEstadoFacturable} pedido(s) sin factura, pero su estado actual no la emite: marca "Emitir la factura al entrar en este estado" en Configuración de pedidos.`
                        : "No hay facturas pendientes."
                    }
                  />
                ) : (
                  <>
                    <Tabla
                      cabeceras={["Pedido", "Fecha pedido", "Total", "Pago", "Factura", "Fecha factura"]}
                    >
                      {reporte.facturas.map((f) => (
                        <tr key={f.numeroPedido} className="border-t border-gray-100">
                          <Td>{f.numeroPedido}</Td>
                          <Td>{fmt(f.fechaPedido)}</Td>
                          <Td>{eur(f.total)}</Td>
                          <Td>
                            <span
                              className={
                                f.estadoPago === "PAGADO" ? "text-gray-600" : "text-amber-600 font-semibold"
                              }
                            >
                              {f.estadoPago}
                            </span>
                          </Td>
                          <Td>
                            <span className="font-mono">{f.numeroFactura ?? "—"}</span>
                          </Td>
                          <Td>
                            {fmt(f.fechaFactura)}
                            {f.fechaDesplazada && (
                              <span className="ml-1 text-amber-600" title="No coincide con la fecha del pedido">
                                ⚠️
                              </span>
                            )}
                            {f.error && <span className="text-red-600"> ❌ {f.error}</span>}
                          </Td>
                        </tr>
                      ))}
                    </Tabla>
                    {hayDesplazadas && (
                      <Aviso>
                        Hay facturas cuya fecha no coincide con la del pedido. Ocurre cuando ya
                        existe una factura posterior en la serie: la fecha de expedición no puede
                        retroceder sin romper la correlatividad. El PDF sigue mostrando la fecha
                        real del pedido.
                      </Aviso>
                    )}
                    {hayPagoPendiente && (
                      <Aviso>
                        Hay pedidos cuyo pago no consta como PAGADO. Revísalos antes de aplicar:
                        una vez emitida, la factura no se renumera.
                      </Aviso>
                    )}
                  </>
                )}
              </Bloque>
            )}

            {/* 3. Revi */}
            {pasos.revi && (
              <Bloque titulo="3. Invitaciones de Revi pendientes" n={reporte.revi.length}>
                {reporte.revi.length === 0 ? (
                  <Vacio texto="No hay invitaciones pendientes." />
                ) : (
                  <Tabla cabeceras={["Pedido", "Fecha pedido", ""]}>
                    {reporte.revi.map((v) => (
                      <tr key={v.numeroPedido} className="border-t border-gray-100">
                        <Td>{v.numeroPedido}</Td>
                        <Td>{fmt(v.fechaPedido)}</Td>
                        <Td>{v.error && <span className="text-red-600">❌ {v.error}</span>}</Td>
                      </tr>
                    ))}
                  </Tabla>
                )}
              </Bloque>
            )}

            {hayErrores && !reporte.simulacro && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-4 text-sm text-red-700">
                Algunas filas fallaron. Lo que sí se aplicó no se repite: puedes volver a
                lanzar el proceso y solo se reintentará lo que quedó pendiente.
              </div>
            )}

            {/* Aplicar */}
            {reporte.simulacro && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-bold mb-1">Esto escribe en la base de datos</p>
                    <p>
                      Las facturas emitidas no se pueden renumerar ni borrar sin dejar un hueco
                      en la serie, y las invitaciones de Revi salen de verdad al cliente. Revisa
                      la tabla de arriba antes de continuar.
                    </p>
                  </div>
                </div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Escribe REGULARIZAR para confirmar
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={confirmacion}
                    onChange={(e) => setConfirmacion(e.target.value)}
                    placeholder="REGULARIZAR"
                    className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-mono w-56"
                  />
                  <button
                    onClick={aplicar}
                    disabled={cargando || confirmacion !== "REGULARIZAR"}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {cargando ? "Aplicando…" : "Aplicar de verdad"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Bloque({ titulo, n, children }: { titulo: string; n: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 mb-4">
      <p className="text-sm font-bold text-[#4A4A4A] mb-3">
        {titulo} <span className="text-gray-400 font-normal">· {n} pedido{n !== 1 ? "s" : ""}</span>
      </p>
      {children}
    </div>
  );
}

function Tabla({ cabeceras, children }: { cabeceras: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
            {cabeceras.map((c, i) => (
              <th key={i} className="pb-2 font-semibold whitespace-nowrap pr-4">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{children}</td>;
}

function Vacio({ texto }: { texto: string }) {
  return <p className="text-sm text-gray-500">{texto}</p>;
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
      {children}
    </div>
  );
}
