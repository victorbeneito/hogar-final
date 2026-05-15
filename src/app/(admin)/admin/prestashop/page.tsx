"use client";

import Link from "next/link";
import { Archive, ArrowRight, FileText, ShoppingCart, Upload } from "lucide-react";

const sections = [
  {
    title: "Pedidos históricos",
    description: "Consulta los pedidos importados desde Prestashop. La gestión diaria vive en Pedidos nuevos.",
    href: "/admin/pedidos?origen=prestashop",
    icon: ShoppingCart,
    accent: "from-[#6BAEC9] to-[#4A4A4A]",
  },
  {
    title: "Facturas históricas",
    description: "Acceso a las facturas importadas para soporte fiscal y documentación.",
    href: "/admin/facturas?origen=prestashop",
    icon: FileText,
    accent: "from-[#4A4A4A] to-[#2c3e50]",
  },
  {
    title: "Importar CSV",
    description: "Repite la importación si necesitas volver a cargar registros o revisar el mapeo.",
    href: "/admin/importar",
    icon: Upload,
    accent: "from-[#7bbf8a] to-[#4d7c59]",
  },
];

export default function AdminPrestashopPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F5] py-6 md:py-8 px-3 sm:px-4 md:px-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-[#2c3e50] via-[#3d566e] to-[#6BAEC9] p-6 md:p-8 text-white shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white,_transparent_40%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-white/70 font-semibold">Prestashop</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
                Archivo histórico de pedidos y facturas
              </h1>
              <p className="mt-3 text-sm md:text-base text-white/80 leading-6">
                Los registros importados desde Prestashop quedan aquí para consulta documental.
                La operativa diaria se hace en las vistas de pedidos y facturas nuevas.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/pedidos?origen=actuales"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#2c3e50] shadow-lg hover:bg-gray-100"
              >
                Ver pedidos nuevos
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/admin/facturas?origen=actuales"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Ver facturas nuevas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.title}
                href={section.href}
                className="group rounded-3xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${section.accent} text-white shadow-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-[#4A4A4A]">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">{section.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#6BAEC9] group-hover:translate-x-0.5 transition-transform">
                  Abrir
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            );
          })}

          <div className="rounded-3xl border border-dashed border-[#6BAEC9]/30 bg-[#6BAEC9]/5 p-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#6BAEC9] shadow-sm">
              <Archive className="w-6 h-6" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-[#4A4A4A]">Cómo se distingue el histórico</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Los pedidos importados llevan la nota <span className="font-semibold">[Importado de Prestashop]</span>
              y las facturas suelen empezar por <span className="font-semibold">PS-</span>.
            </p>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Eso permite mantener la gestión diaria separada sin añadir columnas nuevas a la base de datos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}