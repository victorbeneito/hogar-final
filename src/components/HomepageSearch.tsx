"use client";

import { useState, useEffect } from "react";
import clienteAxios from "@/lib/axiosClient";
import ProductGrid from "@/components/ProductGrid";

type Producto = {
  id: number;
  nombre: string;
  precio: number;
  imagenes: string[];
  stock: number;
  destacado?: boolean;
};

type Props = {
  productosDestacados: Producto[];
};

export default function HomepageSearch({ productosDestacados }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [busquedaActiva, setBusquedaActiva] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setProductosFiltrados([]);
      setBusquedaActiva(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await clienteAxios.get(
          `/productos?q=${encodeURIComponent(searchQuery)}`
        );
        if (data.ok) {
          setProductosFiltrados(data.productos);
          setBusquedaActiva(true);
        }
      } catch {
        // silencioso
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <ProductGrid
      productosDestacados={productosDestacados}
      productosFiltrados={productosFiltrados}
      busquedaActiva={busquedaActiva}
    />
  );
}
