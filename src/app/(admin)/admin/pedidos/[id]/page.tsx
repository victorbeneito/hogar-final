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
  factura?: { numeroFactura: string; total: number; fechaFactura: string } | null;
  productos: OrderProduct[];
  mensajes: OrderMessage[];
};

const TABS = ["pedido", "cliente", "direcciones", "transporte", "mensajes", "pago", "productos", "resumen"] as const;
type TabKey = (typeof TABS)[number];

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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
        active ? "bg-[#6BAEC9] text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
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
      <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#6BAEC9] disabled:bg-gray-100 disabled:text-gray-500"
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
      <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#6BAEC9]"
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
  const [activeTab, setActiveTab] = useState<TabKey>("pedido");
  const [estado, setEstado] = useState("");
  const [estadoPago, setEstadoPago] = useState("");
  const [notas, setNotas] = useState("");
  const [transportistaNombre, setTransportistaNombre] = useState("");
  const [numeroSeguimiento, setNumeroSeguimiento] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [fechaEnvio, setFechaEnvio] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [facturacion, setFacturacion] = useState<Address>(emptyAddress());
  const [entrega, setEntrega] = useState<Address>(emptyAddress());
  const [productos, setProductos] = useState<OrderProduct[]>([]);
  const [mensajeNuevo, setMensajeNuevo] = useState("");
  const [mensajePrivado, setMensajePrivado] = useState(false);
  const [mensajes, setMensajes] = useState<OrderMessage[]>([]);

  useEffect(() => {
    const loadPedido = async () => {
      try {
        const res = await fetch(`/api/pedidos/${id}`);
        const data = await res.json();
        if (!data.ok || !data.pedido) {
          throw new Error(data.error || "Pedido no encontrado");
        }

        const current: Pedido = data.pedido;
        setPedido(current);
        setEstado(current.estado || "PENDIENTE");
        setEstadoPago(current.estadoPago || "PENDIENTE");
        setNotas(current.notas || "");
        setTransportistaNombre(current.transportistaNombre || "");
        setNumeroSeguimiento(current.numeroSeguimiento || "");
        setTrackingUrl(current.trackingUrl || "");
        setFechaEnvio(current.fechaEnvio ? current.fechaEnvio.slice(0, 16) : "");
        setFechaEntrega(current.fechaEntrega ? current.fechaEntrega.slice(0, 16) : "");
        setFacturacion(mapAddress(current.direccionFacturacion, current.direccionEntrega));
        setEntrega(mapAddress(current.direccionEntrega));
        setProductos(current.productos || []);
        setMensajes(current.mensajes || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadPedido();
  }, [id]);

  const totals = useMemo(() => {
    const subtotal = productos.reduce((acc, item) => acc + Number(item.subtotal || item.cantidad * item.precioUnitario), 0);
    const envio = pedido ? Number(pedido.envioCoste || 0) : 0;
    const descuento = pedido ? Number(pedido.descuento || 0) : 0;
    const recargo = pedido ? Number(pedido.pagoRecargo || 0) : 0;
    const total = Math.max(0, subtotal + envio + recargo - descuento);
    return { subtotal, envio, descuento, recargo, total };
  }, [pedido, productos]);

  const updateProduct = (index: number, field: keyof OrderProduct, value: string) => {
    setProductos((prev) =>
      prev.map((item, currentIndex) => {
        if (currentIndex !== index) return item;
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
          envioCoste: pedido.envioCoste,
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
      setTransportistaNombre(data.pedido.transportistaNombre || transportistaNombre);
      setNumeroSeguimiento(data.pedido.numeroSeguimiento || numeroSeguimiento);
      setTrackingUrl(data.pedido.trackingUrl || trackingUrl);
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
        body: JSON.stringify({
          mensaje: mensajeNuevo,
          privado: mensajePrivado,
          autor: "admin",
          autorNombre: "Administrador",
        }),
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando pedido...</div>;
  }

  if (!pedido) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Pedido no encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-6 md:py-8 px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-sm text-gray-500">Pedidos</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#4A4A4A]">
            Pedido {pedido.numeroPedido} de {pedido.cliente?.nombre || pedido.nombre}
          </h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Estado</p>
            <p className="mt-2 text-lg font-bold text-gray-800">{pedido.estado}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Total</p>
            <p className="mt-2 text-lg font-bold text-[#6BAEC9]">{formatMoney(totals.total)} €</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Mensajes</p>
            <p className="mt-2 text-lg font-bold text-gray-800">{mensajes.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Productos</p>
            <p className="mt-2 text-lg font-bold text-gray-800">{productos.length}</p>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-[#6BAEC9]/10 shadow-xl overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                  {tab === "pedido" && "Pedido"}
                  {tab === "cliente" && "Cliente"}
                  {tab === "direcciones" && "Direcciones"}
                  {tab === "transporte" && "Transporte"}
                  {tab === "mensajes" && "Mensajes"}
                  {tab === "pago" && "Pago"}
                  {tab === "productos" && "Productos"}
                  {tab === "resumen" && "Resumen"}
                </TabButton>
              ))}
            </div>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === "pedido" && (
              <div className="space-y-6">
                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 rounded-2xl border border-gray-100 p-5 bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Nº pedido</p>
                        <p className="text-2xl font-bold text-[#4A4A4A]">{pedido.numeroPedido}</p>
                        <p className="text-sm text-gray-500 mt-1">Creado el {formatDate(pedido.fechaPedido)}</p>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <label className="min-w-[180px]">
                          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Estado</span>
                          <select
                            value={estado}
                            onChange={(e) => setEstado(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                          >
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="PROCESANDO">PROCESANDO</option>
                            <option value="ENVIADO">ENVIADO</option>
                            <option value="ENTREGADO">ENTREGADO</option>
                            <option value="CANCELADO">CANCELADO</option>
                            <option value="DEVUELTO">DEVUELTO</option>
                          </select>
                        </label>
                        <label className="min-w-[180px]">
                          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Estado pago</span>
                          <select
                            value={estadoPago}
                            onChange={(e) => setEstadoPago(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                          >
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="PAGADO">PAGADO</option>
                            <option value="FALLIDO">FALLIDO</option>
                            <option value="REEMBOLSADO">REEMBOLSADO</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 p-5">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Notas internas</p>
                    <TextArea label="Notas" value={notas} onChange={setNotas} rows={6} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "cliente" && (
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#4A4A4A]">Datos del cliente</h2>
                    {pedido.cliente && (
                      <Link href={`/admin/clientes/${pedido.cliente.id}`} className="text-sm font-semibold text-[#6BAEC9] hover:underline">
                        Ver ficha
                      </Link>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Nombre" value={pedido.cliente?.nombre || pedido.nombre} onChange={() => {}} disabled />
                    <Field label="Email" value={pedido.cliente?.email || pedido.email} onChange={() => {}} disabled />
                    <Field label="Teléfono" value={pedido.cliente?.telefono || pedido.telefono} onChange={() => {}} disabled />
                    <Field label="Empresa" value={pedido.cliente?.empresa || ""} onChange={() => {}} disabled />
                    <Field label="NIF" value={pedido.cliente?.nif || pedido.nif} onChange={() => {}} disabled />
                    <Field label="ID cliente" value={String(pedido.clienteId)} onChange={() => {}} disabled />
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-lg font-bold text-[#4A4A4A] mb-4">Resumen</h2>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p><span className="font-semibold">Fecha:</span> {formatDate(pedido.fechaPedido)}</p>
                    <p><span className="font-semibold">Última actualización:</span> {formatDate(pedido.updatedAt)}</p>
                    <p><span className="font-semibold">Estado pedido:</span> {pedido.estado}</p>
                    <p><span className="font-semibold">Estado pago:</span> {pedido.estadoPago}</p>
                    <p><span className="font-semibold">Total:</span> {formatMoney(totals.total)} €</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "direcciones" && (
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50">
                  <h2 className="text-lg font-bold text-[#4A4A4A] mb-4">Dirección de entrega</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Nombre" value={entrega.nombre} onChange={(value) => setEntrega((prev) => ({ ...prev, nombre: value }))} />
                    <Field label="Apellidos" value={entrega.apellidos} onChange={(value) => setEntrega((prev) => ({ ...prev, apellidos: value }))} />
                    <Field label="Empresa" value={entrega.empresa} onChange={(value) => setEntrega((prev) => ({ ...prev, empresa: value }))} />
                    <Field label="NIF" value={entrega.nif} onChange={(value) => setEntrega((prev) => ({ ...prev, nif: value }))} />
                    <Field label="Teléfono" value={entrega.telefono} onChange={(value) => setEntrega((prev) => ({ ...prev, telefono: value }))} />
                    <Field label="Código postal" value={entrega.codigoPostal} onChange={(value) => setEntrega((prev) => ({ ...prev, codigoPostal: value }))} />
                    <Field label="Ciudad" value={entrega.ciudad} onChange={(value) => setEntrega((prev) => ({ ...prev, ciudad: value }))} />
                    <Field label="Provincia" value={entrega.provincia} onChange={(value) => setEntrega((prev) => ({ ...prev, provincia: value }))} />
                    <Field label="País" value={entrega.pais} onChange={(value) => setEntrega((prev) => ({ ...prev, pais: value }))} />
                    <div className="md:col-span-2">
                      <Field label="Dirección" value={entrega.direccion} onChange={(value) => setEntrega((prev) => ({ ...prev, direccion: value }))} />
                    </div>
                    <div className="md:col-span-2">
                      <Field
                        label="Dirección 2"
                        value={entrega.direccionComplementaria}
                        onChange={(value) => setEntrega((prev) => ({ ...prev, direccionComplementaria: value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#4A4A4A]">Dirección de facturación</h2>
                    <button
                      type="button"
                      onClick={() => setFacturacion({ ...entrega })}
                      className="text-sm font-semibold text-[#6BAEC9] hover:underline"
                    >
                      Copiar desde entrega
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Nombre" value={facturacion.nombre} onChange={(value) => setFacturacion((prev) => ({ ...prev, nombre: value }))} />
                    <Field label="Apellidos" value={facturacion.apellidos} onChange={(value) => setFacturacion((prev) => ({ ...prev, apellidos: value }))} />
                    <Field label="Empresa" value={facturacion.empresa} onChange={(value) => setFacturacion((prev) => ({ ...prev, empresa: value }))} />
                    <Field label="NIF" value={facturacion.nif} onChange={(value) => setFacturacion((prev) => ({ ...prev, nif: value }))} />
                    <Field label="Teléfono" value={facturacion.telefono} onChange={(value) => setFacturacion((prev) => ({ ...prev, telefono: value }))} />
                    <Field label="Código postal" value={facturacion.codigoPostal} onChange={(value) => setFacturacion((prev) => ({ ...prev, codigoPostal: value }))} />
                    <Field label="Ciudad" value={facturacion.ciudad} onChange={(value) => setFacturacion((prev) => ({ ...prev, ciudad: value }))} />
                    <Field label="Provincia" value={facturacion.provincia} onChange={(value) => setFacturacion((prev) => ({ ...prev, provincia: value }))} />
                    <Field label="País" value={facturacion.pais} onChange={(value) => setFacturacion((prev) => ({ ...prev, pais: value }))} />
                    <div className="md:col-span-2">
                      <Field label="Dirección" value={facturacion.direccion} onChange={(value) => setFacturacion((prev) => ({ ...prev, direccion: value }))} />
                    </div>
                    <div className="md:col-span-2">
                      <Field
                        label="Dirección 2"
                        value={facturacion.direccionComplementaria}
                        onChange={(value) => setFacturacion((prev) => ({ ...prev, direccionComplementaria: value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "transporte" && (
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50 space-y-4">
                  <h2 className="text-lg font-bold text-[#4A4A4A]">Envío y seguimiento</h2>
                  <Field label="Transportista" value={transportistaNombre} onChange={setTransportistaNombre} />
                  <Field label="Número de seguimiento" value={numeroSeguimiento} onChange={setNumeroSeguimiento} />
                  <Field label="URL de seguimiento" value={trackingUrl} onChange={setTrackingUrl} />
                  <Field label="Fecha de envío" type="datetime-local" value={fechaEnvio} onChange={setFechaEnvio} />
                  <Field label="Fecha de entrega" type="datetime-local" value={fechaEntrega} onChange={setFechaEntrega} />
                </div>
                <div className="rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-lg font-bold text-[#4A4A4A] mb-4">Estado del transporte</h2>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p><span className="font-semibold">Método:</span> {pedido.envioMetodo}</p>
                    <p><span className="font-semibold">Coste:</span> {formatMoney(pedido.envioCoste)} €</p>
                    <p><span className="font-semibold">Transportista:</span> {transportistaNombre || "Sin asignar"}</p>
                    <p><span className="font-semibold">Seguimiento:</span> {numeroSeguimiento || "Pendiente"}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "mensajes" && (
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50">
                  <h2 className="text-lg font-bold text-[#4A4A4A] mb-4">Mensajes del pedido</h2>
                  <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                    {mensajes.length === 0 ? (
                      <p className="text-sm text-gray-500">Todavía no hay mensajes.</p>
                    ) : (
                      mensajes.map((mensaje) => (
                        <div key={mensaje.id} className="rounded-xl border border-gray-100 bg-white p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-sm font-semibold text-gray-700">
                              {mensaje.autorNombre || mensaje.autor || "Sistema"}
                              {mensaje.privado ? <span className="ml-2 rounded-full bg-[#F7A38B]/20 px-2 py-0.5 text-xs font-semibold text-[#F7A38B]">Privado</span> : null}
                            </p>
                            <p className="text-xs text-gray-400">{formatDate(mensaje.createdAt)}</p>
                          </div>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{mensaje.mensaje}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-lg font-bold text-[#4A4A4A] mb-4">Añadir mensaje</h2>
                  <div className="space-y-4">
                    <TextArea label="Mensaje" value={mensajeNuevo} onChange={setMensajeNuevo} rows={6} />
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" checked={mensajePrivado} onChange={(e) => setMensajePrivado(e.target.checked)} />
                      Marcar como privado
                    </label>
                    <button
                      type="button"
                      onClick={addMessage}
                      className="rounded-xl bg-[#6BAEC9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5FA0B3]"
                    >
                      Guardar mensaje
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pago" && (
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50 space-y-4">
                  <h2 className="text-lg font-bold text-[#4A4A4A]">Pago</h2>
                  <Field label="Método de pago" value={pedido.pagoMetodo} onChange={() => {}} disabled />
                  <Field label="Estado del pago" value={estadoPago} onChange={setEstadoPago} />
                  <Field label="Recargo" value={formatMoney(pedido.pagoRecargo)} onChange={() => {}} disabled />
                  <Field label="Cupon" value={pedido.cuponCodigo || ""} onChange={() => {}} disabled />
                </div>
                <div className="rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-lg font-bold text-[#4A4A4A] mb-4">Resumen del pago</h2>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p><span className="font-semibold">Subtotal:</span> {formatMoney(totals.subtotal)} €</p>
                    <p><span className="font-semibold">Envío:</span> {formatMoney(totals.envio)} €</p>
                    <p><span className="font-semibold">Descuento:</span> - {formatMoney(pedido.descuento)} €</p>
                    <p><span className="font-semibold">Recargo:</span> {formatMoney(totals.recargo)} €</p>
                    <p className="text-xl font-bold text-[#4A4A4A] pt-2 border-t">Total: {formatMoney(totals.total)} €</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "productos" && (
              <div className="space-y-5">
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Producto</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Variante</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Cantidad</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Precio</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map((producto, index) => (
                        <tr key={producto.id} className="border-t">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-800">{producto.nombre}</div>
                            <div className="text-xs text-gray-400">
                              {producto.producto?.referencia ? `Ref. ${producto.producto.referencia}` : ""}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={producto.varianteInfo || ""}
                              onChange={(e) => updateProduct(index, "varianteInfo", e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="1"
                              value={producto.cantidad}
                              onChange={(e) => updateProduct(index, "cantidad", e.target.value)}
                              className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-right"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={producto.precioUnitario}
                              onChange={(e) => updateProduct(index, "precioUnitario", e.target.value)}
                              className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-right"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[#6BAEC9]">
                            {formatMoney(producto.subtotal)} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 w-full max-w-md">
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(totals.subtotal)} €</span></div>
                      <div className="flex justify-between"><span>Envío</span><span>{formatMoney(totals.envio)} €</span></div>
                      <div className="flex justify-between"><span>Descuento</span><span>- {formatMoney(pedido.descuento)} €</span></div>
                      <div className="flex justify-between font-bold text-gray-800 pt-2 border-t"><span>Total</span><span>{formatMoney(totals.total)} €</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "resumen" && (
              <div className="grid lg:grid-cols-3 gap-5">
                <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50">
                  <h2 className="text-lg font-bold text-[#4A4A4A] mb-4">Resumen general</h2>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><span className="font-semibold">Pedido:</span> {pedido.numeroPedido}</p>
                    <p><span className="font-semibold">Cliente:</span> {pedido.cliente?.nombre || pedido.nombre}</p>
                    <p><span className="font-semibold">Fecha:</span> {formatDate(pedido.fechaPedido)}</p>
                    <p><span className="font-semibold">Pago:</span> {pedido.pagoMetodo}</p>
                    <p><span className="font-semibold">Envío:</span> {pedido.envioMetodo}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-lg font-bold text-[#4A4A4A] mb-4">Importes</h2>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p className="flex justify-between"><span>Subtotal</span><span>{formatMoney(totals.subtotal)} €</span></p>
                    <p className="flex justify-between"><span>Envío</span><span>{formatMoney(totals.envio)} €</span></p>
                    <p className="flex justify-between"><span>Descuento</span><span>- {formatMoney(pedido.descuento)} €</span></p>
                    <p className="flex justify-between"><span>Recargo pago</span><span>{formatMoney(totals.recargo)} €</span></p>
                    <p className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t"><span>Total</span><span>{formatMoney(totals.total)} €</span></p>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-lg font-bold text-[#4A4A4A] mb-4">Acciones</h2>
                  <div className="space-y-3">
                    <button
                      onClick={savePedido}
                      disabled={saving}
                      className="w-full rounded-xl bg-[#6BAEC9] px-4 py-3 text-sm font-semibold text-white hover:bg-[#5FA0B3] disabled:opacity-60"
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button
                      onClick={() => router.push("/admin/pedidos")}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Volver a pedidos
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 p-4 md:p-6 flex flex-col md:flex-row gap-3 justify-end">
            <button
              onClick={() => router.push("/admin/pedidos")}
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Volver
            </button>
            <button
              onClick={savePedido}
              disabled={saving}
              className="rounded-xl bg-[#6BAEC9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#5FA0B3] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
