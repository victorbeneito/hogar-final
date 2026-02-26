"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation"; // Usamos useRouter como en Categorias

interface Cupon {
  id: number;
  codigo: string;
  tipo_descuento: "porcentaje" | "fijo";
  valor_descuento: number;
  cantidad_total: number;
  usos_consumidos: number;
  restantes: number;
  limite_usuario: number;
  fecha_inicio: string;
  fecha_fin: string;
}

interface FormDataState {
  codigo: string;
  tipo_descuento: "porcentaje" | "fijo";
  valor_descuento: number | "";
  cantidad_total: number | "";
  limite_usuario: number | "";
  fecha_inicio: string;
  fecha_fin: string;
}

export default function CuponesPage() {
  const router = useRouter(); // Hook para navegación
  const [cupones, setCupones] = useState<Cupon[]>([]);
  
  const [formData, setFormData] = useState<FormDataState>({
    codigo: "",
    tipo_descuento: "porcentaje",
    valor_descuento: "",
    cantidad_total: 100,
    limite_usuario: 1,
    fecha_inicio: "",
    fecha_fin: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCupones();
  }, []);

  const fetchCupones = async () => {
    try {
      setLoading(true);
      const res = await axios.get<Cupon[]>("/api/cupones");
      setCupones(res.data);
    } catch (error) {
      console.error("Error fetching cupones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const datosParaEnviar = {
      ...formData,
      valor_descuento: Number(formData.valor_descuento) || 0,
      cantidad_total: Number(formData.cantidad_total) || 0,
      limite_usuario: Number(formData.limite_usuario) || 1,
      codigo: formData.codigo.toUpperCase()
    };

    try {
      if (editingId) {
        await axios({
          method: 'PUT',
          url: '/api/cupones',
          data: { id: editingId, ...datosParaEnviar }
        });
        setEditingId(null);
      } else {
        await axios.post("/api/cupones", datosParaEnviar);
      }

      setFormData({
        codigo: "",
        tipo_descuento: "porcentaje",
        valor_descuento: "",
        cantidad_total: 100,
        limite_usuario: 1,
        fecha_inicio: "",
        fecha_fin: ""
      });
      fetchCupones();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error al guardar");
    }
  };

  const handleEdit = (cupon: Cupon) => {
    setFormData({
      codigo: cupon.codigo,
      tipo_descuento: cupon.tipo_descuento as "porcentaje" | "fijo",
      valor_descuento: cupon.valor_descuento,
      cantidad_total: cupon.cantidad_total,
      limite_usuario: cupon.limite_usuario,
      fecha_inicio: cupon.fecha_inicio ? cupon.fecha_inicio.slice(0, 16) : "",
      fecha_fin: cupon.fecha_fin ? cupon.fecha_fin.slice(0, 16) : ""
    });
    setEditingId(cupon.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`¿Eliminar cupón?`)) return;
    try {
      await axios({
        method: 'DELETE',
        url: '/api/cupones',
        data: { id }
      });
      fetchCupones();
    } catch (error) {
      alert("Error al eliminar");
    }
  };

  const handleClear = () => {
    setFormData({
      codigo: "",
      tipo_descuento: "porcentaje",
      valor_descuento: "",
      cantidad_total: 100,
      limite_usuario: 1,
      fecha_inicio: "",
      fecha_fin: ""
    });
    setEditingId(null);
  };

  const handleNumberChange = (field: keyof FormDataState, value: string) => {
    if (value === "") {
      setFormData({ ...formData, [field]: "" });
    } else {
      setFormData({ ...formData, [field]: parseFloat(value) });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* TÍTULO */}
        <h1 className="text-4xl font-bold text-[#4A4A4A] mb-12">🎟️ Gestión de Cupones</h1>

        {/* --- BOTÓN VOLVER (ESTILO EXACTO DE CATEGORÍAS) --- */}
        <div className="mb-12">
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] hover:from-[#5FA0B3] hover:to-[#91C8D9] shadow-md transition-all duration-300"
          >
            ← Volver al Panel de Administración
          </button>
        </div>
        {/* -------------------------------------------------- */}

        {/* FORMULARIO (Adaptado al estilo visual de Categorías) */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 border border-[#6BAEC9]/10">
          <div className="mb-6 border-b pb-4">
            <h2 className="text-xl font-bold text-[#4A4A4A]">
              {editingId ? "✏️ Editar Cupón" : "➕ Nuevo Cupón"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#4A4A4A] mb-2">Código Cupón *</label>
              <input 
                type="text" 
                required
                className="w-full p-4 border border-[#DDC9A3]/50 rounded-2xl text-lg focus:ring-4 focus:ring-[#6BAEC9]/20 focus:border-[#6BAEC9] transition-all uppercase"
                placeholder="EJ: VERANO2026"
                value={formData.codigo}
                onChange={e => setFormData({...formData, codigo: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#4A4A4A] mb-2">Tipo Descuento *</label>
              <select 
                className="w-full p-4 border border-[#DDC9A3]/50 rounded-2xl text-lg focus:ring-4 focus:ring-[#6BAEC9]/20 focus:border-[#6BAEC9] transition-all bg-white"
                value={formData.tipo_descuento}
                onChange={e => setFormData({...formData, tipo_descuento: e.target.value as any})}
              >
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="fijo">Importe Fijo (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#4A4A4A] mb-2">
                Valor ({formData.tipo_descuento === 'porcentaje' ? '%' : '€'}) *
              </label>
              <input 
                type="number" 
                required
                min="0" 
                step="any"
                placeholder="Ej: 10"
                className="w-full p-4 border border-[#DDC9A3]/50 rounded-2xl text-lg focus:ring-4 focus:ring-[#6BAEC9]/20 focus:border-[#6BAEC9] transition-all"
                value={formData.valor_descuento}
                onChange={e => handleNumberChange("valor_descuento", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#4A4A4A] mb-2">Cantidad Total *</label>
              <input 
                type="number" 
                required
                min="1"
                className="w-full p-4 border border-[#DDC9A3]/50 rounded-2xl text-lg focus:ring-4 focus:ring-[#6BAEC9]/20 focus:border-[#6BAEC9] transition-all"
                value={formData.cantidad_total}
                onChange={e => handleNumberChange("cantidad_total", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#4A4A4A] mb-2">Usos por Cliente *</label>
              <input 
                type="number" 
                required
                min="1"
                className="w-full p-4 border border-[#DDC9A3]/50 rounded-2xl text-lg focus:ring-4 focus:ring-[#6BAEC9]/20 focus:border-[#6BAEC9] transition-all"
                value={formData.limite_usuario}
                onChange={e => handleNumberChange("limite_usuario", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#4A4A4A] mb-2">Inicio</label>
                <input 
                  type="datetime-local" 
                  className="w-full p-4 border border-[#DDC9A3]/50 rounded-2xl text-sm focus:ring-4 focus:ring-[#6BAEC9]/20 focus:border-[#6BAEC9] transition-all"
                  value={formData.fecha_inicio}
                  onChange={e => setFormData({...formData, fecha_inicio: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#4A4A4A] mb-2">Fin</label>
                <input 
                  type="datetime-local" 
                  className="w-full p-4 border border-[#DDC9A3]/50 rounded-2xl text-sm focus:ring-4 focus:ring-[#6BAEC9]/20 focus:border-[#6BAEC9] transition-all"
                  value={formData.fecha_fin}
                  onChange={e => setFormData({...formData, fecha_fin: e.target.value})}
                />
              </div>
            </div>

            <div className="md:col-span-2 mt-4 flex gap-4">
              <button 
                type="submit" 
                className="flex-1 bg-[#6BAEC9] hover:bg-[#A8D7E6] text-white px-10 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {editingId ? `💾 Guardar Cambios` : "➕ Crear Cupón"}
              </button>
              
              {(formData.codigo || editingId) && (
                <button 
                  type="button"
                  onClick={handleClear}
                  className="px-10 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-2xl font-semibold transition-all"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* TABLA (Adaptada al estilo visual de Categorías) */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#6BAEC9]/10">
          <div className="px-8 py-6 bg-gradient-to-r from-[#6BAEC9]/5 to-[#A8D7E6]/5 border-b">
            <h2 className="text-2xl font-bold text-[#4A4A4A]">
              Lista de Cupones ({cupones.length})
            </h2>
            <div className="text-sm text-gray-500 mt-1">
              Usos totales acumulados: {cupones.reduce((total, c) => total + c.usos_consumidos, 0)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F8F5] border-b border-[#DDC9A3]/30">
                  <th className="px-8 py-5 font-bold text-[#4A4A4A]">Código</th>
                  <th className="px-8 py-5 font-bold text-[#4A4A4A]">Descuento</th>
                  <th className="px-8 py-5 font-bold text-[#4A4A4A]">Estado</th>
                  <th className="px-8 py-5 font-bold text-[#4A4A4A]">Usos</th>
                  <th className="px-8 py-5 font-bold text-[#4A4A4A]">Validez</th>
                  <th className="px-8 py-5 font-bold text-[#4A4A4A] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8F8F5]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500 animate-pulse">
                      🔄 Cargando cupones...
                    </td>
                  </tr>
                ) : cupones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500">
                       <div className="text-6xl mb-4">🎫</div>
                       <p className="text-xl">No hay cupones creados</p>
                    </td>
                  </tr>
                ) : (
                  cupones.map(cupon => (
                    <tr key={cupon.id} className="hover:bg-[#F8F8F5] transition-colors">
                      <td className="px-8 py-5">
                        <span className="font-mono font-bold text-[#6BAEC9] bg-[#6BAEC9]/10 px-3 py-1 rounded-lg">
                          {cupon.codigo}
                        </span>
                      </td>
                      <td className="px-8 py-5 font-semibold text-[#4A4A4A]">
                        {cupon.valor_descuento.toFixed(2)} 
                        {cupon.tipo_descuento === 'porcentaje' ? '%' : '€'}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          cupon.restantes === 0 ? 'bg-red-100 text-red-700' : 
                          cupon.restantes < 10 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {cupon.restantes === 0 ? 'Agotado' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm text-gray-600">
                        <span className="font-bold">{cupon.usos_consumidos}</span> 
                        <span className="text-gray-400 mx-1">/</span> 
                        {cupon.cantidad_total}
                      </td>
                      <td className="px-8 py-5 text-sm text-gray-500">
                        <div className="flex flex-col">
                           <span className="font-medium text-[#4A4A4A]">{new Date(cupon.fecha_fin).toLocaleDateString('es-ES')}</span>
                           <span className="text-xs text-gray-400">{new Date(cupon.fecha_fin).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => handleEdit(cupon)}
                            className="p-2 bg-[#F7A38B]/10 hover:bg-[#F7A38B]/20 text-[#F7A38B] rounded-lg transition-all"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDelete(cupon.id)}
                            className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}