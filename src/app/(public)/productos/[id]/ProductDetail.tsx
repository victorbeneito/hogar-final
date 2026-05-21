"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addToCart } from "@/lib/cartService";
import CartModal from "@/components/CartModal";
import { calcularPrecioVariante, ordenarValoresNaturales } from "@/lib/productVariantPricing";

interface CategoriaProducto {
  id: number;
  nombre: string;
}

interface AtributoValor {
  id: number;
  valor: string;
  imagen?: string | null;
  colorHex?: string | null;
  orden?: number | null;
}

interface Variante {
  id: number;
  referencia?: string | null;
  color?: string;
  imagen?: string;
  tamano?: string;
  tirador?: string;
  precio_extra?: number | null;
  imagenMuestra?: string;
  imagenesVariante?: string;
  stock?: number;
  atributovalores?: AtributoValor[];
}

interface Marca {
  id: number;
  nombre: string;
  logo_url?: string | null;
  imagen?: string | null;
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
  prestashopProductId?: number | null; // REVI
  referencia?: string | null;
  marca?: Marca | null;
  stock?: number;
}

export default function ProductDetail({ producto }: { producto: Producto }) {
  const splitImages = (value?: string) =>
    String(value ?? "")
      .split(/[|;\n,]/g)
      .map((part) => part.trim())
      .filter(Boolean);

  // Aseguramos que son arrays
  const imagenes = Array.isArray(producto.imagenes) ? producto.imagenes : [];
  const variantes = Array.isArray(producto.variantes) ? producto.variantes : [];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0] ?? "");
  const [imagenHover, setImagenHover] = useState<string | null>(null);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [tabActiva, setTabActiva] = useState<"descripcion" | "detalles" | "opiniones">("descripcion");
  
  // Estados de selección
  const [tamanoSeleccionado, setTamanoSeleccionado] = useState<string | null>(null);
  const [tiradorSeleccionado, setTiradorSeleccionado] = useState<string | null>(null);
  const [colorSeleccionado, setColorSeleccionado] = useState<string | null>(null);

  // 🔍 FILTROS: Usamos 'tamano' (sin ñ)
  const tamañosUnicos = ordenarValoresNaturales(
    variantes
      .filter((v): v is Variante & { tamano: string } => Boolean(v.tamano))
      .map((v) => v.tamano)
  );

  const tiradoresUnicos = (() => {
    const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const vistos = new Map<string, number>();
    for (const v of variantes) {
      if (!v.tirador) continue;
      if (vistos.has(v.tirador)) continue;
      const av = v.atributovalores?.find((a) => norm(a.valor) === norm(v.tirador!));
      vistos.set(v.tirador, av?.orden ?? 999);
    }
    return [...vistos.entries()].sort((a, b) => a[1] - b[1]).map(([val]) => val);
  })();

  const coloresUnicos = ordenarValoresNaturales(
    variantes
      .filter((v): v is Variante & { color: string } => Boolean(v.color))
      .map((v) => v.color)
  );

  const varianteSeleccionada = (() => {
    if (!colorSeleccionado && !tamanoSeleccionado && !tiradorSeleccionado) return null;

    return variantes.find((v) =>
      (colorSeleccionado ? v.color === colorSeleccionado : true) &&
      (tamanoSeleccionado ? v.tamano === tamanoSeleccionado : true) &&
      (tiradorSeleccionado ? v.tirador === tiradorSeleccionado : true)
    ) ||
    variantes.find((v) => colorSeleccionado && v.color === colorSeleccionado) ||
    variantes.find((v) => tamanoSeleccionado && v.tamano === tamanoSeleccionado) ||
    variantes.find((v) => tiradorSeleccionado && v.tirador === tiradorSeleccionado) ||
    null;
  })();

  const imagenesVarianteSeleccionada = [
    varianteSeleccionada?.imagen,
    ...splitImages(varianteSeleccionada?.imagenesVariante),
  ].filter((imagen, idx, arr): imagen is string => Boolean(imagen) && arr.indexOf(imagen) === idx);

  const imagenPrincipalSeleccionada = varianteSeleccionada?.imagen || imagenesVarianteSeleccionada[0] || imagenes[0] || "";
  const imagenesCarrusel = imagenesVarianteSeleccionada.length > 0 ? imagenesVarianteSeleccionada : imagenes;
  const imagenPrincipal = imagenActiva || imagenPrincipalSeleccionada || imagenesCarrusel[0] || "";
  const imagenAlternativa = imagenesCarrusel.find((img) => img !== imagenPrincipal) || "";
  const imagenVisible = imagenHover || imagenPrincipal;

  useEffect(() => {
    setImagenActiva(imagenPrincipalSeleccionada);
    setImagenHover(null);
  }, [colorSeleccionado, tamanoSeleccionado, tiradorSeleccionado, imagenPrincipalSeleccionada]);

  useEffect(() => {
    if (!imagenAmpliada) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImagenAmpliada(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [imagenAmpliada]);

  const limpiarHoverImagen = () => setImagenHover(null);

  const mostrarImagenAlternativa = () => {
    if (imagenAlternativa) {
      setImagenHover(imagenAlternativa);
    }
  };

  const abrirImagenAmpliada = () => {
    if (imagenVisible) {
      setImagenAmpliada(imagenVisible);
    }
  };

  const precioVariante = calcularPrecioVariante({
    precioOriginal: producto.precio,
    precioDescuento: producto.precio_descuento,
    precioExtra: varianteSeleccionada?.precio_extra ?? 0,
  });
  const precioFinalProducto = precioVariante.precioFinal;

  const [modalAbierto, setModalAbierto] = useState(false);

  const handleAddToCart = async () => {
    await addToCart({
      id: Number(producto.id),
      nombre: producto.nombre,
      precio: producto.precio,
      precioFinal: precioFinalProducto,
      imagen: imagenActiva || imagenPrincipalSeleccionada || producto.imagenes?.[0] || "",
      cantidad,
      tamanoSeleccionado: tamanoSeleccionado ?? undefined,
      tiradorSeleccionado: tiradorSeleccionado ?? undefined,
      colorSeleccionado: colorSeleccionado ?? undefined,
      stock: producto.stock,
    });
    setModalAbierto(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
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
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-stretch">
        {/* Card imágenes */}
        <div className="bg-white dark:bg-darkNavBg shadow rounded-lg p-4 transition-colors duration-300 h-full flex flex-col">
          <button
            type="button"
            onClick={abrirImagenAmpliada}
            onMouseEnter={mostrarImagenAlternativa}
            onMouseLeave={limpiarHoverImagen}
            onFocus={mostrarImagenAlternativa}
            onBlur={limpiarHoverImagen}
            className={`group relative flex-1 min-h-[440px] lg:min-h-[620px] w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center outline-none transition-shadow ${
              imagenVisible ? "cursor-zoom-in focus-visible:ring-2 focus-visible:ring-primary/40" : "cursor-default"
            }`}
            aria-label={imagenVisible ? `Ampliar imagen de ${producto.nombre}` : `Sin imagen de ${producto.nombre}`}
            disabled={!imagenVisible}
          >
            {imagenVisible ? (
              <div className="relative h-full w-full">
                <img
                  src={imagenVisible}
                  alt={producto.nombre}
                  className="absolute inset-0 h-full w-full object-contain object-center p-3 transition-opacity duration-300"
                />
                <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Ampliar
                </span>
              </div>
            ) : (
              <span className="text-gray-400 text-sm">Sin imagen</span>
            )}
          </button>

          {imagenesCarrusel.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {imagenesCarrusel.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setImagenActiva(img);
                    setImagenHover(null);
                  }}
                  onMouseEnter={() => setImagenHover(img)}
                  onMouseLeave={limpiarHoverImagen}
                  onFocus={() => setImagenHover(img)}
                  onBlur={limpiarHoverImagen}
                  className={`group h-16 w-16 flex-shrink-0 overflow-hidden rounded border transition-all ${
                    imagenActiva === img ? "border-primary" : "border-gray-200 dark:border-gray-700"
                  }`}
                  aria-label={`Ver imagen ${idx + 1} de ${producto.nombre}`}
                >
                  <img
                    src={img}
                    alt={`${producto.nombre} ${idx + 1}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Card info producto */}
        <div className="bg-white dark:bg-darkNavBg shadow rounded-lg p-6 flex flex-col gap-5 transition-colors duration-300 h-full">
          <h1 className="text-[1.65rem] leading-tight font-semibold text-gray-900 dark:text-white">
            {producto.nombre}
          </h1>

          {/* Precio */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-primary dark:text-white">
              {precioFinalProducto.toFixed(2)} €
            </span>
            {precioVariante.tieneOferta && (
              <span className="text-sm line-through text-gray-400 dark:text-white">
                {precioVariante.precioOriginalConExtra.toFixed(2)} €
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
                  {tamañosUnicos.map((tamano, idx) => (
                    <option key={`${tamano}-${idx}`} value={tamano}>
                      {tamano}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* TIRADORES */}
            {tiradoresUnicos.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Tirador</h3>
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
                        className={`flex flex-col items-center gap-1 group transition-transform hover:scale-105 ${
                          seleccionado ? "scale-105" : ""
                        }`}
                      >
                        <span
                          className={`block w-full aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                            seleccionado
                              ? "border-primary shadow-md"
                              : "border-gray-200 dark:border-gray-600 group-hover:border-primary"
                          }`}
                        >
                          {imagenMuestra ? (
                            <img
                              src={imagenMuestra}
                              alt={tirador}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-[9px] text-gray-500 dark:text-gray-400 text-center leading-tight px-0.5">
                              {tirador}
                            </span>
                          )}
                        </span>
                        <span className={`text-[10px] leading-tight text-center w-full break-words ${
                          seleccionado
                            ? "text-primary font-semibold dark:text-primaryHover"
                            : "text-gray-500 dark:text-gray-400"
                        }`}>
                          {tirador}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* COLORES */}
            {coloresUnicos.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Color</h3>
                <div className="grid grid-cols-4 gap-3">
                  {coloresUnicos.map((color, idx) => {
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
                        key={`${color}-${idx}`}
                        type="button"
                        onClick={() => setColorSeleccionado(color)}
                        title={color}
                        className={`flex flex-col items-center gap-1 group transition-transform hover:scale-105 ${
                          seleccionado ? "scale-105" : ""
                        }`}
                      >
                        <span
                          className={`block w-full aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                            seleccionado
                              ? "border-primary shadow-md"
                              : "border-gray-200 dark:border-gray-600 group-hover:border-primary"
                          }`}
                        >
                          {imagenMuestra ? (
                            <img
                              src={imagenMuestra}
                              alt={color}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-[9px] text-gray-500 dark:text-gray-400 text-center leading-tight px-0.5">
                              {color}
                            </span>
                          )}
                        </span>
                        <span className={`text-[10px] leading-tight text-center w-full break-words ${
                          seleccionado
                            ? "text-primary font-semibold dark:text-primaryHover"
                            : "text-gray-500 dark:text-gray-400"
                        }`}>
                          {color}
                        </span>
                      </button>
                    );
                  })}
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

          {/* Widget REVI - Opiniones */}
          {producto.prestashopProductId && (
            <div className="mt-4">
              <div
                className="revi-widget-KyG01X4Rv5"
                data-revi-widget-lazy=""
                data-id-product={String(producto.prestashopProductId)}
                data-lang="es"
              />
            </div>
          )}

          {/* Referencia del Producto */}
          {producto.referencia && (
            <div className="text-sm text-gray-700 dark:text-gray-300 py-2">
              Referencia: <span className="font-mono font-semibold text-gray-900 dark:text-white">{producto.referencia}</span>
            </div>
          )}

          {/* Sección de iconos informativos */}
          <div className="space-y-3 mt-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cambios o Devoluciones</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚚</span>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Envíos</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">↔️</span>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Pago 100% Seguro - Visa, Master Card o Paypal</p>
            </div>
          </div>
        </div>
      </div>

      {imagenAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setImagenAmpliada(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-5xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setImagenAmpliada(null)}
              className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-gray-700 shadow hover:bg-white"
              aria-label="Cerrar imagen ampliada"
            >
              Cerrar
            </button>
            <img
              src={imagenAmpliada}
              alt={`${producto.nombre} ampliado`}
              className="max-h-[88vh] w-full rounded-xl bg-white object-contain p-4 shadow-2xl dark:bg-gray-900"
            />
          </div>
        </div>
      )}

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
              className="product-description prose max-w-none prose-img:max-w-full prose-img:h-auto dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html:
                  producto.descripcion_html_cruda ||
                  producto.descripcion ||
                  "",
              }}
            />
          )}

          {tabActiva === "detalles" && (
            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300">Productos realizados con la mejor calidad y diseño moderno.</p>

              {/* Sección Marca - estilo PrestaShop */}
              {producto.marca && (
                <div className="flex items-start gap-3">
                  {(producto.marca.logo_url || producto.marca.imagen) && (
                    <img
                      src={producto.marca.logo_url || producto.marca.imagen || ""}
                      alt={producto.marca.nombre}
                      className="h-16 w-auto object-contain flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 text-sm space-y-1">
                    <div className="font-semibold text-gray-900 dark:text-white">{producto.marca.nombre}</div>
                    {varianteSeleccionada?.referencia && (
                      <div className="text-gray-700 dark:text-gray-300">
                        Referencia de la combinación: <span className="font-mono font-semibold">{varianteSeleccionada.referencia}</span>
                      </div>
                    )}
                    {varianteSeleccionada?.stock !== undefined && (
                      <div className="text-gray-700 dark:text-gray-300">
                        Stock disponible: <span className="font-semibold">{varianteSeleccionada.stock} artículos</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {tabActiva === "opiniones" && (
            <div className="mt-4 space-y-6">
              {/* REVI: Widget de reseñas del producto */}
              {producto.prestashopProductId ? (
                <div
                  className="revi-widget-pzdMBVvAoX"
                  data-revi-widget-lazy=""
                  data-id-product={String(producto.prestashopProductId)}
                  data-lang="es"
                />
              ) : (
                <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-sm text-yellow-900">
                  ⚠ Producto sin mapeo a Prestashop. Configura el mapeo en /admin/revi para mostrar reseñas.
                </div>
              )}

              {/* Referencias del Producto */}
              {(producto.referencia || varianteSeleccionada?.referencia) && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Referencias</h4>
                  <div className="space-y-2 text-sm">
                    {producto.referencia && (
                      <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded">
                        <span className="text-gray-600 dark:text-gray-400">Referencia del producto</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">{producto.referencia}</span>
                      </div>
                    )}
                    {varianteSeleccionada?.referencia && (
                      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                        <span className="text-gray-600 dark:text-gray-400">Referencia de la combinación</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">{varianteSeleccionada.referencia}</span>
                      </div>
                    )}
                    {!varianteSeleccionada?.referencia && (producto.referencia || varianteSeleccionada) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                        *La combinación seleccionada no tiene una referencia específica
                      </p>
                    )}
                  </div>
                </div>
              )}
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
