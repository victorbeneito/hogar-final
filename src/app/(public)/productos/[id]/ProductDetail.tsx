"use client";

import { useState } from "react";
import Link from "next/link";
import { addToCart } from "@/lib/cartService";
import CartModal from "@/components/CartModal";

interface CategoriaProducto {
  id: number;
  nombre: string;
}

interface Variante {
  id: number;
  color?: string;
  imagen?: string;
  tamano?: string; // 👈 Usamos 'tamano' (sin ñ) para coincidir con la BD
  tirador?: string;
  precio_extra?: number | null;
}

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  descripcion_html_cruda?: string; // Nombre corregido
  precio: number;
  precio_descuento?: number | null;
  descuento_porcentaje?: number | null;
  imagenes?: string[];
  variantes?: Variante[];
  categoria?: CategoriaProducto;
}

export default function ProductDetail({ producto }: { producto: Producto }) {
  // Aseguramos que son arrays
  const imagenes = Array.isArray(producto.imagenes) ? producto.imagenes : [];
  const variantes = Array.isArray(producto.variantes) ? producto.variantes : [];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0] ?? "");
  const [cantidad, setCantidad] = useState(1);
  const [tabActiva, setTabActiva] = useState<"descripcion" | "detalles" | "opiniones">("descripcion");
  
  // Estados de selección
  const [tamanoSeleccionado, setTamanoSeleccionado] = useState<string | null>(null);
  const [tiradorSeleccionado, setTiradorSeleccionado] = useState<string | null>(null);
  const [colorSeleccionado, setColorSeleccionado] = useState<string | null>(null);

  // 🔍 FILTROS: Usamos 'tamano' (sin ñ)
  const tamañosUnicos = [...new Set(variantes
  .filter((v): v is Variante & { tamano: string } => Boolean(v.tamano))
  .map(v => v.tamano)
)].sort();

const tiradoresUnicos = [...new Set(variantes
  .filter((v): v is Variante & { tirador: string } => Boolean(v.tirador))
  .map(v => v.tirador)
)].sort();

const coloresUnicos = [...new Set(variantes
  .filter((v): v is Variante & { color: string } => Boolean(v.color))
  .map(v => v.color)
)].sort();

  const precioBase = producto.precio_descuento ?? producto.precio;
  
  // Calcular precio extra (buscando por 'tamano')
  const extraTamanoVariante = variantes.find(v => v.tamano === tamanoSeleccionado);
const extraTamano = extraTamanoVariante?.precio_extra ?? 0;
  
  const precioFinal = precioBase + extraTamano;

  const [modalAbierto, setModalAbierto] = useState(false);

  const handleAddToCart = async () => {
    await addToCart({
      ...producto,
      id: Number(producto.id),
      cantidad,
      tamanoSeleccionado: tamanoSeleccionado ?? undefined,
      tiradorSeleccionado: tiradorSeleccionado ?? undefined,
      colorSeleccionado: colorSeleccionado ?? undefined,
      precioFinal,
      imagen: imagenActiva || producto.imagenes?.[0] || "",
    });
    setModalAbierto(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Migas de pan */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        <Link href="/" className="cursor-pointer hover:underline">Inicio</Link>
        <span className="mx-1">/</span>
        {producto.categoria && producto.categoria.id ? (
          <Link href={`/categorias/${producto.categoria.id}`} className="cursor-pointer hover:underline">
            {producto.categoria.nombre}
          </Link>
        ) : (
          <span>Sin categoría</span>
        )}
        <span className="mx-1">/</span>
        <span className="text-gray-800 dark:text-gray-200 font-medium">{producto.nombre}</span>
      </nav>

      {/* Zona superior: imágenes + info */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Card imágenes */}
        <div className="bg-white dark:bg-darkNavBg shadow rounded-lg p-4 transition-colors duration-300">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {imagenActiva ? (
              <img src={imagenActiva} alt={producto.nombre} className="h-full w-full object-contain" />
            ) : (
              <span className="text-gray-400 text-sm">Sin imagen</span>
            )}
          </div>

          {imagenes.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {imagenes.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImagenActiva(img)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded border ${
                    imagenActiva === img ? "border-primary" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <img src={img} alt={`${producto.nombre} ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Card info producto */}
        <div className="bg-white dark:bg-darkNavBg shadow rounded-lg p-6 flex flex-col gap-4 transition-colors duration-300">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {producto.nombre}
          </h1>

          {/* Precio */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-primary dark:text-white">
              {precioFinal.toFixed(2)} €
            </span>
            {producto.precio_descuento && (
              <span className="text-sm line-through text-gray-400 dark:text-white">
                {producto.precio.toFixed(2)} €
              </span>
            )}
          </div>

          {/* Variantes */}
          <div className="space-y-4">
            
         {/* TAMAÑOS */}
{tamañosUnicos.length > 0 && (
  <div>
    <h3 className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tamaño</h3>
    <select
      className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-darkBg dark:border-gray-600 dark:text-white"
      value={tamanoSeleccionado ?? ""}
      onChange={(e) => setTamanoSeleccionado(e.target.value || null)}
    >
      <option value="">Selecciona tamaño</option>
      {tamañosUnicos.map((tamano, idx) => {
        const varianteTamano = variantes.find(v => v.tamano === tamano);
        return (
          <option key={`${tamano}-${idx}`} value={tamano}>
            {tamano} {varianteTamano?.precio_extra ? `(+${varianteTamano.precio_extra}€)` : ""}
          </option>
        );
      })}
    </select>
  </div>
)}

{/* TIRADORES */}
{tiradoresUnicos.length > 0 && (
  <div>
    <h3 className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tirador</h3>
    <div className="grid grid-cols-2 gap-2">
      {tiradoresUnicos.map((tirador, idx) => (
        <button
          key={`${tirador}-${idx}`}
          type="button"
          onClick={() => setTiradorSeleccionado(tirador)}
          className={`border rounded px-3 py-2 text-sm transition-colors ${
            tiradorSeleccionado === tirador
              ? "border-primary bg-primary/10 text-primary dark:text-primaryHover"
              : "border-gray-200 dark:border-gray-600 dark:text-gray-300 hover:border-primary"
          }`}
        >
          {tirador}
        </button>
      ))}
    </div>
  </div>
)}

{/* COLORES */}
{coloresUnicos.length > 0 && (
  <div>
    <h3 className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Color</h3>
    <div className="flex flex-wrap gap-2">
      {coloresUnicos.map((color, idx) => (
        <button
          key={`${color}-${idx}`}
          type="button"
          onClick={() => setColorSeleccionado(color)}
          className={`border rounded-full h-8 px-3 text-xs flex items-center justify-center transition-colors ${
            colorSeleccionado === color
              ? "border-primary bg-primary/10 text-primary dark:text-primaryHover"
              : "border-gray-200 dark:border-gray-600 dark:text-gray-300 hover:border-primary"
          }`}
        >
          {color}
        </button>
      ))}
    </div>
  </div>
)}
   

           
          </div>

          {/* Cantidad + Botón */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center border dark:border-gray-600 rounded overflow-hidden">
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white hover:bg-gray-100"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                className="w-14 text-center border-x dark:border-gray-600 text-sm bg-white dark:bg-darkBg dark:text-white py-2"
              />
              <button
                type="button"
                onClick={() => setCantidad((c) => c + 1)}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white hover:bg-gray-100"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 bg-primary text-white py-2 rounded font-semibold hover:bg-primaryHover transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Añadir al carrito
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Descripción / Detalles */}
      <div className="bg-white dark:bg-darkNavBg shadow rounded-lg transition-colors duration-300">
        <div className="border-b dark:border-gray-700 flex">
          {(["descripcion", "detalles", "opiniones"] as const).map((tab) => (
            <button
              key={tab}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                tabActiva === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() => setTabActiva(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-4 text-sm text-gray-700 dark:text-gray-300">
          {tabActiva === "descripcion" && (
            <div
              className="prose max-w-none prose-img:max-w-full prose-img:h-auto dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html:
                  producto.descripcion_html_cruda ||
                  producto.descripcion ||
                  "",
              }}
            />
          )}

          {tabActiva === "detalles" && (
            <p>Productos realizados con la mejor calidad y diseño moderno.</p>
          )}

          {tabActiva === "opiniones" && (
            <div className="mt-4">
              <img 
                src="/img/opiniones01.JPG" 
                alt="Opiniones de clientes satisfechos" 
                className="w-full max-w-3xl mx-auto rounded-lg shadow-md border border-gray-200"
              />
            </div>
          )}
        </div>
      </div>

      <CartModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        productName={producto.nombre}
      />
    </div>
  );
}