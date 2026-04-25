"use client";
import { useState } from "react";
import SaveButton from "@/components/admin/SaveButton";
import TabBasicos       from "./[id]/tabs/TabBasicos";
import TabPrecio        from "./[id]/tabs/TabPrecio";
import TabOpciones      from "./[id]/tabs/TabOpciones";
import TabCombinaciones from "./[id]/tabs/TabCombinaciones";
import TabTransporte    from "./[id]/tabs/TabTransporte";
import TabSEO           from "./[id]/tabs/TabSEO";

const TABS = [
  { key: "basicos",        label: "Ajustes básicos" },
  { key: "precio",         label: "Precio" },
  { key: "opciones",       label: "Opciones" },
  { key: "combinaciones",  label: "Combinaciones" },
  { key: "transporte",     label: "Transporte" },
  { key: "seo",            label: "SEO" },
];

type Props = {
  producto?: any;
  categorias: any[];
  marcas: any[];
  reglasImpuesto: any[];
};

export default function ProductoForm({ producto, categorias, marcas, reglasImpuesto }: Props) {
  const [activeTab, setActiveTab] = useState("basicos");
  const defaultReglaImpuestoId =
    producto?.reglaImpuestoId ??
    reglasImpuesto.find((r) => r?.nombre?.toString().toUpperCase().includes("IVA GENERAL") || Number(r?.porcentaje) === 21)?.id ??
    reglasImpuesto[0]?.id ??
    null;

  const [formData, setFormData] = useState({
    // Básicos
    nombre:           producto?.nombre           ?? "",
    resumen:          producto?.resumen          ?? "",
    descripcion:      producto?.descripcion      ?? "",
    descripcion_html: producto?.descripcion_html ?? "",
    imagenes:         producto?.productoimagen         ?? [],
    categoriaId:      producto?.productocategoria?.[0]?.categoriaId ?? null,
    marcaId:          producto?.marcaId          ?? null,
    activo:           producto?.activo           ?? true,
    destacado:        producto?.destacado        ?? false,
    enOferta:         producto?.enOferta         ?? false,
    // Precio
    precio:           producto?.precio           ?? 0,
    precioOferta:     producto?.precioOferta     ?? null,
    precioCoste:      producto?.precioCoste      ?? null,
    reglaImpuestoId:  defaultReglaImpuestoId,
    stock:            producto?.stock            ?? 0,
    stockMinimo:      producto?.stockMinimo      ?? 0,
    // Opciones
    visibilidad:      producto?.visibilidad      ?? "tienda",
    condicion:        producto?.condicion        ?? "nuevo",
    mostrarCondicion: producto?.mostrarCondicion ?? false,
    disponiblePedidos:producto?.disponiblePedidos?? true,
    soloWeb:          producto?.soloWeb          ?? false,
    etiquetas:        producto?.etiquetas        ?? [],
    ean13:            producto?.ean13            ?? null,
    upc:              producto?.upc              ?? null,
    isbn:             producto?.isbn             ?? null,
    // Combinaciones
    tieneVariantes:   producto?.tieneVariantes   ?? false,
    variantes:        producto?.variante       ?? [],
    // Transporte
    anchura:          producto?.anchura          ?? null,
    altura:           producto?.altura           ?? null,
    profundidad:      producto?.profundidad      ?? null,
    peso:             producto?.peso             ?? null,
    plazoEntregaStock:    producto?.plazoEntregaStock    ?? null,
    plazoEntregaSinStock: producto?.plazoEntregaSinStock ?? null,
    gastosEnvioExtra:     producto?.gastosEnvioExtra     ?? 0,
    // SEO
    metaTitulo:       producto?.metaTitulo       ?? null,
    metaDescripcion:  producto?.metaDescripcion  ?? null,
    slug:             producto?.slug             ?? null,
  });

  function handleChange(campo: string, valor: any) {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  }

  async function handleSave() {
  try {
    const url    = producto?.id ? `/api/admin/productos/${producto.id}` : "/api/admin/productos";
    const method = producto?.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Error al guardar");
    }

    alert(producto?.id ? "Producto actualizado" : "Producto creado correctamente");
    window.location.href = "/admin/productos";
  } catch (e: any) {
    alert("Error: " + e.message);
  }
}


  return (
    <div className="flex flex-col gap-6">

      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {producto ? producto.nombre : "Nuevo producto"}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {producto ? `ID: ${producto.id} · Última edición: ${new Date(producto.updatedAt).toLocaleDateString("es-ES")}` : "Rellena los datos del nuevo producto"}
          </p>
        </div>
        <SaveButton onSave={handleSave} />
      </div>

      {/* Pestañas */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {activeTab === "basicos"       && <TabBasicos       data={formData} onChange={handleChange} categorias={categorias} marcas={marcas} />}
        {activeTab === "precio"        && <TabPrecio        data={formData} onChange={handleChange} reglasImpuesto={reglasImpuesto} />}
        {activeTab === "opciones"      && <TabOpciones      data={formData} onChange={handleChange} />}
        {activeTab === "combinaciones" && <TabCombinaciones data={formData} onChange={handleChange} />}
        {activeTab === "transporte"    && <TabTransporte    data={formData} onChange={handleChange} />}
        {activeTab === "seo"           && <TabSEO           data={formData} onChange={handleChange} />}
      </div>

    </div>
  );
}
