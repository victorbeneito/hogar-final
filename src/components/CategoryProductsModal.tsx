"use client";

import React, { useState } from "react";
import clienteAxios from "@/lib/axiosClient";

type Categoria = {
  id: number;
  nombre: string;
};

type Producto = {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen?: string;
};

type Props = {
  categories: Categoria[];
};

export default function CategoryProductsModal({ categories }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaNombre, setCategoriaNombre] = useState("");

  const categoriasBanner: Record<string, number | number[] | undefined> = {
    "Estores Digitales": categories.find((c) => c.nombre === "Estores Digitales")?.id,
    "Estores Lisos": categories.find((c) => c.nombre === "Estores Lisos")?.id,
    "Fundas de sofá": categories.find((c) => c.nombre === "Fundas de sofá")?.id,
    "Cojines": categories.find((c) => c.nombre === "Cojines")?.id,
    "Ropa de cama": categories
      .filter((c) => ["Fundas Nórdicas", "Colchas", "Sabanas"].includes(c.nombre))
      .map((c) => c.id),
  };

  async function openModalPorCategoria(categoriaClave: string) {
    setCategoriaNombre(categoriaClave);
    const ids = categoriasBanner[categoriaClave];

    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      setProductos([]);
      setModalOpen(true);
      return;
    }

    try {
      let endpoint = "";

      if (Array.isArray(ids)) {
        endpoint = `/productos?categoria=${ids.join(",")}`;
      } else {
        endpoint = `/productos?categoria=${ids}`;
      }

      const respuesta = await clienteAxios.get(endpoint);
      const data: any = respuesta.data;

      if (data.ok) {
        setProductos(data.productos || []);
      } else {
        setProductos([]);
      }
      setModalOpen(true);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setProductos([]);
      setModalOpen(true);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setProductos([]);
    setCategoriaNombre("");
  }

  return (
    <>
      <div className="flex flex-wrap justify-center gap-6 mb-6">
        {Object.keys(categoriasBanner).map((catName) => (
          <div
            key={catName}
            onClick={() => openModalPorCategoria(catName)}
            className="cursor-pointer rounded-lg shadow-lg overflow-hidden max-w-xs"
            title={`Ver productos de ${catName}`}
          >
            <img
              src={`/img/banner-${catName.toLowerCase().replace(/\s/g, "-")}.jpg`}
              alt={`Banner ${catName}`}
              className="w-full h-40 object-cover"
            />
            <div className="p-2 bg-secondary dark:bg-darkNavBg text-neutral text-center font-semibold">
              {catName}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-20 z-50 overflow-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto shadow-lg">
            <button
              onClick={closeModal}
              className="text-3xl font-bold mb-4 float-right hover:text-red-600 dark:bg-gray-700 dark:hover:bg-gray-600"
              aria-label="Cerrar ventana"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 dark:bg-gray-700 dark:hover:bg-gray-600">
              Productos - {categoriaNombre}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {productos.length > 0 ? (
                productos.map((p) => (
                  <div key={p.id} className="border p-4 rounded shadow-sm">
                    <h3 className="font-semibold">{p.nombre}</h3>
                    {p.imagen && (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        className="mt-2 max-h-40 object-contain"
                      />
                    )}
                    {p.descripcion && (
                      <p className="mt-1">{p.descripcion}</p>
                    )}
                    <p className="mt-1 font-bold">{p.precio} €</p>
                  </div>
                ))
              ) : (
                <p>No hay productos en esta categoría.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
