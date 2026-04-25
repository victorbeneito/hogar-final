"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { addToCart } from "@/lib/cartService";

type QuickViewProducto = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  descripcion_html?: string | null;
  precio: number;
  precioOferta?: number | null;
  stock?: number | null;
  categoria?: { id: number; nombre: string } | null;
  marca?: { id: number; nombre: string } | null;
  imagenPortada?: string | null;
  imagenes?: string[];
  caracteristicas?: Array<{ clave: string; valor: string }>;
  variantes?: Array<{
    id: number;
    referencia?: string | null;
    stock?: number | null;
    imagen?: string | null;
    color?: string | null;
    imagenMuestra?: string | null;
    imagenesVariante?: string | null;
    precio_extra?: number | null;
    tamano?: string | null;
    tirador?: string | null;
  }>;
};

type Props = {
  productId: number;
  open: boolean;
  onClose: () => void;
};

const splitImages = (value?: string | null) =>
  String(value ?? "")
    .split(/[|;\n,]/g)
    .map((part) => part.trim())
    .filter(Boolean);

const hasSrc = (value?: string | null) => Boolean(String(value ?? "").trim());

export default function ProductQuickViewModal({ productId, open, onClose }: Props) {
  const [producto, setProducto] = useState<QuickViewProducto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [tamanoSeleccionado, setTamanoSeleccionado] = useState<string | null>(null);
  const [tiradorSeleccionado, setTiradorSeleccionado] = useState<string | null>(null);
  const [colorSeleccionado, setColorSeleccionado] = useState<string | null>(null);
  const [imagenActiva, setImagenActiva] = useState("");

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    const cargar = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/productos/${productId}/quick-view`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "No se pudo cargar la vista rápida");
        }

        setProducto(data.producto);
        const inicial = data.producto.imagenPortada || data.producto.imagenes?.[0] || "";
        setImagenActiva(inicial);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "No se pudo cargar la vista rápida");
        }
      } finally {
        setLoading(false);
      }
    };

    void cargar();

    return () => controller.abort();
  }, [open, productId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const variantes = producto?.variantes ?? [];
  const imagenesBase = (producto?.imagenes ?? []).filter(Boolean);

  const tamañosUnicos = useMemo(
    () => [...new Set(variantes.filter((v) => Boolean(v.tamano)).map((v) => v.tamano as string))],
    [variantes]
  );
  const tiradoresUnicos = useMemo(
    () => [...new Set(variantes.filter((v) => Boolean(v.tirador)).map((v) => v.tirador as string))],
    [variantes]
  );
  const coloresUnicos = useMemo(
    () => [...new Set(variantes.filter((v) => Boolean(v.color)).map((v) => v.color as string))],
    [variantes]
  );

  const varianteSeleccionada = useMemo(() => {
    if (!variantes.length) return null;
    return (
      variantes.find((v) =>
        (colorSeleccionado ? v.color === colorSeleccionado : true) &&
        (tamanoSeleccionado ? v.tamano === tamanoSeleccionado : true) &&
        (tiradorSeleccionado ? v.tirador === tiradorSeleccionado : true)
      ) ||
      variantes.find((v) => colorSeleccionado && v.color === colorSeleccionado) ||
      variantes.find((v) => tamanoSeleccionado && v.tamano === tamanoSeleccionado) ||
      variantes.find((v) => tiradorSeleccionado && v.tirador === tiradorSeleccionado) ||
      null
    );
  }, [variantes, colorSeleccionado, tamanoSeleccionado, tiradorSeleccionado]);

  const imagenesVariante = useMemo(() => {
    const candidateImages = [
      varianteSeleccionada?.imagen,
      varianteSeleccionada?.imagenMuestra,
      ...splitImages(varianteSeleccionada?.imagenesVariante),
    ].filter(hasSrc) as string[];
    return [...new Set(candidateImages)];
  }, [varianteSeleccionada]);

  const imagenPrincipal =
    varianteSeleccionada?.imagen ||
    varianteSeleccionada?.imagenMuestra ||
    imagenesVariante[0] ||
    imagenesBase[0] ||
    producto?.imagenPortada ||
    "";

  useEffect(() => {
    if (hasSrc(imagenPrincipal)) setImagenActiva(imagenPrincipal);
  }, [imagenPrincipal]);

  const precioBase = Number(producto?.precio ?? 0);
  const precioOferta = producto?.precioOferta != null ? Number(producto.precioOferta) : null;
  const tieneOferta = precioOferta !== null && Number.isFinite(precioOferta) && precioOferta < precioBase;
  const precioVariante = Number(varianteSeleccionada?.precio_extra ?? 0);
  const precioActual = (tieneOferta ? precioOferta ?? precioBase : precioBase) + precioVariante;

  const handleAddToCart = () => {
    if (!producto) return;

    addToCart({
      id: producto.id,
      nombre: producto.nombre,
      precio: precioBase,
      precioFinal: precioActual,
      imagen: imagenActiva || imagenPrincipal,
      cantidad,
      tamanoSeleccionado: tamanoSeleccionado ?? undefined,
      tiradorSeleccionado: tiradorSeleccionado ?? undefined,
      colorSeleccionado: colorSeleccionado ?? undefined,
      atributo: varianteSeleccionada?.referencia || "Estándar",
    });
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/55 p-4 flex items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-6xl rounded-xl bg-white dark:bg-darkBg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Vista rápida</p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
              {producto?.nombre}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
            ✕
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="grid gap-3 lg:grid-cols-[88px_minmax(0,1fr)]">
            <div className="order-2 flex gap-2 overflow-x-auto lg:order-1 lg:flex-col lg:overflow-visible lg:pr-1">
              {[...imagenesBase, ...imagenesVariante].filter(hasSrc).map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setImagenActiva(img)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded border ${
                    imagenActiva === img ? "border-primary" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <div className="order-1 flex min-h-[340px] items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 p-3 lg:order-2">
              {loading ? (
                <div className="text-sm text-gray-500">Cargando...</div>
              ) : error ? (
                <div className="text-sm text-red-500">{error}</div>
              ) : (
                <img
                  src={hasSrc(imagenActiva) ? imagenActiva : imagenPrincipal}
                  alt={producto?.nombre}
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-primary dark:text-white">
                  {precioActual.toFixed(2)} €
                </span>
                {tieneOferta && (
                  <span className="text-sm line-through text-gray-400">{precioBase.toFixed(2)} €</span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {producto?.descripcion || "Pasa al detalle para ver más información."}
              </p>
            </div>

            {tamañosUnicos.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tamaño</label>
                <select
                  value={tamanoSeleccionado ?? ""}
                  onChange={(e) => setTamanoSeleccionado(e.target.value || null)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-darkNavBg dark:text-white"
                >
                  <option value="">Selecciona tamaño</option>
                  {tamañosUnicos.map((tamano) => (
                    <option key={tamano} value={tamano}>
                      {tamano}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tiradoresUnicos.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Tirador</p>
                <div className="grid grid-cols-2 gap-2">
                  {tiradoresUnicos.map((tirador) => (
                    <button
                      key={tirador}
                      type="button"
                      onClick={() => setTiradorSeleccionado(tirador)}
                      className={`rounded border px-3 py-2 text-sm ${
                        tiradorSeleccionado === tirador
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 dark:border-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {tirador}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {coloresUnicos.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Color</p>
                <div className="flex flex-wrap gap-2">
                  {coloresUnicos.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setColorSeleccionado(color)}
                      className={`rounded-full border px-3 py-1.5 text-xs ${
                        colorSeleccionado === color
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 dark:border-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex items-center overflow-hidden rounded border border-gray-300 dark:border-gray-700">
                <button type="button" className="px-3 py-2" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                  className="w-14 border-x border-gray-300 bg-white py-2 text-center dark:border-gray-700 dark:bg-darkNavBg"
                />
                <button type="button" className="px-3 py-2" onClick={() => setCantidad((c) => c + 1)}>
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 rounded bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
              >
                Añadir al carrito
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {"★★★★★".split("").map((star, idx) => (
                    <span key={idx}>{star}</span>
                  ))}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">0 opiniones</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sin valoraciones todavía.
              </p>
            </div>

            <Link
              href={`/productos/${producto?.id}`}
              className="text-sm font-semibold text-primary hover:text-primaryHover"
            >
              Ver ficha completa
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
