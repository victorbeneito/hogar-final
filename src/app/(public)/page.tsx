"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import Banner from "@/components/Banner";
import ProductGrid from "@/components/ProductGrid";
import BannersSection from "@/components/BannersSection";
import BannerPrincipal from "@/components/BannerPrincipal";
import SeoText from "@/components/SeoText";
import SubscribeForm from "@/components/SubscribeForm";
import ReviWidget from "@/components/ReviWidget";
import clienteAxios from "@/lib/axiosClient";

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
  const [productosDestacados, setProductosDestacados] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [busquedaActiva, setBusquedaActiva] = useState(false);

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

  useEffect(() => {
    const cargarDestacados = async () => {
      try {
        const { data } = await clienteAxios.get<ProductosResponse>("/productos?destacado=true&limit=12&sortBy=id&sortDir=desc");
        if (data.ok) setProductosDestacados(data.productos);
      } catch (error) {
        console.error("Error fetching productos:", error);
      }
    };
    cargarDestacados();
  }, []);

  return (
    <div className="bg-fondo dark:bg-darkBg w-full min-h-screen flex flex-col gap-y-8 md:gap-y-12 lg:gap-y-20 pb-12">
      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Banner />
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BannerPrincipal categories={categories} />
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProductGrid
            productosDestacados={productosDestacados}
            productosFiltrados={productosFiltrados}
            busquedaActiva={busquedaActiva}
          />
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ReviWidget />
        </div>
      </section>

      <section className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BannersSection categories={categories} />
        </div>
      </section>

      <section className="w-full bg-gray-50 dark:bg-gray-900/50 py-10 md:py-16 mt-4">
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
