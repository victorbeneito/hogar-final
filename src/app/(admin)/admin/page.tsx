"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";
import StatCard from "@/components/admin/dashboard/StatCard";
import VentasChart from "@/components/admin/dashboard/VentasChart";
import UltimosPedidos from "@/components/admin/dashboard/UltimosPedidos";
import UltimosClientes from "@/components/admin/dashboard/UltimosClientes";
import PedidosEstado from "@/components/admin/dashboard/PedidosEstado";
import MensajesPendientes from "@/components/admin/dashboard/MensajesPendientes";
import TraficoWidget from "@/components/admin/dashboard/TraficoWidget";
import PeriodoSelector, { Periodo } from "@/components/admin/dashboard/PeriodoSelector";
import ProductosTabs from "@/components/admin/dashboard/ProductosTabs";

interface DashboardData {
  productos: number;
  categorias: number;
  marcas: number;
  pedidos: number;       // pedidos del período
  clientes: number;      // total clientes (global)
  clientesPeriodo: number; // nuevos clientes en el período
  cupones: number;
  ventasTotales: number; // ventas históricas total
  ventasMes: number;     // ventas del período
  ventasSemana: number;
  pedidosSemana: number;
  ultimosPedidos: any[];
  ultimosClientes: any[];
  mensajesPendientes: any[];
  pedidosPorEstado: any[];
  graficaVentas: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const router = useRouter();

  const calculatePeriodoDates = (p: Periodo, customDesde?: string, customHasta?: string) => {
    const ahora = new Date();
    let inicio: Date;
    let fin = new Date(ahora);
    fin.setHours(23, 59, 59, 999);

    if (p === "custom" && customDesde && customHasta) {
      return { desde: customDesde, hasta: customHasta };
    }

    switch (p) {
      case "hoy":
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        break;
      case "7dias":
        inicio = new Date(ahora);
        inicio.setDate(inicio.getDate() - 7);
        break;
      case "mes":
        inicio = new Date(ahora);
        inicio.setDate(inicio.getDate() - 30);
        break;
      case "trimestre":
        inicio = new Date(ahora);
        inicio.setDate(inicio.getDate() - 90);
        break;
      case "anio":
        inicio = new Date(ahora.getFullYear(), 0, 1);
        break;
      default:
        inicio = new Date(ahora);
        inicio.setDate(inicio.getDate() - 30);
    }

    return {
      desde: inicio.toISOString().split('T')[0],
      hasta: fin.toISOString().split('T')[0],
    };
  };

  const handlePeriodoChange = (newPeriodo: Periodo, customDesde?: string, customHasta?: string) => {
    setPeriodo(newPeriodo);
    const dates = calculatePeriodoDates(newPeriodo, customDesde, customHasta);
    setDesde(dates.desde);
    setHasta(dates.hasta);
  };

  useEffect(() => {
    const initialDates = calculatePeriodoDates("mes");
    setDesde(initialDates.desde);
    setHasta(initialDates.hasta);
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        if (!token) {
          router.replace("/admin-login");
          return;
        }

        const url = new URL("/api/admin/stats", window.location.origin);
        if (desde && hasta) {
          url.searchParams.append("desde", desde);
          url.searchParams.append("hasta", hasta);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("adminToken");
            router.replace("/admin-login");
            return;
          }
          throw new Error("Error al cargar estadísticas");
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router, desde, hasta]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>Error al cargar las estadísticas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Bienvenido al Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Resumen de tu tienda y actividades recientes
        </p>
      </div>

      {/* Selector de período */}
      <PeriodoSelector
        periodo={periodo}
        desde={desde}
        hasta={hasta}
        onChange={handlePeriodoChange}
      />

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={ShoppingCart}
          label="Pedidos del período"
          value={data.pedidos}
          color="blue"
          href="/admin/pedidos"
        />
        <StatCard
          icon={Users}
          label="Clientes nuevos"
          value={data.clientesPeriodo}
          color="green"
          href="/admin/clientes"
        />
        <StatCard
          icon={Package}
          label="Productos"
          value={data.productos}
          color="orange"
          href="/admin/productos"
        />
        <StatCard
          icon={TrendingUp}
          label="Ventas del período"
          value={`€${data.ventasMes.toFixed(2)}`}
          color="purple"
        />
        <StatCard
          icon={Clock}
          label="Ticket medio"
          value={`€${(data.pedidos > 0 ? data.ventasMes / data.pedidos : 0).toFixed(2)}`}
          color="red"
        />
      </div>

      {/* Gráficas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VentasChart data={data.graficaVentas} desde={desde} hasta={hasta} />
        </div>
        <MensajesPendientes
          mensajes={data.mensajesPendientes}
          total={data.mensajesPendientes.length}
        />
      </div>

      {/* Tráfico */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Tráfico de la tienda
        </h2>
        <TraficoWidget
          token={localStorage.getItem("adminToken") || ""}
          desde={desde}
          hasta={hasta}
        />
      </div>

      {/* Última sección de datos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UltimosPedidos pedidos={data.ultimosPedidos} />
        </div>
        <PedidosEstado data={data.pedidosPorEstado} />
      </div>

      {/* Pestañas de productos */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Análisis de Productos
        </h2>
        <ProductosTabs
          token={localStorage.getItem("adminToken") || ""}
          desde={desde}
          hasta={hasta}
        />
      </div>

      {/* Últimos clientes */}
      <div>
        <UltimosClientes clientes={data.ultimosClientes} />
      </div>

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <p className="text-blue-600 dark:text-blue-400 font-medium mb-1">
            Pedidos esta semana
          </p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {data.pedidosSemana}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
          <p className="text-green-600 dark:text-green-400 font-medium mb-1">
            Ventas esta semana
          </p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            €{data.ventasSemana.toFixed(2)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20">
          <p className="text-orange-600 dark:text-orange-400 font-medium mb-1">
            Cupones activos
          </p>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {data.cupones}
          </p>
        </div>
      </div>
    </div>
  );
}
