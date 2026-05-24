"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { addToCart } from "@/lib/cartService";
import { calcularPrecioVariante, ordenarValoresNaturales } from "@/lib/productVariantPricing";

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
  prestashopProductId?: number | null;
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
    atributovalores?: Array<{ id: number; valor: string; imagen?: string | null; colorHex?: string | null }>;
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
  const [mounted, setMounted] = useState(false);
  const [producto, setProducto] = useState<QuickViewProducto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [tamanoSeleccionado, setTamanoSeleccionado] = useState<string | null>(null);
  const [tiradorSeleccionado, setTiradorSeleccionado] = useState<string | null>(null);
  const [colorSeleccionado, setColorSeleccionado] = useState<string | null>(null);
  const [imagenActiva, setImagenActiva] = useState("");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
    if (!open) { setAdded(false); return; }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);


  useEffect(() => {
    if (!producto?.prestashopProductId || !open) return;
    const timer = setTimeout(() => {
      const w = window as any;
      if (w.ReviWidget?.init) { try { w.ReviWidget.init(); } catch (_) { /* */ } }
      else if (w.__revilabsEmbeds) { try { w.__revilabsEmbeds(); } catch (_) { /* */ } }
    }, 300);
    return () => clearTimeout(timer);
  }, [producto?.prestashopProductId, open]);

  const variantes = producto?.variantes ?? [];
  const imagenesBase = (producto?.imagenes ?? []).filter(Boolean);

  const tamañosUnicos = useMemo(
    () => ordenarValoresNaturales(variantes.filter((v) => Boolean(v.tamano)).map((v) => v.tamano)),
    [variantes]
  );
  const tiradoresUnicos = useMemo(
    () => ordenarValoresNaturales(variantes.filter((v) => Boolean(v.tirador)).map((v) => v.tirador)),
    [variantes]
  );
  const coloresUnicos = useMemo(
    () => ordenarValoresNaturales(variantes.filter((v) => Boolean(v.color)).map((v) => v.color)),
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

  const precioBaseOriginal = Number(producto?.precio ?? 0);
  const precioCalculado = calcularPrecioVariante({
    precioOriginal: precioBaseOriginal,
    precioDescuento: producto?.precioOferta ?? null,
    precioExtra: varianteSeleccionada?.precio_extra ?? 0,
  });

  const handleAddToCart = () => {
    if (!producto) return;

    addToCart({
      id: producto.id,
      nombre: producto.nombre,
      precio: precioBaseOriginal,
      precioFinal: precioCalculado.precioFinal,
      imagen: imagenActiva || imagenPrincipal,
      cantidad,
      tamanoSeleccionado: tamanoSeleccionado ?? undefined,
      tiradorSeleccionado: tiradorSeleccionado ?? undefined,
      colorSeleccionado: colorSeleccionado ?? undefined,
      atributo: varianteSeleccionada?.referencia || "Estándar",
    });
    setAdded(true);
  };

  if (!mounted || !open) return null;

  // Pantalla de confirmación tras añadir al carrito
  if (added && producto) {
    return createPortal(
      <div className="fixed inset-0 z-[1000] bg-black/55 p-4 flex items-center justify-center" onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-xl bg-white dark:bg-darkBg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-white">Producto añadido al carrito</p>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">✕</button>
          </div>
          <div className="p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{producto.nombre}</p>
            <div className="flex flex-col gap-2 w-full mt-2">
              <Link
                href="/carrito"
                onClick={onClose}
                className="w-full rounded bg-primary py-2.5 text-sm font-semibold text-white text-center hover:bg-primaryHover transition"
              >
                Finalizar pedido
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded border border-gray-300 dark:border-gray-700 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Continuar comprando
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

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
                  src={(hasSrc(imagenActiva) ? imagenActiva : imagenPrincipal) || undefined}
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
                  {precioCalculado.precioFinal.toFixed(2)} €
                </span>
                {precioCalculado.tieneOferta && (
                  <span className="text-sm line-through text-gray-400">
                    {precioCalculado.precioOriginalConExtra.toFixed(2)} €
                  </span>
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
                <div className="grid grid-cols-4 gap-3">
                  {tiradoresUnicos.map((tirador, idx) => {
                    const norm = (s: string) =>
                      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
                    const varianteTirador = variantes.find((v) => v.tirador === tirador);
                    const atributoValorTirador = varianteTirador?.atributovalores?.find(
                      (av) => norm(av.valor) === norm(tirador)
                    );
                    const imagenMuestra = atributoValorTirador?.imagen || varianteTirador?.imagenMuestra;
                    const seleccionado = tiradorSeleccionado === tirador;
                    return (
                      <button
                        key={`${tirador}-${idx}`}
                        type="button"
                        onClick={() => setTiradorSeleccionado(tirador)}
                        title={tirador}
                        className={`flex flex-col items-center gap-1 group transition-transform hover:scale-105 ${seleccionado ? "scale-105" : ""}`}
                      >
                        <span className={`block w-full aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                          seleccionado
                            ? "border-primary shadow-md"
                            : "border-gray-200 dark:border-gray-600 group-hover:border-primary"
                        }`}>
                          {imagenMuestra ? (
                            <img src={imagenMuestra} alt={tirador} className="w-full h-full object-cover" />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-[9px] text-gray-500 text-center leading-tight px-0.5">
                              {tirador}
                            </span>
                          )}
                        </span>
                        <span className={`text-[10px] leading-tight text-center w-full break-words ${
                          seleccionado ? "text-primary font-semibold dark:text-primaryHover" : "text-gray-500 dark:text-gray-400"
                        }`}>
                          {tirador}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {coloresUnicos.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Color</p>
                <div className="grid grid-cols-4 gap-3">
                  {coloresUnicos.map((color) => {
                    const norm = (s: string) =>
                      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
                    const varianteColor = variantes.find((v) => v.color === color);
                    const atributoValorColor = varianteColor?.atributovalores?.find(
                      (av) => norm(av.valor) === norm(color)
                    );
                    const imagenMuestra = atributoValorColor?.imagen || varianteColor?.imagenMuestra;
                    const seleccionado = colorSeleccionado === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setColorSeleccionado(color)}
                        title={color}
                        className={`flex flex-col items-center gap-1 group transition-transform hover:scale-105 ${seleccionado ? "scale-105" : ""}`}
                      >
                        <span className={`block w-full aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                          seleccionado
                            ? "border-primary shadow-md"
                            : "border-gray-200 dark:border-gray-600 group-hover:border-primary"
                        }`}>
                          {imagenMuestra ? (
                            <img src={imagenMuestra} alt={color} className="w-full h-full object-cover" />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-[9px] text-gray-500 text-center leading-tight px-0.5">
                              {color}
                            </span>
                          )}
                        </span>
                        <span className={`text-[10px] leading-tight text-center w-full break-words ${
                          seleccionado ? "text-primary font-semibold dark:text-primaryHover" : "text-gray-500 dark:text-gray-400"
                        }`}>
                          {color}
                        </span>
                      </button>
                    );
                  })}
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

            {/* Revi Widget */}
            {producto?.prestashopProductId && (
              <div className="w-full">
                <div
                  className="revi-widget-KyG01X4Rv5"
                  data-revi-widget-lazy=""
                  data-id-product={String(producto.prestashopProductId)}
                  data-lang="es"
                  style={{ minHeight: '50px' }}
                />
              </div>
            )}

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
