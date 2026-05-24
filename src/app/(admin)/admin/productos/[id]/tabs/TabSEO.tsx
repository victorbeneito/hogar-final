"use client";

type Props = {
  data: Record<string, any>;
  onChange: (campo: string, valor: any) => void;
};

export default function TabSEO({ data, onChange }: Props) {
  const tituloLen = (data.metaTitulo ?? "").length;
  const descLen   = (data.metaDescripcion ?? "").length;

  const tituloOk = tituloLen >= 30 && tituloLen <= 70;
  const descOk   = descLen >= 70 && descLen <= 160;

  // Vista previa Google
  const slug = (data.nombre ?? "nuevo-producto")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const previewTitulo      = data.metaTitulo      || data.nombre      || "Título del producto";
  const previewDescripcion = data.metaDescripcion || data.resumen     || "Descripción del producto...";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Columna principal */}
      <div className="lg:col-span-2 flex flex-col gap-6">

        {/* Meta título */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Meta título</h3>
          </div>
          <div className="p-4">
            <input
              type="text"
              value={data.metaTitulo ?? ""}
              onChange={(e) => onChange("metaTitulo", e.target.value || null)}
              placeholder={data.nombre ?? "Título que aparece en Google..."}
              maxLength={70}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Barra de progreso */}
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    tituloLen === 0   ? "w-0" :
                    tituloLen < 30    ? "bg-red-400"    :
                    tituloLen <= 70   ? "bg-green-500"  :
                                        "bg-orange-400"
                  }`}
                  style={{ width: `${Math.min((tituloLen / 70) * 100, 100)}%` }}
                />
              </div>
              <span className={`text-xs flex-shrink-0 ${
                tituloLen === 0 ? "text-gray-400" :
                tituloOk        ? "text-green-600" : "text-orange-500"
              }`}>
                {tituloLen}/70
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {tituloLen === 0
                ? "Si lo dejas vacío se usará el nombre del producto."
                : tituloOk
                ? "✓ Longitud correcta (30-70 caracteres)"
                : tituloLen < 30
                ? "⚠ Muy corto. Añade más contexto."
                : "⚠ Demasiado largo. Google lo cortará."}
            </p>
          </div>
        </div>

        {/* Meta descripción */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Meta descripción</h3>
          </div>
          <div className="p-4">
            <textarea
              value={data.metaDescripcion ?? ""}
              onChange={(e) => onChange("metaDescripcion", e.target.value || null)}
              placeholder={data.resumen ?? "Descripción que aparece bajo el título en Google..."}
              maxLength={160}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {/* Barra de progreso */}
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    descLen === 0  ? "w-0" :
                    descLen < 70   ? "bg-red-400"   :
                    descLen <= 160 ? "bg-green-500" :
                                     "bg-orange-400"
                  }`}
                  style={{ width: `${Math.min((descLen / 160) * 100, 100)}%` }}
                />
              </div>
              <span className={`text-xs flex-shrink-0 ${
                descLen === 0 ? "text-gray-400" :
                descOk        ? "text-green-600" : "text-orange-500"
              }`}>
                {descLen}/160
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {descLen === 0
                ? "Si lo dejas vacío se usará el resumen del producto."
                : descOk
                ? "✓ Longitud correcta (70-160 caracteres)"
                : descLen < 70
                ? "⚠ Muy corta. Añade más detalle."
                : "⚠ Demasiado larga. Google la cortará."}
            </p>
          </div>
        </div>

        {/* URL amigable */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">URL amigable (slug)</h3>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-0 border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <span className="px-3 py-2 bg-gray-100 text-gray-400 text-sm border-r border-gray-300 whitespace-nowrap">
                /productos/
              </span>
              <input
                type="text"
                value={data.slug ?? slug}
                onChange={(e) => onChange("slug", e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "-")
                  .replace(/-+/g, "-")
                )}
                placeholder={slug}
                className="flex-1 px-3 py-2 text-sm focus:outline-none bg-white"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Se genera automáticamente desde el nombre. Puedes personalizarlo.
            </p>
          </div>
        </div>

      </div>

      {/* Columna lateral — vista previa Google */}
      <div className="flex flex-col gap-4">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Vista previa en Google</h3>
          </div>
          <div className="p-4">
            {/* Simulación resultado Google */}
            <div className="rounded-lg border border-gray-100 p-3 bg-white">
              {/* URL */}
              <p className="text-xs text-green-700 mb-1 truncate">
                tutienda.com › productos › {data.slug ?? slug}
              </p>
              {/* Título */}
              <p className="text-blue-700 text-base font-medium leading-tight mb-1 line-clamp-1 hover:underline cursor-pointer">
                {previewTitulo.length > 60
                  ? previewTitulo.slice(0, 60) + "..."
                  : previewTitulo}
              </p>
              {/* Descripción */}
              <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                {previewDescripcion.length > 155
                  ? previewDescripcion.slice(0, 155) + "..."
                  : previewDescripcion}
              </p>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              Vista previa aproximada. Google puede mostrarla de forma diferente.
            </p>
          </div>
        </div>

        {/* Checklist SEO */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Checklist SEO</h3>
          <div className="flex flex-col gap-2">
            {[
              { ok: !!(data.nombre),          label: "Nombre del producto definido" },
              { ok: !!(data.resumen),          label: "Resumen corto definido" },
              { ok: tituloOk,                  label: "Meta título entre 30-70 caracteres" },
              { ok: descOk,                    label: "Meta descripción entre 70-160 caracteres" },
              { ok: !!(data.slug ?? slug),     label: "URL amigable generada" },
              { ok: !!(data.imagenes?.length), label: "Al menos una imagen del producto" },
              { ok: !!(data.categoriaId),      label: "Categoría asignada" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                  item.ok ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-400"
                }`}>
                  {item.ok ? "✓" : "·"}
                </span>
                <span className={item.ok ? "text-gray-700" : "text-gray-400"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
