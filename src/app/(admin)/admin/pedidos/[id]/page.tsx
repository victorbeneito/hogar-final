"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Address = {
  nombre: string;
  apellidos: string;
  empresa: string;
  nif: string;
  telefono: string;
  direccion: string;
  direccionComplementaria: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
};

type OrderProduct = {
  id: number;
  productoId: number | null;
  varianteId: number | null;
  nombre: string;
  varianteInfo: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  producto?: { id: number; nombre: string; referencia?: string | null; slug?: string | null } | null;
  variante?: { id: number; referencia?: string | null; tamano?: string | null; color?: string | null; tirador?: string | null } | null;
};

type OrderMessage = {
  id: number;
  autor: string;
  autorNombre: string | null;
  mensaje: string;
  privado: boolean;
  createdAt: string;
};

type Pedido = {
  id: number;
  numeroPedido: string;
  clienteId: number;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  nif: string;
  direccion: string;
  direccionComplementaria: string;
  ciudad: string;
  provincia: string;
  cp: string;
  pais: string;
  direccionEntrega: Address;
  direccionFacturacion: Address;
  envioMetodo: string;
  envioCoste: number;
  transportistaNombre: string;
  numeroSeguimiento: string;
  trackingUrl: string;
  fechaEnvio: string | null;
  fechaEntrega: string | null;
  pagoMetodo: string;
  pagoRecargo: number;
  estadoPago: string;
  subtotal: number;
  descuento: number;
  cuponCodigo: string;
  cuponDescuento: number | null;
  totalFinal: number;
  estado: string;
  notas: string;
  fechaPedido: string | null;
  updatedAt: string | null;
  cliente: { id: number; nombre: string; email: string; telefono: string; empresa: string; nif: string } | null;
  factura?: { id: number; numeroFactura: string; total: number; fechaFactura: string } | null;
  productos: OrderProduct[];
  mensajes: OrderMessage[];
  estadoHistorial: { id: number; estado: string; color: string; fecha: string }[];
};

function parseNombre(nombre: string): { base: string; atributos: { label: string; valor: string }[] } {
  const atributos: { label: string; valor: string }[] = [];
  const pattern = /\s*-\s*(Tamaño|Color|Tirador)\s*:\s*([^-]+)/gi;
  const firstMatch = nombre.match(/\s*-\s*(Tamaño|Color|Tirador)\s*:/i);
  const base = firstMatch?.index !== undefined ? nombre.substring(0, firstMatch.index).trim() : nombre.trim();
  let m;
  while ((m = pattern.exec(nombre)) !== null) {
    atributos.push({ label: m[1], valor: m[2].trim() });
  }
  return { base, atributos };
}

function formatMoney(value: number | string | null | undefined) {
  const num = Number(value ?? 0);
  return Number.isNaN(num) ? "0.00" : num.toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function emptyAddress(): Address {
  return {
    nombre: "",
    apellidos: "",
    empresa: "",
    nif: "",
    telefono: "",
    direccion: "",
    direccionComplementaria: "",
    codigoPostal: "",
    ciudad: "",
    provincia: "",
    pais: "España",
  };
}

function mapAddress(source?: Partial<Address> | null, fallback?: Partial<Address> | null): Address {
  return {
    nombre: source?.nombre ?? fallback?.nombre ?? "",
    apellidos: source?.apellidos ?? fallback?.apellidos ?? "",
    empresa: source?.empresa ?? fallback?.empresa ?? "",
    nif: source?.nif ?? fallback?.nif ?? "",
    telefono: source?.telefono ?? fallback?.telefono ?? "",
    direccion: source?.direccion ?? fallback?.direccion ?? "",
    direccionComplementaria: source?.direccionComplementaria ?? fallback?.direccionComplementaria ?? "",
    codigoPostal: source?.codigoPostal ?? fallback?.codigoPostal ?? "",
    ciudad: source?.ciudad ?? fallback?.ciudad ?? "",
    provincia: source?.provincia ?? fallback?.provincia ?? "",
    pais: source?.pais ?? fallback?.pais ?? "España",
  };
}

/* ── Card con cabecera ── */
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200 rounded-t-2xl">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</span>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-500 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#6BAEC9] disabled:bg-gray-100 disabled:text-gray-500"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-500 mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#6BAEC9]"
      />
    </label>
  );
}

export default function PedidoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generandoFactura, setGenerandoFactura] = useState(false);
  const [estado, setEstado] = useState("");
  const [estadoPago, setEstadoPago] = useState("");
  const [notas, setNotas] = useState("");
  const [transportistaNombre, setTransportistaNombre] = useState("");
  const [numeroSeguimiento, setNumeroSeguimiento] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [fechaEnvio, setFechaEnvio] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [envioCoste, setEnvioCoste] = useState(0);
  const [facturacion, setFacturacion] = useState<Address>(emptyAddress());
  const [entrega, setEntrega] = useState<Address>(emptyAddress());
  const [productos, setProductos] = useState<OrderProduct[]>([]);
  const [mensajeNuevo, setMensajeNuevo] = useState("");
  const [mensajePrivado, setMensajePrivado] = useState(false);
  const [mensajes, setMensajes] = useState<OrderMessage[]>([]);
  const [estadosPedido, setEstadosPedido] = useState<{ clave: string; nombre: string; color: string }[]>([]);
  const [estadoHistorial, setEstadoHistorial] = useState<{ id: number; estado: string; color: string; fecha: string }[]>([]);
  const [transportistasConfig, setTransportistasConfig] = useState<{ id: string; name: string; trackingUrl: string }[]>([]);
  const [savingTransporte, setSavingTransporte] = useState(false);
  const [tabDireccion, setTabDireccion] = useState<"entrega" | "facturacion">("entrega");
  const [tabEstado, setTabEstado] = useState<"estado" | "documentos">("estado");
  const [dropdownEstadoAbierto, setDropdownEstadoAbierto] = useState(false);
  const dropdownEstadoRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPedido = async () => {
      try {
        const [pedidoRes, estadosRes, transportesRes] = await Promise.all([
          fetch(`/api/pedidos/${id}`),
          fetch("/api/admin/pedidos/estados"),
          fetch("/api/transportes/configuracion"),
        ]);
        const data = await pedidoRes.json();
        if (!data.ok || !data.pedido) throw new Error(data.error || "Pedido no encontrado");

        const estadosData = await estadosRes.json();
        if (estadosData.estados) setEstadosPedido(estadosData.estados.filter((e: any) => e.activo));

        const transportesData = await transportesRes.json();
        const carriers: { id: string; name: string; trackingUrl: string }[] = (transportesData.config?.carriers ?? [])
          .filter((c: any) => c.active)
          .map((c: any) => ({ id: c.id, name: c.name, trackingUrl: c.trackingUrl || "" }));
        setTransportistasConfig(carriers);

        const current: Pedido = data.pedido;
        setPedido(current);
        setEstado(current.estado || "PENDIENTE");
        setEstadoPago(current.estadoPago || "PENDIENTE");
        setNotas(current.notas || "");

        // Auto-rellenar transportista desde config si el pedido no tiene uno asignado
        let autoNombre = current.transportistaNombre || "";
        let autoUrl = current.trackingUrl || "";
        if (!autoNombre && current.envioMetodo === "delivery" && carriers.length === 1) {
          autoNombre = carriers[0].name;
          if (!autoUrl) autoUrl = carriers[0].trackingUrl;
        }

        setTransportistaNombre(autoNombre);
        setNumeroSeguimiento(current.numeroSeguimiento || "");
        setTrackingUrl(autoUrl);
        setFechaEnvio(current.fechaEnvio ? current.fechaEnvio.slice(0, 16) : "");
        setFechaEntrega(current.fechaEntrega ? current.fechaEntrega.slice(0, 16) : "");
        setEnvioCoste(Number(current.envioCoste || 0));
        setFacturacion(mapAddress(current.direccionFacturacion, current.direccionEntrega));
        setEntrega(mapAddress(current.direccionEntrega));
        setProductos(current.productos || []);
        setMensajes(current.mensajes || []);
        setEstadoHistorial(current.estadoHistorial || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadPedido();
  }, [id]);

  useEffect(() => {
    if (!dropdownEstadoAbierto) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownEstadoRef.current && !dropdownEstadoRef.current.contains(e.target as Node)) {
        setDropdownEstadoAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownEstadoAbierto]);

  const totals = useMemo(() => {
    const subtotal = productos.reduce((acc, item) => acc + Number(item.subtotal || item.cantidad * item.precioUnitario), 0);
    const envio = envioCoste;
    const descuento = pedido ? Number(pedido.descuento || 0) : 0;
    const recargo = pedido ? Number(pedido.pagoRecargo || 0) : 0;
    const total = Math.max(0, subtotal + envio + recargo - descuento);
    return { subtotal, envio, descuento, recargo, total };
  }, [pedido, productos, envioCoste]);

  const updateProduct = (index: number, field: keyof OrderProduct, value: string) => {
    setProductos((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item } as OrderProduct;
        if (field === "cantidad" || field === "precioUnitario" || field === "subtotal") {
          (next[field] as any) = Number(value);
          if (field === "cantidad" || field === "precioUnitario") {
            next.subtotal = Number(next.cantidad || 0) * Number(next.precioUnitario || 0);
          }
        } else if (field === "varianteInfo" || field === "nombre") {
          (next[field] as any) = value;
        }
        return next;
      })
    );
  };

  const generarFactura = async () => {
    if (!pedido) return;
    setGenerandoFactura(true);
    try {
      const res = await fetch("/api/facturas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: pedido.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error generando factura");
      const reloadRes = await fetch(`/api/pedidos/${id}`);
      const reloadData = await reloadRes.json();
      if (reloadData.ok && reloadData.pedido) setPedido(reloadData.pedido);
      alert(`Factura generada: ${data.numeroFactura}`);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setGenerandoFactura(false);
    }
  };

  const savePedido = async () => {
    if (!pedido) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado,
          estadoPago,
          notas,
          transportistaNombre,
          numeroSeguimiento,
          trackingUrl,
          fechaEnvio: fechaEnvio || null,
          fechaEntrega: fechaEntrega || null,
          subtotal: totals.subtotal,
          descuento: pedido.descuento,
          totalFinal: totals.total,
          pagoRecargo: pedido.pagoRecargo,
          envioMetodo: pedido.envioMetodo,
          envioCoste,
          nombre: entrega.nombre,
          apellidos: entrega.apellidos,
          telefono: entrega.telefono,
          nif: entrega.nif,
          direccion: entrega.direccion,
          direccionComplementaria: entrega.direccionComplementaria,
          ciudad: entrega.ciudad,
          provincia: entrega.provincia,
          cp: entrega.codigoPostal,
          pais: entrega.pais,
          facturacionNombre: facturacion.nombre,
          facturacionApellidos: facturacion.apellidos,
          facturacionEmpresa: facturacion.empresa,
          facturacionNif: facturacion.nif,
          facturacionTelefono: facturacion.telefono,
          facturacionDireccion: facturacion.direccion,
          facturacionDireccionComplementaria: facturacion.direccionComplementaria,
          facturacionCodigoPostal: facturacion.codigoPostal,
          facturacionCiudad: facturacion.ciudad,
          facturacionProvincia: facturacion.provincia,
          facturacionPais: facturacion.pais,
          productos: productos.map((item) => ({
            id: item.id,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: item.subtotal,
            varianteInfo: item.varianteInfo,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo guardar el pedido");
      setPedido(data.pedido);
      setEstado(data.pedido.estado || estado);
      setEstadoPago(data.pedido.estadoPago || estadoPago);
      setProductos(data.pedido.productos || productos);
      setMensajes(data.pedido.mensajes || mensajes);
      setEntrega(data.pedido.direccionEntrega || entrega);
      setFacturacion(data.pedido.direccionFacturacion || facturacion);
      setEnvioCoste(Number(data.pedido.envioCoste ?? envioCoste));
      setTransportistaNombre(data.pedido.transportistaNombre || transportistaNombre);
      setNumeroSeguimiento(data.pedido.numeroSeguimiento || numeroSeguimiento);
      setTrackingUrl(data.pedido.trackingUrl || trackingUrl);
      setEstadoHistorial(data.pedido.estadoHistorial || []);
      alert("Pedido actualizado correctamente");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Error al guardar el pedido");
    } finally {
      setSaving(false);
    }
  };

  const addMessage = async () => {
    if (!mensajeNuevo.trim()) return;
    try {
      const res = await fetch(`/api/pedidos/${id}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: mensajeNuevo, privado: mensajePrivado, autor: "admin", autorNombre: "Administrador" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo guardar el mensaje");
      setMensajes((prev) => [...prev, data.mensaje]);
      setMensajeNuevo("");
      setMensajePrivado(false);
    } catch (error: any) {
      alert(error.message || "Error al guardar el mensaje");
    }
  };

  const actualizarTransporte = async () => {
    if (!pedido) return;
    setSavingTransporte(true);
    try {
      const isPickup = pedido.envioMetodo === "pickup";
      const now = new Date().toISOString();
      let body: Record<string, any>;

      if (isPickup) {
        body = { fechaEntrega: now };
      } else {
        // Conservar fechaEnvio original si ya estaba registrada
        const fechaEnvioFinal = fechaEnvio ? new Date(fechaEnvio).toISOString() : now;
        body = {
          transportistaNombre,
          numeroSeguimiento,
          trackingUrl,
          fechaEnvio: fechaEnvioFinal,
        };
      }

      const res = await fetch(`/api/pedidos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo actualizar el transporte");

      setPedido(data.pedido);
      if (data.pedido.fechaEnvio) setFechaEnvio(data.pedido.fechaEnvio.slice(0, 16));
      if (data.pedido.fechaEntrega) setFechaEntrega(data.pedido.fechaEntrega.slice(0, 16));
      if (data.pedido.numeroSeguimiento) setNumeroSeguimiento(data.pedido.numeroSeguimiento);

      alert(isPickup ? "Fecha de entrega registrada correctamente" : "Datos de envío actualizados correctamente");
    } catch (error: any) {
      alert(error.message || "Error al actualizar el transporte");
    } finally {
      setSavingTransporte(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando pedido...</div>;
  if (!pedido) return <div className="min-h-screen flex items-center justify-center text-gray-500">Pedido no encontrado.</div>;

  return (
    <div className="min-h-screen bg-[#F4F4F0] py-6 md:py-8 px-4 md:px-6">
      <div className="mx-auto max-w-7xl">

        {/* Cabecera */}
        <div className="mb-5">
          <p className="text-sm text-gray-400 mb-1">Pedidos</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#4A4A4A]">
              Pedido <span className="text-[#6BAEC9]">{pedido.numeroPedido}</span> de {pedido.cliente?.nombre || pedido.nombre}
            </h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push("/admin/pedidos")}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                ← Volver
              </button>
              {pedido.factura ? (
                <a
                  href={`/api/facturas/${pedido.factura.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
                >
                  Descargar factura PDF
                </a>
              ) : (
                <button
                  onClick={generarFactura}
                  disabled={generandoFactura}
                  className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  {generandoFactura ? "Generando..." : "Generar factura"}
                </button>
              )}
              <button
                onClick={savePedido}
                disabled={saving}
                className="rounded-lg bg-[#6BAEC9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5FA0B3] disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>

        {/* Fila de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Fecha", value: formatDate(pedido.fechaPedido) },
            { label: "Total", value: `${formatMoney(totals.total)} €`, highlight: true },
            { label: "Mensajes", value: String(mensajes.length) },
            { label: "Productos", value: String(productos.length) },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
              <p className={`mt-1 text-lg font-bold ${highlight ? "text-[#6BAEC9]" : "text-gray-800"}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Layout dos columnas */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── Columna principal ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Estado del pedido + Documentos en pestañas */}
            <Card
              title=""
              action={undefined}
            >
              {/* Pestañas internas */}
              <div className="-mx-5 -mt-5 mb-5 flex border-b border-gray-200 bg-gray-50 px-5 pt-3 rounded-t-2xl">
                <button
                  type="button"
                  onClick={() => setTabEstado("estado")}
                  className={`mr-4 pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    tabEstado === "estado"
                      ? "border-[#6BAEC9] text-[#6BAEC9]"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Estado
                </button>
                <button
                  type="button"
                  onClick={() => setTabEstado("documentos")}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    tabEstado === "documentos"
                      ? "border-[#6BAEC9] text-[#6BAEC9]"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Documentos
                </button>
              </div>

              {tabEstado === "estado" && (
                <>
                  {/* Historial */}
                  {estadoHistorial.length > 0 ? (
                    <div className="space-y-0 mb-5">
                      {[...estadoHistorial].reverse().map((entrada, idx) => {
                        const esUltimo = idx === 0;
                        return (
                          <div key={entrada.id} className="flex items-stretch gap-3">
                            <div className="flex flex-col items-center w-5 shrink-0">
                              <div
                                className="w-3 h-3 rounded-full mt-1 shrink-0 ring-2 ring-white"
                                style={{ backgroundColor: entrada.color }}
                              />
                              {!esUltimo && <div className="w-0.5 bg-gray-200 flex-1 mt-1" />}
                            </div>
                            <div className="pb-4 flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span
                                  className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                                  style={{ backgroundColor: entrada.color }}
                                >
                                  {entrada.estado}
                                </span>
                                <span className="text-xs text-gray-400">{formatDate(entrada.fecha)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mb-4">Sin historial de estados registrado.</p>
                  )}

                  {/* Actualizar estado */}
                  <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 relative" ref={dropdownEstadoRef}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Actualizar estado</label>
                      <button
                        type="button"
                        onClick={() => setDropdownEstadoAbierto((v) => !v)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-left flex items-center justify-between gap-2"
                      >
                        {(() => {
                          const estadoActual = estadosPedido.find((e) => e.clave === estado);
                          return estadoActual ? (
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                              style={{ backgroundColor: estadoActual.color }}
                            >
                              {estadoActual.nombre}
                            </span>
                          ) : (
                            <span className="text-gray-500">{estado}</span>
                          );
                        })()}
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {dropdownEstadoAbierto && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                          {estadosPedido.map((e) => (
                            <button
                              key={e.clave}
                              type="button"
                              onClick={() => { setEstado(e.clave); setDropdownEstadoAbierto(false); }}
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${estado === e.clave ? "bg-gray-50" : ""}`}
                            >
                              <span
                                className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                                style={{ backgroundColor: e.color }}
                              >
                                {e.nombre}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={savePedido}
                      disabled={saving}
                      className="rounded-lg bg-[#6BAEC9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5FA0B3] disabled:opacity-60 whitespace-nowrap"
                    >
                      {saving ? "Guardando..." : "Actualizar estado"}
                    </button>
                  </div>

                  {/* Notas internas */}
                  <div className="mt-4">
                    <TextArea label="Notas internas" value={notas} onChange={setNotas} rows={2} />
                  </div>
                </>
              )}

              {tabEstado === "documentos" && (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500">Fecha</th>
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500">Documento</th>
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500">Número</th>
                      <th className="pb-2 text-right text-xs font-semibold text-gray-500">Importe</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.factura ? (
                      <tr className="border-t border-gray-50">
                        <td className="py-3 pr-4 text-gray-500 text-xs">{formatDate(pedido.factura.fechaFactura)}</td>
                        <td className="py-3 pr-4 text-gray-700 font-semibold">Factura</td>
                        <td className="py-3 pr-4 text-[#6BAEC9] font-mono text-xs">{pedido.factura.numeroFactura}</td>
                        <td className="py-3 pr-4 text-right text-gray-700">{formatMoney(pedido.factura.total)} €</td>
                        <td className="py-3 text-right">
                          <a
                            href={`/api/facturas/${pedido.factura.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            PDF
                          </a>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-sm text-gray-400">No hay documentos generados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </Card>

            {/* Transporte */}
            <Card title="Transporte">
              {pedido.envioMetodo === "pickup" ? (
                /* ── Recogida en tienda ── */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3">
                    <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Método de envío</p>
                      <p className="text-sm font-semibold text-blue-800">Recogida en tienda</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">URL de seguimiento</p>
                    <p className="text-sm text-gray-500 italic">Recogida en tienda — sin seguimiento</p>
                  </div>

                  <div className="flex items-end gap-3 border-t border-gray-100 pt-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Fecha de entrega</p>
                      {fechaEntrega ? (
                        <p className="text-sm font-semibold text-gray-800">{formatDate(fechaEntrega)}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Pendiente de entrega — se registrará al pulsar el botón</p>
                      )}
                    </div>
                    <button
                      onClick={actualizarTransporte}
                      disabled={savingTransporte}
                      className="rounded-lg bg-[#6BAEC9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5FA0B3] disabled:opacity-60 whitespace-nowrap"
                    >
                      {savingTransporte ? "Registrando..." : fechaEntrega ? "Actualizar entrega" : "Registrar entrega"}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Coste de envío (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={envioCoste}
                      onChange={(e) => setEnvioCoste(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6BAEC9]"
                    />
                  </div>
                </div>
              ) : (
                /* ── Envío mensajería ── */
                <div className="space-y-4">
                  {/* Transportista y URL: solo lectura, auto-cargados del checkout */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">Transportista</p>
                      {transportistaNombre ? (
                        <p className="text-sm font-semibold text-gray-800">{transportistaNombre}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Sin asignar</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">URL de seguimiento</p>
                      {trackingUrl ? (
                        <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#6BAEC9] hover:underline truncate block">
                          {trackingUrl}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Sin URL</p>
                      )}
                    </div>
                  </div>

                  {/* Cambiar transportista si hay varios configurados */}
                  {transportistasConfig.length > 1 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Cambiar transportista</label>
                      <select
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6BAEC9]"
                        defaultValue=""
                        onChange={(e) => {
                          const carrier = transportistasConfig.find((c) => c.id === e.target.value);
                          if (carrier) {
                            setTransportistaNombre(carrier.name);
                            setTrackingUrl(carrier.trackingUrl);
                          }
                        }}
                      >
                        <option value="" disabled>Seleccionar transportista...</option>
                        {transportistasConfig.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Número de seguimiento + botón Actualizar */}
                  <div className="flex gap-3 items-end border-t border-gray-100 pt-4">
                    <div className="flex-1">
                      <Field
                        label="Número de seguimiento"
                        value={numeroSeguimiento}
                        onChange={setNumeroSeguimiento}
                        placeholder="Introduce el número de seguimiento"
                      />
                    </div>
                    <button
                      onClick={actualizarTransporte}
                      disabled={savingTransporte}
                      className="rounded-lg bg-[#6BAEC9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5FA0B3] disabled:opacity-60 whitespace-nowrap"
                    >
                      {savingTransporte ? "Actualizando..." : "Actualizar envío"}
                    </button>
                  </div>

                  {/* Fecha de envío: auto-registrada al actualizar */}
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">Fecha de envío</p>
                    {fechaEnvio ? (
                      <p className="text-sm font-semibold text-gray-800">{formatDate(fechaEnvio)}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Se registrará automáticamente al actualizar el número de seguimiento</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Coste de envío (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={envioCoste}
                      onChange={(e) => setEnvioCoste(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6BAEC9]"
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Pago */}
            <Card title="Pago">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500">Fecha</th>
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500">Método de pago</th>
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500">Estado</th>
                      <th className="pb-2 text-right text-xs font-semibold text-gray-500">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3 pr-4 text-gray-700">{formatDate(pedido.fechaPedido)}</td>
                      <td className="py-3 pr-4 text-gray-700">{pedido.pagoMetodo}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                          estadoPago === "PAGADO" ? "bg-green-100 text-green-700" :
                          estadoPago === "FALLIDO" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>{estadoPago}</span>
                      </td>
                      <td className="py-3 text-right font-semibold text-gray-800">{formatMoney(totals.total)} €</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {pedido.cuponCodigo && (
                <p className="mt-3 text-sm text-gray-500">Cupón: <span className="font-semibold text-gray-700">{pedido.cuponCodigo}</span></p>
              )}
              {Number(pedido.pagoRecargo) > 0 && (
                <p className="mt-1 text-sm text-gray-500">Recargo: <span className="font-semibold text-gray-700">{formatMoney(pedido.pagoRecargo)} €</span></p>
              )}
            </Card>

            {/* Productos */}
            <Card title={`Productos (${productos.length})`}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left text-xs font-semibold text-gray-500">Producto</th>
                      <th className="pb-2 text-right text-xs font-semibold text-gray-500">Cant.</th>
                      <th className="pb-2 text-right text-xs font-semibold text-gray-500">Precio unit.</th>
                      <th className="pb-2 text-right text-xs font-semibold text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((producto, index) => (
                      <tr key={producto.id} className="border-t border-gray-50">
                        <td className="py-3 pr-3">
                          {(() => {
                            // Si hay variante estructurada, usar sus campos; si no, parsear el nombre
                            const tieneVarianteEstructurada = producto.variante?.tamano || producto.variante?.color || producto.variante?.tirador;
                            const parsed = tieneVarianteEstructurada ? null : parseNombre(producto.nombre);
                            const atributos: { label: string; valor: string }[] = tieneVarianteEstructurada
                              ? [
                                  ...(producto.variante?.tamano ? [{ label: "Tamaño", valor: producto.variante.tamano }] : []),
                                  ...(producto.variante?.color ? [{ label: "Color", valor: producto.variante.color }] : []),
                                  ...(producto.variante?.tirador ? [{ label: "Tirador", valor: producto.variante.tirador }] : []),
                                ]
                              : (parsed?.atributos ?? []);
                            const nombreBase = parsed?.base ?? producto.nombre;
                            return (
                              <>
                                <div className="font-semibold text-gray-800 leading-snug">{nombreBase}</div>
                                {atributos.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {atributos.map((a) => (
                                      <span key={a.label} className="inline-flex items-center gap-1 rounded-md bg-[#6BAEC9]/10 px-2 py-0.5 text-xs text-gray-700">
                                        <span className="font-semibold text-[#6BAEC9]">{a.label}</span> {a.valor}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {producto.producto?.referencia && (
                                  <div className="text-xs text-gray-400 mt-1">Ref. {producto.producto.referencia}</div>
                                )}
                                {atributos.length === 0 && producto.varianteInfo && (() => {
                                  // varianteInfo puede tener formato "Tamaño : 120x180- Tirador : Izquierda"
                                  const parsedInfo = parseNombre(`X - ${producto.varianteInfo}`);
                                  return parsedInfo.atributos.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      {parsedInfo.atributos.map((a) => (
                                        <span key={a.label} className="inline-flex items-center gap-1 rounded-md bg-[#6BAEC9]/10 px-2 py-0.5 text-xs text-gray-700">
                                          <span className="font-semibold text-[#6BAEC9]">{a.label}</span> {a.valor}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500 mt-1">{producto.varianteInfo}</div>
                                  );
                                })()}
                              </>
                            );
                          })()}
                        </td>
                        <td className="py-3 pr-3 text-right align-top pt-4">
                          <input
                            type="number"
                            min="1"
                            value={producto.cantidad}
                            onChange={(e) => updateProduct(index, "cantidad", e.target.value)}
                            className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right"
                          />
                        </td>
                        <td className="py-3 pr-3 text-right align-top pt-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={producto.precioUnitario}
                            onChange={(e) => updateProduct(index, "precioUnitario", e.target.value)}
                            className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right"
                          />
                        </td>
                        <td className="py-3 text-right font-bold text-[#6BAEC9] align-top pt-4">
                          {formatMoney(producto.subtotal)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
                <div className="w-full max-w-xs space-y-1.5 text-sm text-gray-600">
                  <div className="flex justify-between"><span>Subtotal productos</span><span>{formatMoney(totals.subtotal)} €</span></div>
                  <div className="flex justify-between"><span>Envío</span><span>{formatMoney(totals.envio)} €</span></div>
                  {Number(pedido.descuento) > 0 && (
                    <div className="flex justify-between text-green-600"><span>Descuento</span><span>- {formatMoney(pedido.descuento)} €</span></div>
                  )}
                  {Number(pedido.pagoRecargo) > 0 && (
                    <div className="flex justify-between"><span>Recargo pago</span><span>{formatMoney(pedido.pagoRecargo)} €</span></div>
                  )}
                  <div className="flex justify-between font-bold text-gray-800 text-base pt-2 border-t border-gray-200">
                    <span>Total</span><span>{formatMoney(totals.total)} €</span>
                  </div>
                </div>
              </div>
            </Card>

          </div>

          {/* ── Columna lateral ── */}
          <div className="flex flex-col gap-5">

            {/* Cliente */}
            <Card
              title="Cliente"
              action={
                pedido.cliente ? (
                  <Link href={`/admin/clientes/${pedido.cliente.id}`} className="text-xs font-semibold text-[#6BAEC9] hover:underline">
                    Ver ficha →
                  </Link>
                ) : undefined
              }
            >
              <div className="space-y-2 text-sm text-gray-700">
                <p className="font-bold text-gray-900">{pedido.cliente?.nombre || pedido.nombre}</p>
                <p className="text-gray-500">{pedido.cliente?.email || pedido.email}</p>
                {(pedido.cliente?.telefono || pedido.telefono) && (
                  <p className="text-gray-500">{pedido.cliente?.telefono || pedido.telefono}</p>
                )}
                {pedido.cliente?.empresa && <p className="text-gray-500">{pedido.cliente.empresa}</p>}
                {(pedido.cliente?.nif || pedido.nif) && (
                  <p className="text-gray-500">NIF: {pedido.cliente?.nif || pedido.nif}</p>
                )}
                <p className="text-xs text-gray-400 pt-1">ID: #{pedido.clienteId}</p>
              </div>

              {/* Dirección de entrega resumida para etiqueta */}
              {(entrega.nombre || entrega.direccion) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Dirección de entrega</p>
                  <div className="space-y-0.5 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900">
                      {[entrega.nombre, entrega.apellidos].filter(Boolean).join(" ")}
                    </p>
                    {entrega.direccion && <p>{entrega.direccion}</p>}
                    {entrega.direccionComplementaria && <p>{entrega.direccionComplementaria}</p>}
                    <p>
                      {[entrega.codigoPostal, entrega.ciudad, entrega.provincia].filter(Boolean).join(" ")}
                    </p>
                    {entrega.telefono && <p>{entrega.telefono}</p>}
                  </div>
                </div>
              )}
            </Card>

            {/* Direcciones */}
            <Card
              title="Direcciones"
              action={
                tabDireccion === "facturacion" ? (
                  <button type="button" onClick={() => setFacturacion({ ...entrega })} className="text-xs font-semibold text-[#6BAEC9] hover:underline">
                    Copiar entrega
                  </button>
                ) : undefined
              }
            >
              {/* Pestañas */}
              <div className="flex gap-1 mb-4 border-b border-gray-100 pb-3">
                <button
                  type="button"
                  onClick={() => setTabDireccion("entrega")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    tabDireccion === "entrega" ? "bg-[#6BAEC9] text-white" : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Entrega
                </button>
                <button
                  type="button"
                  onClick={() => setTabDireccion("facturacion")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    tabDireccion === "facturacion" ? "bg-[#6BAEC9] text-white" : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Facturación
                </button>
              </div>

              {tabDireccion === "entrega" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nombre" value={entrega.nombre} onChange={(v) => setEntrega((p) => ({ ...p, nombre: v }))} />
                  <Field label="Apellidos" value={entrega.apellidos} onChange={(v) => setEntrega((p) => ({ ...p, apellidos: v }))} />
                  <Field label="Teléfono" value={entrega.telefono} onChange={(v) => setEntrega((p) => ({ ...p, telefono: v }))} />
                  <Field label="NIF" value={entrega.nif} onChange={(v) => setEntrega((p) => ({ ...p, nif: v }))} />
                  <div className="col-span-2">
                    <Field label="Dirección" value={entrega.direccion} onChange={(v) => setEntrega((p) => ({ ...p, direccion: v }))} />
                  </div>
                  <div className="col-span-2">
                    <Field label="Dirección 2" value={entrega.direccionComplementaria} onChange={(v) => setEntrega((p) => ({ ...p, direccionComplementaria: v }))} />
                  </div>
                  <Field label="C.P." value={entrega.codigoPostal} onChange={(v) => setEntrega((p) => ({ ...p, codigoPostal: v }))} />
                  <Field label="Ciudad" value={entrega.ciudad} onChange={(v) => setEntrega((p) => ({ ...p, ciudad: v }))} />
                  <div className="col-span-2">
                    <Field label="Provincia" value={entrega.provincia} onChange={(v) => setEntrega((p) => ({ ...p, provincia: v }))} />
                  </div>
                  <div className="col-span-2">
                    <Field label="País" value={entrega.pais} onChange={(v) => setEntrega((p) => ({ ...p, pais: v }))} />
                  </div>
                </div>
              )}

              {tabDireccion === "facturacion" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nombre" value={facturacion.nombre} onChange={(v) => setFacturacion((p) => ({ ...p, nombre: v }))} />
                  <Field label="Apellidos" value={facturacion.apellidos} onChange={(v) => setFacturacion((p) => ({ ...p, apellidos: v }))} />
                  <Field label="Empresa" value={facturacion.empresa} onChange={(v) => setFacturacion((p) => ({ ...p, empresa: v }))} />
                  <Field label="NIF" value={facturacion.nif} onChange={(v) => setFacturacion((p) => ({ ...p, nif: v }))} />
                  <div className="col-span-2">
                    <Field label="Dirección" value={facturacion.direccion} onChange={(v) => setFacturacion((p) => ({ ...p, direccion: v }))} />
                  </div>
                  <div className="col-span-2">
                    <Field label="Dirección 2" value={facturacion.direccionComplementaria} onChange={(v) => setFacturacion((p) => ({ ...p, direccionComplementaria: v }))} />
                  </div>
                  <Field label="C.P." value={facturacion.codigoPostal} onChange={(v) => setFacturacion((p) => ({ ...p, codigoPostal: v }))} />
                  <Field label="Ciudad" value={facturacion.ciudad} onChange={(v) => setFacturacion((p) => ({ ...p, ciudad: v }))} />
                  <div className="col-span-2">
                    <Field label="Provincia" value={facturacion.provincia} onChange={(v) => setFacturacion((p) => ({ ...p, provincia: v }))} />
                  </div>
                  <div className="col-span-2">
                    <Field label="País" value={facturacion.pais} onChange={(v) => setFacturacion((p) => ({ ...p, pais: v }))} />
                  </div>
                </div>
              )}
            </Card>

            {/* Mensajes */}
            <Card title={`Mensajes (${mensajes.length})`}>
              <div className="space-y-3 mb-5 max-h-80 overflow-auto">
                {mensajes.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin mensajes.</p>
                ) : mensajes.map((msg) => (
                  <div key={msg.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">
                        {msg.autorNombre || msg.autor || "Sistema"}
                        {msg.privado && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">Privado</span>}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{msg.mensaje}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <TextArea label="Nuevo mensaje" value={mensajeNuevo} onChange={setMensajeNuevo} rows={3} />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={mensajePrivado} onChange={(e) => setMensajePrivado(e.target.checked)} />
                    Mensaje privado
                  </label>
                  <button
                    type="button"
                    onClick={addMessage}
                    className="rounded-lg bg-[#6BAEC9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5FA0B3]"
                  >
                    Enviar mensaje
                  </button>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
