"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LineaPedido = {
  nombre: string;
  varianteInfo: string;
  cantidad: number;
  precioUnitario: number;
};

type ClienteForm = {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  nif: string;
  empresa: string;
  direccion: string;
  direccionComplementaria: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
};

const emptyCliente: ClienteForm = {
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
};

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#6BAEC9]"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#6BAEC9]"
      />
    </label>
  );
}

export default function NuevoPedidoPage() {
  const router = useRouter();
  const [cliente, setCliente] = useState<ClienteForm>(emptyCliente);
  const [facturacion, setFacturacion] = useState<ClienteForm>(emptyCliente);
  const [copiarFacturacion, setCopiarFacturacion] = useState(true);
  const [estado, setEstado] = useState("PENDIENTE");
  const [estadoPago, setEstadoPago] = useState("PENDIENTE");
  const [pagoMetodo, setPagoMetodo] = useState("transferencia");
  const [envioMetodo, setEnvioMetodo] = useState("delivery");
  const [transportistaNombre, setTransportistaNombre] = useState("");
  const [numeroSeguimiento, setNumeroSeguimiento] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<LineaPedido[]>([
    { nombre: "", varianteInfo: "", cantidad: 1, precioUnitario: 0 },
  ]);
  const [envioCoste, setEnvioCoste] = useState(0);
  const [descuento, setDescuento] = useState(0);
  const [saving, setSaving] = useState(false);

  const subtotal = useMemo(
    () => lineas.reduce((acc, item) => acc + Number(item.cantidad || 0) * Number(item.precioUnitario || 0), 0),
    [lineas]
  );
  const totalFinal = Math.max(0, subtotal + Number(envioCoste || 0) - Number(descuento || 0));

  const updateCliente = (field: keyof ClienteForm, value: string) => {
    setCliente((prev) => ({ ...prev, [field]: value }));
    if (copiarFacturacion) {
      setFacturacion((prev) => ({ ...prev, [field]: value }));
    }
  };

  const updateFacturacion = (field: keyof ClienteForm, value: string) => {
    setFacturacion((prev) => ({ ...prev, [field]: value }));
  };

  const updateLinea = (index: number, field: keyof LineaPedido, value: string) => {
    setLineas((prev) =>
      prev.map((item, current) => {
        if (current !== index) return item;
        const next = { ...item } as LineaPedido;
        if (field === "cantidad" || field === "precioUnitario") {
          (next[field] as any) = Number(value);
        } else {
          (next[field] as any) = value;
        }
        return next;
      })
    );
  };

  const addLinea = () => setLineas((prev) => [...prev, { nombre: "", varianteInfo: "", cantidad: 1, precioUnitario: 0 }]);
  const removeLinea = (index: number) => setLineas((prev) => prev.filter((_, current) => current !== index));

  const handleSubmit = async () => {
    if (!cliente.nombre || !cliente.email) {
      alert("Nombre y email son obligatorios");
      return;
    }
    if (lineas.length === 0 || lineas.some((linea) => !linea.nombre || !linea.cantidad)) {
      alert("Añade al menos una línea de pedido válida");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origen: "admin-manual",
          cliente: {
            ...cliente,
            facturacion: facturacion,
          },
          carrito: lineas,
          metodoPago: { metodo: pagoMetodo },
          metodoEnvio: {
            metodo: envioMetodo,
            carrierName: transportistaNombre,
            label: transportistaNombre || (envioMetodo === "pickup" ? "Recogida en tienda" : "Envío manual"),
            coste: Number(envioCoste || 0),
          },
          pagoRecargo: 0,
          estadoPago,
          estado,
          subtotal,
          descuentoAplicado: descuento,
          totalFinal,
          notas,
          numeroSeguimiento,
          trackingUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo crear el pedido");

      router.push(`/admin/pedidos/${data.pedido.id}`);
    } catch (error: any) {
      alert(error.message || "Error al crear el pedido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] px-3 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-sm text-gray-500">Pedidos</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#4A4A4A]">Nuevo pedido</h1>
        </div>

        <div className="rounded-3xl border border-[#6BAEC9]/10 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-4 md:px-6">
            <button
              onClick={() => router.push("/admin/pedidos")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              ← Volver a pedidos
            </button>
          </div>

          <div className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
            <section className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5">
              <h2 className="text-lg font-bold text-[#4A4A4A]">Datos del cliente</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre" value={cliente.nombre} onChange={(v) => updateCliente("nombre", v)} />
                <Field label="Apellidos" value={cliente.apellidos} onChange={(v) => updateCliente("apellidos", v)} />
                <Field label="Email" value={cliente.email} onChange={(v) => updateCliente("email", v)} />
                <Field label="Teléfono" value={cliente.telefono} onChange={(v) => updateCliente("telefono", v)} />
                <Field label="NIF" value={cliente.nif} onChange={(v) => updateCliente("nif", v)} />
                <Field label="Empresa" value={cliente.empresa} onChange={(v) => updateCliente("empresa", v)} />
                <Field label="Dirección" value={cliente.direccion} onChange={(v) => updateCliente("direccion", v)} />
                <Field label="CP" value={cliente.codigoPostal} onChange={(v) => updateCliente("codigoPostal", v)} />
                <Field label="Ciudad" value={cliente.ciudad} onChange={(v) => updateCliente("ciudad", v)} />
                <Field label="Provincia" value={cliente.provincia} onChange={(v) => updateCliente("provincia", v)} />
                <Field label="País" value={cliente.pais} onChange={(v) => updateCliente("pais", v)} />
                <div className="md:col-span-2">
                  <TextArea
                    label="Dirección 2"
                    value={cliente.direccionComplementaria}
                    onChange={(v) => updateCliente("direccionComplementaria", v)}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-[#4A4A4A]">Facturación</h2>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={copiarFacturacion}
                    onChange={(e) => {
                      setCopiarFacturacion(e.target.checked);
                      if (e.target.checked) setFacturacion({ ...cliente });
                    }}
                  />
                  Igual que entrega
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre" value={facturacion.nombre} onChange={(v) => updateFacturacion("nombre", v)} />
                <Field label="Apellidos" value={facturacion.apellidos} onChange={(v) => updateFacturacion("apellidos", v)} />
                <Field label="Empresa" value={facturacion.empresa} onChange={(v) => updateFacturacion("empresa", v)} />
                <Field label="NIF" value={facturacion.nif} onChange={(v) => updateFacturacion("nif", v)} />
                <Field label="Teléfono" value={facturacion.telefono} onChange={(v) => updateFacturacion("telefono", v)} />
                <Field label="Dirección" value={facturacion.direccion} onChange={(v) => updateFacturacion("direccion", v)} />
                <Field label="CP" value={facturacion.codigoPostal} onChange={(v) => updateFacturacion("codigoPostal", v)} />
                <Field label="Ciudad" value={facturacion.ciudad} onChange={(v) => updateFacturacion("ciudad", v)} />
                <Field label="Provincia" value={facturacion.provincia} onChange={(v) => updateFacturacion("provincia", v)} />
                <Field label="País" value={facturacion.pais} onChange={(v) => updateFacturacion("pais", v)} />
                <div className="md:col-span-2">
                  <TextArea
                    label="Dirección 2"
                    value={facturacion.direccionComplementaria}
                    onChange={(v) => updateFacturacion("direccionComplementaria", v)}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5">
              <h2 className="text-lg font-bold text-[#4A4A4A]">Transporte y pago</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Estado</span>
                  <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="PROCESANDO">PROCESANDO</option>
                    <option value="ENVIADO">ENVIADO</option>
                    <option value="ENTREGADO">ENTREGADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                    <option value="DEVUELTO">DEVUELTO</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Estado pago</span>
                  <select value={estadoPago} onChange={(e) => setEstadoPago(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="PAGADO">PAGADO</option>
                    <option value="FALLIDO">FALLIDO</option>
                    <option value="REEMBOLSADO">REEMBOLSADO</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Método pago</span>
                  <select value={pagoMetodo} onChange={(e) => setPagoMetodo(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
                    <option value="tarjeta">Tarjeta</option>
                    <option value="paypal">PayPal</option>
                    <option value="bizum">Bizum</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="contrareembolso">Contrareembolso</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Método envío</span>
                  <select value={envioMetodo} onChange={(e) => setEnvioMetodo(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
                    <option value="delivery">Envío</option>
                    <option value="pickup">Recogida</option>
                  </select>
                </label>
                <Field label="Transportista" value={transportistaNombre} onChange={setTransportistaNombre} />
                <Field label="Coste envío" type="number" value={String(envioCoste)} onChange={(v) => setEnvioCoste(Number(v))} />
                <Field label="Seguimiento" value={numeroSeguimiento} onChange={setNumeroSeguimiento} />
                <Field label="URL seguimiento" value={trackingUrl} onChange={setTrackingUrl} />
                <Field label="Descuento" type="number" value={String(descuento)} onChange={(v) => setDescuento(Number(v))} />
              </div>
              <TextArea label="Notas internas" value={notas} onChange={setNotas} rows={4} />
            </section>

            <section className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5 md:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#4A4A4A]">Líneas del pedido</h2>
                <button onClick={addLinea} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  + Añadir línea
                </button>
              </div>

              <div className="space-y-3">
                {lineas.map((linea, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-[2fr_1.2fr_0.7fr_0.9fr_auto]">
                    <Field label="Producto" value={linea.nombre} onChange={(v) => updateLinea(index, "nombre", v)} />
                    <Field label="Variante" value={linea.varianteInfo} onChange={(v) => updateLinea(index, "varianteInfo", v)} />
                    <Field label="Cant." type="number" value={String(linea.cantidad)} onChange={(v) => updateLinea(index, "cantidad", v)} />
                    <Field label="Precio" type="number" value={String(linea.precioUnitario)} onChange={(v) => updateLinea(index, "precioUnitario", v)} />
                    <div className="flex items-end">
                      <button
                        onClick={() => removeLinea(index)}
                        disabled={lineas.length === 1}
                        className="h-[42px] rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#F7A38B] disabled:opacity-40"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5 md:col-span-2">
              <h2 className="text-lg font-bold text-[#4A4A4A]">Resumen</h2>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Subtotal</p>
                  <p className="mt-2 text-lg font-bold text-[#6BAEC9]">{subtotal.toFixed(2)} €</p>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Envío</p>
                  <p className="mt-2 text-lg font-bold text-[#6BAEC9]">{Number(envioCoste).toFixed(2)} €</p>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Descuento</p>
                  <p className="mt-2 text-lg font-bold text-[#6BAEC9]">- {Number(descuento).toFixed(2)} €</p>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
                  <p className="mt-2 text-lg font-bold text-[#4A4A4A]">{totalFinal.toFixed(2)} €</p>
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-4 py-4 md:flex-row md:justify-end md:px-6">
            <button
              onClick={() => router.push("/admin/pedidos")}
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-xl bg-[#6BAEC9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#5FA0B3] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Crear pedido"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
