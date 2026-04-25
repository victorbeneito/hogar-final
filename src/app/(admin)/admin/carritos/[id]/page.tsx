"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type CartDetail = {
  id: number;
  sessionId: string;
  clienteId: number | null;
  cliente: {
    id: number;
    nombre: string;
    email: string;
    telefono: string;
    empresa: string | null;
    nif: string | null;
    direccion: string | null;
    direccionComplementaria: string | null;
    codigoPostal: string | null;
    ciudad: string | null;
    provincia: string | null;
    pais: string | null;
  } | null;
  total: number;
  totalItems: number;
  estado: "activo" | "abandonado" | "convertido";
  createdAt: string | null;
  updatedAt: string | null;
  pedido: { id: number; numeroPedido: string; estado: string; estadoPago?: string; totalFinal: number; fechaPedido?: string | null } | null;
  items: Array<{
    id: number;
    productoId: number;
    varianteId: number | null;
    nombre: string;
    precio: number;
    cantidad: number;
    imagen: string | null;
  }>;
};

const tabs = ["carrito", "cliente", "items", "pedido"] as const;
type TabId = (typeof tabs)[number];

export default function CarritoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [carrito, setCarrito] = useState<CartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("carrito");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/carritos/${params.id}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "No se ha podido cargar el carrito");
        setCarrito(data.carrito);
      } catch (error: any) {
        toast.error(error.message || "Error cargando carrito");
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, [params.id]);

  const estadoBadge = useMemo(() => {
    if (!carrito) return "";
    if (carrito.estado === "abandonado") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    if (carrito.estado === "convertido") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }, [carrito]);

  const eliminar = async () => {
    if (!carrito) return;
    if (!window.confirm("¿Eliminar este carrito?")) return;

    const res = await fetch(`/api/carritos/${carrito.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.ok) {
      toast.error(data.error || "No se ha podido eliminar");
      return;
    }

    toast.success("Carrito eliminado");
    router.push("/admin/carritos");
  };

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">Cargando carrito...</div>;
  }

  if (!carrito) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-gray-500 dark:text-gray-400">Carrito no encontrado.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/admin/carritos" className="hover:underline">
              Carritos
            </Link>{" "}
            / #{carrito.id}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Carrito #{carrito.id}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{carrito.sessionId}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {carrito.pedido && (
            <Link
              href={`/admin/pedidos/${carrito.pedido.id}`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Ver pedido
            </Link>
          )}
          <button
            onClick={eliminar}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 dark:border-red-900/50 dark:bg-darkNavBg"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${estadoBadge}`}>{carrito.estado}</span>
        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {carrito.totalItems} productos
        </span>
        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {carrito.total.toFixed(2)} €
        </span>
      </div>

      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkNavBg overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition ${
                tab === item
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          {tab === "carrito" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-xs uppercase tracking-wider text-gray-400">Última actividad</div>
                <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {carrito.updatedAt ? new Date(carrito.updatedAt).toLocaleString("es-ES") : "-"}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-xs uppercase tracking-wider text-gray-400">Creado</div>
                <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {carrito.createdAt ? new Date(carrito.createdAt).toLocaleString("es-ES") : "-"}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-xs uppercase tracking-wider text-gray-400">Pedido asociado</div>
                <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {carrito.pedido ? carrito.pedido.numeroPedido : "Sin pedido"}
                </div>
              </div>
            </div>
          )}

          {tab === "cliente" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Datos del cliente</div>
                {carrito.cliente ? (
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div><strong>Nombre:</strong> {carrito.cliente.nombre}</div>
                    <div><strong>Email:</strong> {carrito.cliente.email}</div>
                    <div><strong>Teléfono:</strong> {carrito.cliente.telefono || "-"}</div>
                    <div><strong>Empresa:</strong> {carrito.cliente.empresa || "-"}</div>
                    <div><strong>NIF:</strong> {carrito.cliente.nif || "-"}</div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No hay cliente vinculado.</p>
                )}
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Dirección guardada</div>
                {carrito.cliente ? (
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div>{carrito.cliente.direccion || "-"}</div>
                    <div>{carrito.cliente.direccionComplementaria || ""}</div>
                    <div>
                      {carrito.cliente.codigoPostal || "-"} {carrito.cliente.ciudad || ""} {carrito.cliente.provincia || ""}
                    </div>
                    <div>{carrito.cliente.pais || "-"}</div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sin dirección vinculada.</p>
                )}
              </div>
            </div>
          )}

          {tab === "items" && (
            <div className="space-y-3">
              {carrito.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {item.imagen ? <img src={item.imagen} alt={item.nombre} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">{item.nombre}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Cantidad: {item.cantidad} · {item.precio.toFixed(2)} €
                    </div>
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {(item.precio * item.cantidad).toFixed(2)} €
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "pedido" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Estado del pedido</div>
                {carrito.pedido ? (
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div><strong>Número:</strong> {carrito.pedido.numeroPedido}</div>
                    <div><strong>Estado:</strong> {carrito.pedido.estado}</div>
                    <div><strong>Pago:</strong> {carrito.pedido.estadoPago || "-"}</div>
                    <div><strong>Total:</strong> {carrito.pedido.totalFinal.toFixed(2)} €</div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Este carrito todavía no se ha convertido en pedido.</p>
                )}
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Acciones rápidas</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Si quieres convertir este carrito en pedido manual, puedes usar la creación de pedido y copiar los datos
                  relevantes.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
