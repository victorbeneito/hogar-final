"use client";
export const dynamic = "force-dynamic";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ✅ INTERFAZ CORRECTA (PLANA, SIN OBJETOS ANIDADOS)
interface Pedido {
  id: number;
  numeroPedido?: string;
  
  // Datos del Cliente (Snapshot del momento de compra)
  // El script de migración ya juntó aquí "Nombre + Apellidos"
  nombre: string; 
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  cp: string;

  // Datos Planos (NO SON OBJETOS)
  envioMetodo: string;  // 👈 Antes era envio.metodo
  envioCoste: number;   // 👈 Antes era envio.coste
  pagoMetodo: string;   // 👈 Antes era pago.metodo
  
  totalFinal: number;
  subtotal: number;
  estado: string;
  
  // Fechas
  createdAt: string;
  fechaPedido?: string;

  // Relación opcional con la cuenta de usuario
  cliente?: {
    id: number;
    nombre: string;
    email: string;
  };
  
  productos: {
    productoId: number;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
}

export default function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const res = await fetch(`/api/pedidos/${id}`);
        const data = await res.json();
        
        if (data.pedido) {
            setPedido(data.pedido);
            setEstado(data.pedido.estado || "PENDIENTE");
        }
      } catch (err) {
        console.error("Error al obtener pedido:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPedido();
  }, [id]);

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (res.ok) {
        alert("✅ Pedido actualizado correctamente");
        router.refresh();
        router.push("/admin/pedidos");
      } else {
        alert("Error al actualizar el pedido");
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const formatPrice = (amount: any) => {
    const num = parseFloat(amount);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Fecha desconocida";
    return new Date(dateStr).toLocaleString("es-ES", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando pedido...</div>;
  if (!pedido) return <div className="min-h-screen flex items-center justify-center text-gray-500">Pedido no encontrado.</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-8 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-[#4A4A4A] mb-8">🧾 Detalles del Pedido</h1>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#6BAEC9]/10 space-y-6">
          
          {/* CABECERA */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4">
            <div>
              <p className="text-gray-500 text-sm">ID Interno: <span className="font-mono text-[#6BAEC9]">#{pedido.id}</span></p>
              <p className="mt-1 text-gray-700 text-sm">Nº Pedido: <span className="font-semibold">{pedido.numeroPedido || "N/A"}</span></p>
              <p className="mt-2 text-gray-500 text-sm">
                Fecha: {formatDate(pedido.fechaPedido || pedido.createdAt)}
              </p>
            </div>

            <div className="mt-4 md:mt-0">
              <label className="block text-sm font-medium text-gray-600 mb-1">Estado del pedido:</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="border border-[#6BAEC9]/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6BAEC9]"
              >
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="ENVIADO">ENVIADO</option>
                <option value="ENTREGADO">ENTREGADO</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
            </div>
          </div>

          {/* DATOS DEL CLIENTE / ENVÍO */}
          <section>
            <h2 className="text-xl font-semibold text-[#4A4A4A] mb-3">👤 Datos de Envío</h2>
            <div className="text-gray-700 space-y-1 pl-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
              {/* Aquí mostramos el nombre corregido (Nombre + Apellidos) */}
              <p><strong>Nombre:</strong> {pedido.nombre || "Sin Nombre"}</p>
              <p><strong>Email:</strong> {pedido.email || "N/A"}</p>
              <p><strong>Teléfono:</strong> {pedido.telefono || "N/A"}</p>
              <p><strong>Dirección:</strong> {pedido.direccion || ""}, {pedido.cp || ""} {pedido.ciudad || ""}</p>
            </div>
          </section>

          {/* ENVÍO Y PAGO (CORREGIDO: Sin acceder a objetos anidados) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section>
              <h2 className="text-xl font-semibold text-[#4A4A4A] mb-3">🚚 Método de Envío</h2>
              <p className="text-gray-700 pl-2">
                Método: {pedido.envioMetodo}<br />
                Coste: <strong>{formatPrice(pedido.envioCoste)} €</strong>
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-[#4A4A4A] mb-3">💳 Método de Pago</h2>
              <p className="text-gray-700 pl-2">
                Método: {pedido.pagoMetodo}<br />
                Total pagado: <strong className="text-[#F7A38B] text-lg">{formatPrice(pedido.totalFinal)} €</strong>
              </p>
            </section>
          </div>

          {/* PRODUCTOS */}
          <section>
            <h2 className="text-xl font-semibold text-[#4A4A4A] mb-3">🛍️ Productos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8F8F5]">
                  <tr>
                    <th className="text-left px-4 py-2">Producto</th>
                    <th className="text-center px-4 py-2">Cantidad</th>
                    <th className="text-center px-4 py-2">Unitario (€)</th>
                    <th className="text-right px-4 py-2">Subtotal (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.productos.map((p, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">{p.nombre}</td>
                      <td className="px-4 py-2 text-center">{p.cantidad}</td>
                      <td className="px-4 py-2 text-center">{formatPrice(p.precioUnitario)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-[#6BAEC9]">{formatPrice(p.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right mt-4 pr-4 border-t pt-4">
               <div className="space-y-1">
                   <p className="text-gray-500">Subtotal: {formatPrice(pedido.subtotal)} €</p>
                   <p className="text-gray-500">Envío: {formatPrice(pedido.envioCoste)} €</p>
                   <p className="text-2xl font-bold text-[#4A4A4A] mt-2">
                     Total: <span className="text-[#6BAEC9]">{formatPrice(pedido.totalFinal)} €</span>
                   </p>
               </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button onClick={() => router.push("/admin/pedidos")} className="px-6 py-3 rounded-xl font-semibold text-white bg-gray-400 hover:bg-gray-500 shadow-md transition-all">
            ← Volver a Pedidos
          </button>
          <button onClick={handleUpdate} className="px-6 py-3 rounded-xl font-semibold text-white bg-[#6BAEC9] hover:bg-[#5FA0B3] shadow-md transition-all">
            💾 Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}