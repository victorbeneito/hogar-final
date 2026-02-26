"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import Banner from "@/components/Banner";
import ProductGrid from "@/components/ProductGrid";
import BannersSection from "@/components/BannersSection"; 
import BannerPrincipal from "@/components/BannerPrincipal";
import SeoText from "@/components/SeoText";
import SubscribeForm from "@/components/SubscribeForm";
import clienteAxios from "@/lib/axiosClient";

// Definimos los tipos alineados con MariaDB (ids numéricos)
type Categoria = {
  id: number;
  nombre: string;
};

type Producto = {
  id: number;
  nombre: string;
  precio: number;
  imagenes: string[];
  stock: number;
};

type CategoriasResponse = {
  ok: boolean;
  categorias: Categoria[];
};

type ProductosResponse = {
  ok: boolean;
  productos: Producto[];
};

export default function HomePage() {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [productosDestacados, setProductosDestacados] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [busquedaActiva, setBusquedaActiva] = useState(false);

  // Cargar categorías
  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const { data } = await clienteAxios.get<CategoriasResponse>("/categorias");
        if (data.ok) setCategories(data.categorias || []);
      } catch (error) {
        console.error("Error cargando categorías:", error);
      }
    };
    cargarCategorias();
  }, []);

  // Buscar productos
  useEffect(() => {
    const buscarProductos = async () => {
      try {
        if (!searchQuery.trim()) {
          const { data } = await clienteAxios.get<ProductosResponse>("/productos");
          if (data.ok) {
            setProductosDestacados(data.productos);
            setProductosFiltrados([]);
            setBusquedaActiva(false);
          }
        } else {
          const { data } = await clienteAxios.get<ProductosResponse>(
            `/productos?q=${encodeURIComponent(searchQuery)}`
          );
          if (data.ok) {
            setProductosFiltrados(data.productos);
            setBusquedaActiva(true);
          }
        }
      } catch (error) {
        console.error("Error fetching productos:", error);
      }
    };

    buscarProductos();
  }, [searchQuery]);

  return (
    // CONTENEDOR PRINCIPAL:
    // min-h-screen: Ocupa al menos toda la pantalla.
    // flex-col gap-y: Crea espacio vertical consistente entre secciones.
    // gap-8 (móvil) -> gap-16 (escritorio): Más separación en pantallas grandes para que "respire".
    <div className="bg-fondo dark:bg-darkBg w-full min-h-screen flex flex-col gap-y-8 md:gap-y-12 lg:gap-y-20 pb-12">
      
      {/* SECCIÓN 1: Banner Superior (TopPromo) */}
      <section className="w-full">
         {/* Container: centra y da margen lateral */}
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Banner />
         </div>
      </section>

      {/* SECCIÓN 2: Banner Principal (Hero) */}
      <section className="w-full">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <BannerPrincipal categories={categories} />
         </div>
      </section>

      {/* SECCIÓN 3: Grid de Productos */}
      <section className="w-full">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* El grid interno ya debería ser responsive, pero este container limita el ancho máximo */}
            <ProductGrid
              productosDestacados={productosDestacados}
              productosFiltrados={productosFiltrados}
              busquedaActiva={busquedaActiva}
            />
         </div>
      </section>

      {/* SECCIÓN 4: Banners Secundarios */}
      <section className="w-full">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <BannersSection categories={categories} />
         </div>
      </section>

      {/* SECCIÓN 5: SEO y Suscripción (Más estrecho para lectura) */}
      <section className="w-full bg-gray-50 dark:bg-gray-900/50 py-10 md:py-16 mt-4">
         {/* Nota: Usamos max-w-5xl aquí porque el texto muy ancho es difícil de leer */}
         <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <SeoText />
            <div className="border-t border-gray-200 dark:border-gray-700 pt-10">
                <SubscribeForm />
            </div>
         </div>
      </section>

    </div>
  );
}

