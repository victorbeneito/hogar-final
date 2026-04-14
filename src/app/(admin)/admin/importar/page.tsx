"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Upload, FileText, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

type ImportType =
  | "categorias"
  | "marcas"
  | "proveedores"
  | "atributos"
  | "atributovalores"
  | "clientes"
  | "direcciones"
  | "productos"
  | "combinaciones";

type TypeConfig = {
  label: string;
  description: string;
  fields: string[];
  hint: string;
  requiredFields: string[];
  sampleRows: Record<string, string>[];
};

const TYPES: Record<ImportType, TypeConfig> = {
  categorias: {
    label: "Categorías",
    description: "Importa categorías raíz o hijas.",
    fields: ["nombre", "slug", "descripcion", "imagen", "activa", "orden", "parentId", "parentNombre"],
    requiredFields: ["nombre"],
    hint: "Usa parentId o parentNombre para crear subcategorías.",
    sampleRows: [
      { nombre: "Estores Digitales", slug: "estores-digitales", descripcion: "Colección principal", imagen: "https://example.com/categorias/estores.jpg", activa: "1", orden: "1" },
      { nombre: "Infantiles", parentNombre: "Estores Digitales", slug: "infantiles", descripcion: "Modelos para dormitorios infantiles", imagen: "https://example.com/categorias/infantiles.jpg", activa: "1", orden: "2" },
    ],
  },
  marcas: {
    label: "Marcas",
    description: "Alta o actualización de marcas.",
    fields: ["nombre", "descripcion", "imagen", "logo_url"],
    requiredFields: ["nombre"],
    hint: "El nombre es único.",
    sampleRows: [
      { nombre: "Happystor", descripcion: "Marca demo de estores", imagen: "https://example.com/marcas/happystor.png", logo_url: "https://example.com/marcas/happystor-logo.png" },
    ],
  },
  proveedores: {
    label: "Proveedores",
    description: "Importa proveedores y opcionalmente los vincula a una marca.",
    fields: ["nombre", "descripcion", "imagen", "contacto", "email", "telefono", "direccion", "nif", "activo", "marca"],
    requiredFields: ["nombre"],
    hint: "Si indicas marca, debe existir previamente.",
    sampleRows: [
      {
        nombre: "Proveedor Demo",
        descripcion: "Proveedor principal para muestras",
        contacto: "Juan Pérez",
        email: "demo@proveedor.com",
        telefono: "900000000",
        direccion: "Polígono Industrial 1",
        nif: "B12345678",
        marca: "Happystor",
        activo: "1",
      },
    ],
  },
  atributos: {
    label: "Atributos",
    description: "Crea atributos como Tamaño, Color o Tirador.",
    fields: ["nombre", "orden"],
    requiredFields: ["nombre"],
    hint: "Después importa sus valores con el tipo de atributo valores.",
    sampleRows: [
      { nombre: "Tamaño", orden: "1" },
      { nombre: "Color", orden: "2" },
      { nombre: "Tirador", orden: "3" },
    ],
  },
  atributovalores: {
    label: "Valores de atributo",
    description: "Crea valores para un atributo existente.",
    fields: ["atributo", "atributoId", "valor", "colorHex", "imagen", "orden"],
    requiredFields: ["valor", "atributo"],
    hint: "Puedes indicar atributo por nombre o atributoId.",
    sampleRows: [
      { atributo: "Tamaño", valor: "80x200", orden: "1" },
      { atributo: "Tamaño", valor: "100x200", orden: "2" },
      { atributo: "Color", valor: "Gris", colorHex: "#b3b3b3", imagen: "https://example.com/atributos/gris.jpg", orden: "1" },
      { atributo: "Color", valor: "Blanco", colorHex: "#ffffff", imagen: "https://example.com/atributos/blanco.jpg", orden: "2" },
    ],
  },
  clientes: {
    label: "Clientes",
    description: "Importa cuentas de cliente.",
    fields: ["nombre", "apellidos", "email", "password", "telefono", "empresa", "nif", "direccion", "codigoPostal", "ciudad", "provincia", "pais", "role"],
    requiredFields: ["nombre", "apellidos", "email"],
    hint: "Si no envías password, se usará 123456.",
    sampleRows: [
      {
        nombre: "Cliente",
        apellidos: "Demo",
        email: "cliente@demo.com",
        password: "123456",
        telefono: "600000000",
        empresa: "Demo S.L.",
        nif: "12345678A",
        direccion: "Calle Principal 1",
        codigoPostal: "46000",
        ciudad: "Valencia",
        provincia: "Valencia",
        pais: "España",
        role: "cliente",
      },
      { nombre: "Admin", apellidos: "Tienda", email: "admin@demo.com", password: "Admin2025", telefono: "900111222", pais: "España", role: "admin" },
    ],
  },
  direcciones: {
    label: "Direcciones",
    description: "Importa direcciones asociadas a clientes.",
    fields: ["clienteId", "clienteEmail", "alias", "nombre", "apellidos", "empresa", "nif", "telefono", "direccion", "complemento", "codigoPostal", "ciudad", "provincia", "pais", "predeterminada"],
    requiredFields: ["alias", "nombre", "apellidos", "direccion"],
    hint: "Debes indicar clienteId o clienteEmail.",
    sampleRows: [
      {
        clienteEmail: "cliente@demo.com",
        alias: "Casa",
        nombre: "Cliente",
        apellidos: "Demo",
        empresa: "Demo S.L.",
        nif: "12345678A",
        telefono: "600000000",
        direccion: "Calle 1",
        complemento: "Portal A",
        codigoPostal: "46000",
        ciudad: "Valencia",
        provincia: "Valencia",
        pais: "España",
        predeterminada: "1",
      },
      { clienteId: "1", alias: "Trabajo", nombre: "Cliente", apellidos: "Demo", direccion: "Avenida 2", complemento: "Piso 3", codigoPostal: "46001", ciudad: "Valencia", provincia: "Valencia", pais: "España", predeterminada: "0" },
    ],
  },
  productos: {
    label: "Productos",
    description: "Importa o actualiza productos básicos con imágenes y categorías.",
    fields: ["nombre", "referencia", "precio", "precioOferta", "precioCoste", "stock", "stockMinimo", "activo", "destacado", "enOferta", "marca", "categoria", "categorias", "imagenes", "slug"],
    requiredFields: ["nombre"],
    hint: "categorias e imagenes admiten listas separadas por |, ; o coma.",
    sampleRows: [
      {
        nombre: "Estor enrollable demo",
        referencia: "PROD-001",
        precio: "49.95",
        precioOferta: "39.95",
        precioCoste: "25.00",
        stock: "15",
        stockMinimo: "3",
        activo: "1",
        destacado: "1",
        enOferta: "1",
        marca: "Happystor",
        categorias: "Infantiles|Estores Digitales",
        categoria: "Infantiles",
        imagenes: "https://example.com/img.jpg|https://example.com/img-2.jpg",
        slug: "estor-enrollable-demo",
      },
      { nombre: "Producto simple", referencia: "PROD-002", precio: "19.95", precioCoste: "9.50", stock: "8", activo: "1", destacado: "0", enOferta: "0", marca: "Happystor", categoria: "Estores Digitales", slug: "producto-simple" },
    ],
  },
  combinaciones: {
    label: "Combinaciones",
    description: "Crea variantes de producto y sus relaciones con valores de atributo.",
    fields: ["productoReferencia", "nombreProducto", "referencia", "stock", "precio_extra", "imagen", "imagenMuestra", "color", "tamano", "tirador", "atributos"],
    requiredFields: ["productoReferencia", "referencia"],
    hint: "atributos puede contener IDs o valores separados por |, ; o coma.",
    sampleRows: [
      { productoReferencia: "PROD-001", nombreProducto: "Estor enrollable demo", referencia: "PROD-001-GRIS", stock: "10", precio_extra: "5", color: "Gris", tamano: "80x200", tirador: "Plástico", atributos: "1|3" },
      { productoReferencia: "PROD-001", nombreProducto: "Estor enrollable demo", referencia: "PROD-001-BLANCO", stock: "8", precio_extra: "0", imagen: "https://example.com/variante.jpg", imagenMuestra: "https://example.com/variante-muestra.jpg", atributos: "2|4" },
    ],
  },
};

const TEMPLATE_TYPES: Array<{ type: ImportType; label: string; note: string }> = [
  { type: "categorias", label: "Categorías", note: "Raíz y subcategorías con parentNombre." },
  { type: "marcas", label: "Marcas", note: "Nombre, descripción y logos." },
  { type: "proveedores", label: "Proveedores", note: "Datos de contacto y marca asociada." },
  { type: "atributos", label: "Atributos", note: "Tamaño, Color, Tirador..." },
  { type: "atributovalores", label: "Valores de atributo", note: "Valores con color e imagen." },
  { type: "clientes", label: "Clientes", note: "Clientes y admins de ejemplo." },
  { type: "direcciones", label: "Direcciones", note: "Direcciones vinculadas a clienteId/email." },
  { type: "productos", label: "Productos", note: "Producto completo con categorías e imágenes." },
  { type: "combinaciones", label: "Combinaciones", note: "Variantes de producto con atributos." },
];

const IMPORT_ORDER: ImportType[] = [
  "categorias",
  "marcas",
  "proveedores",
  "atributos",
  "atributovalores",
  "clientes",
  "direcciones",
  "productos",
  "combinaciones",
];

export default function AdminImportarPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<ImportType>("productos");
  const [templatePreviewType, setTemplatePreviewType] = useState<ImportType>("productos");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [mappingStatus, setMappingStatus] = useState<string>("");
  const [mappingOwner, setMappingOwner] = useState<{ adminId: number | null; adminEmail: string | null }>({ adminId: null, adminEmail: null });

  const config = TYPES[tipo];
  const templatePreview = TYPES[templatePreviewType];

  const previewRows = useMemo(() => rows.slice(0, 10), [rows]);
  const mappedRows = useMemo(() => {
    if (!rows.length) return [];

    return rows.map((row) => {
      const mapped: Record<string, string> = {};
      for (const field of config.fields) {
        const sourceHeader = columnMap[field] || "";
        mapped[field] = sourceHeader ? String(row[sourceHeader] ?? "").trim() : "";
      }
      return mapped;
    });
  }, [rows, columnMap, config.fields]);

  const rowValidation = useMemo(() => validateRows(mappedRows, config.requiredFields), [mappedRows, config.requiredFields]);

  const canImport = mappedRows.length > 0 && rowValidation.errors.length === 0;

  useEffect(() => {
    let cancelled = false;

    async function loadSavedMapping() {
      if (!headers.length) return;

      try {
        const res = await fetch(`/api/importaciones/mapeo?tipo=${encodeURIComponent(tipo)}`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok || !data.ok || cancelled) return;

        const backendMapping = data.mapping ?? {};
        const filtered = Object.fromEntries(
          Object.entries(backendMapping).filter(([, header]) => headers.includes(String(header)))
        );

        if (Object.keys(filtered).length > 0) {
          setColumnMap((prev) => ({ ...prev, ...filtered }));
          setMappingOwner({ adminId: data.adminId ?? null, adminEmail: data.adminEmail ?? null });
          setMappingStatus(data.adminEmail ? `Mapeo cargado desde backend de ${data.adminEmail}` : "Mapeo cargado desde backend");
        } else {
          setMappingOwner({ adminId: data.adminId ?? null, adminEmail: data.adminEmail ?? null });
          setMappingStatus("Sin mapeo guardado para este tipo");
        }
      } catch {
        if (!cancelled) setMappingStatus("No se pudo cargar el mapeo guardado");
      }
    }

    loadSavedMapping();

    return () => {
      cancelled = true;
    };
  }, [headers, tipo]);

  useEffect(() => {
    if (!headers.length) return;
    setValidationErrors(rowValidation.errors.slice(0, 20));
  }, [rowValidation.errors, headers.length]);

  function normalizeHeader(header: string) {
    return header
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  function buildAutoMap(sourceHeaders: string[], targetFields: string[]) {
    const normalizedSource = sourceHeaders.map((header) => ({ raw: header, norm: normalizeHeader(header) }));
    const map: Record<string, string> = {};

    targetFields.forEach((field) => {
      const normalizedField = normalizeHeader(field);
      const exact = normalizedSource.find((item) => item.norm === normalizedField);
      if (exact) map[field] = exact.raw;
    });

    return map;
  }

  function validateRows(mapped: Record<string, string>[], requiredFields: string[]) {
    const errors: string[] = [];

    mapped.forEach((row, index) => {
      const missing = requiredFields.filter((field) => !String(row[field] ?? "").trim());

      if (tipo === "atributovalores" && !String(row.atributoId ?? "").trim() && !String(row.atributo ?? "").trim()) {
        missing.push("atributo o atributoId");
      }

      if (tipo === "direcciones") {
        const clientKey = String(row.clienteId ?? "").trim() || String(row.clienteEmail ?? "").trim();
        if (!clientKey) missing.push("clienteId o clienteEmail");
      }

      if (tipo === "combinaciones" && !String(row.productoReferencia ?? "").trim() && !String(row.nombreProducto ?? "").trim()) {
        missing.push("productoReferencia o nombreProducto");
      }

      if (missing.length > 0) {
        errors.push(`Fila ${index + 1}: faltan ${missing.join(", ")}`);
      }
    });

    return { errors };
  }

  function getTemplateRows(currentType: ImportType) {
    const template = TYPES[currentType];
    return template.sampleRows.length ? template.sampleRows : [Object.fromEntries(template.fields.map((field) => [field, ""]))];
  }

  function downloadTemplate(currentType: ImportType = tipo) {
    const sample = getTemplateRows(currentType);
    const csv = Papa.unparse(sample, { delimiter: ";" });
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plantilla-${tipo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadTemplateByType(currentType: ImportType) {
    setTemplatePreviewType(currentType);
    downloadTemplate(currentType);
  }

  function previewTemplateByType(currentType: ImportType) {
    setTemplatePreviewType(currentType);
  }

  function downloadErrorReport() {
    if (!result?.errors?.length) return;

    const rowsForExport = result.errors.map((item: { sourceRow?: Record<string, any> }) => {
      const exportRow: Record<string, any> = {};
      const sourceRow = item.sourceRow ?? {};

      headers.forEach((header) => {
        exportRow[header] = sourceRow[header] ?? "";
      });

      return exportRow;
    });

    const csv = Papa.unparse(rowsForExport, { delimiter: ";" });
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `informe-errores-${tipo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setRows([]);
    setHeaders([]);
    setColumnMap({});
    setFileName("");
    setResult(null);
    setError("");
    setValidationErrors([]);
  }

  function handleFile(file: File) {
    setError("");
    setResult(null);
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",
      transformHeader: (header) => header.trim(),
      complete: (parsed) => {
        const data = parsed.data.filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
        const sourceHeaders = parsed.meta.fields?.filter(Boolean) ?? [];
        setRows(data as Record<string, string>[]);
        setHeaders(sourceHeaders);
        setColumnMap(buildAutoMap(sourceHeaders, config.fields));
      },
      error: (err) => {
        setError(err.message);
        setRows([]);
        setHeaders([]);
        setColumnMap({});
        setValidationErrors([]);
      },
    });
  }

  async function runImport() {
    if (!rows.length) {
      setError("Sube primero un CSV con filas válidas.");
      return;
    }

    if (!mappedRows.length) {
      setError("No hay filas mapeadas para importar.");
      return;
    }

    if (rowValidation.errors.length > 0) {
      setError("Hay filas con campos obligatorios incompletos. Corrige la validación antes de importar.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/importaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          rows: mappedRows,
          sourceRows: rows,
          sourceHeaders: headers,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setResult(data);
        throw new Error(data.error ?? "Error ejecutando importación");
      }

      setResult(data);
      setValidationErrors([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F5] py-8 px-4 lg:px-6">
      <div className="max-w-full mx-auto space-y-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold text-[#4A4A4A]">📥 Importar CSV</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-3xl">
              Sube archivos CSV para categorías, productos, combinaciones, clientes, direcciones, marcas, proveedores y atributos.
            </p>
          </div>

          <button
            onClick={() => router.push("/admin")}
            className="px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#6BAEC9] to-[#A8D7E6] hover:opacity-90 shadow transition"
          >
            ← Volver al panel
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.28fr)_minmax(320px,0.72fr)] gap-6 xl:gap-8">
          <div className="min-w-0 bg-white rounded-2xl shadow-lg border border-[#6BAEC9]/10 p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de importación</label>
                <select
                  value={tipo}
                  onChange={(e) => {
                    setTipo(e.target.value as ImportType);
                    setError("");
                    setResult(null);
                    setRows([]);
                    setHeaders([]);
                    setColumnMap({});
                    setValidationErrors([]);
                    setFileName("");
                  }}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                >
                  {IMPORT_ORDER.map((key) => (
                    <option key={key} value={key}>{TYPES[key].label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-3">
                <label className="flex-1 cursor-pointer rounded-xl border-2 border-dashed border-[#6BAEC9]/30 bg-[#F8F8F5] px-4 py-3 text-sm text-gray-600 hover:border-[#6BAEC9] hover:bg-white transition">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-[#6BAEC9]" />
                    <span>{fileName ? fileName : "Seleccionar CSV"}</span>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition"
                >
                  <RefreshCw className="w-4 h-4" /> Limpiar
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => downloadTemplate(tipo)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#6BAEC9]/30 text-[#2c3e50] bg-white hover:bg-[#f6fbfd] text-sm font-semibold transition"
              >
                <FileText className="w-4 h-4" /> Descargar plantilla CSV
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/importaciones/mapeo", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ tipo, mapping: columnMap }),
                    });

                    const data = await res.json();
                    if (!res.ok || !data.ok) {
                      throw new Error(data.error ?? "No se pudo guardar el mapeo");
                    }

                    setMappingOwner({ adminId: data.adminId ?? null, adminEmail: data.adminEmail ?? null });
                    setMappingStatus(data.adminEmail ? `Mapeo guardado para ${data.adminEmail}` : "Mapeo guardado en backend");
                  } catch (saveError: any) {
                    setMappingStatus(saveError.message);
                  }
                }}
                disabled={!headers.length}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-semibold transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Guardar mapeo
              </button>
              <button
                type="button"
                onClick={() => {
                  setColumnMap(buildAutoMap(headers, config.fields));
                  setMappingStatus("Mapeo restablecido");
                }}
                disabled={!headers.length}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-semibold transition disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" /> Restablecer mapeo
              </button>
              <p className="text-xs text-gray-500">
                La plantilla sale con las columnas que espera la importación seleccionada.
              </p>
            </div>

            {mappingStatus && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {mappingStatus}
                {mappingOwner.adminEmail && (
                  <div className="mt-1 text-xs text-emerald-700">
                    Mapeo asociado a {mappingOwner.adminEmail}{mappingOwner.adminId ? ` (ID ${mappingOwner.adminId})` : ""}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="space-y-2 text-sm text-blue-900">
                  <p className="font-semibold">{config.label}</p>
                  <p>{config.description}</p>
                  <p>{config.hint}</p>
                </div>
              </div>
            </div>

            {headers.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-800">Mapeo de columnas</h3>
                  <p className="text-xs text-gray-500">Relaciona las columnas del CSV con los campos de la importación.</p>
                </div>

                <div className="grid gap-3">
                  {config.fields.map((field) => (
                    <div key={field} className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-center">
                      <label className="text-sm font-semibold text-gray-700">{field}</label>
                      <select
                        value={columnMap[field] || ""}
                        onChange={(e) => setColumnMap((prev) => ({ ...prev, [field]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                      >
                        <option value="">-- no usar --</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-semibold">Validación previa</p>
                    <p>Hay filas con campos obligatorios sin completar. Corrige los datos antes de importar.</p>
                  </div>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {validationErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            {result && (
              <div className={`rounded-2xl p-4 text-sm flex items-start gap-3 ${result.failed > 0 ? "border border-amber-200 bg-amber-50 text-amber-800" : "border border-green-200 bg-green-50 text-green-700"}`}>
                <CheckCircle2 className="w-5 h-5 mt-0.5" />
                <div className="space-y-3 w-full">
                  <div>
                    <p className="font-semibold">{result.failed > 0 ? "Importación completada con avisos" : "Importación completada"}</p>
                    <p>Procesadas: {result.imported ?? 0} · Fallidas: {result.failed ?? 0}</p>
                  </div>

                  {Array.isArray(result.errors) && result.errors.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-white/80 p-3 text-xs text-amber-900">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="font-semibold">Informe de errores</p>
                        <button
                          type="button"
                          onClick={downloadErrorReport}
                          className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-50 transition"
                        >
                          <FileText className="w-3.5 h-3.5" /> Descargar CSV
                        </button>
                      </div>
                      <ul className="space-y-1 list-disc pl-5">
                        {result.errors.map((item: { row: number; error: string }) => (
                          <li key={`${item.row}-${item.error}`}>
                            Fila {item.row}: {item.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Vista previa</p>
                <p className="text-xs text-gray-500">Se muestran las primeras 10 filas detectadas del CSV.</p>
              </div>

                <button
                  type="button"
                  onClick={runImport}
                  disabled={!canImport || loading}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#6BAEC9] hover:bg-[#5FA0B3] text-white font-semibold shadow transition disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {loading ? "Importando..." : "Ejecutar importación"}
                </button>
            </div>

            <div
              className="max-h-[52vh] overflow-auto rounded-2xl border border-gray-200 bg-white"
              style={{ scrollbarWidth: "thin", scrollbarGutter: "stable both-edges" }}
            >
              <table className="min-w-max w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    {config.fields.map((field) => (
                      <th key={field} className="px-4 py-3 text-left whitespace-nowrap">{field}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {previewRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-gray-400" colSpan={config.fields.length}>
                        Sube un CSV para ver la vista previa.
                      </td>
                    </tr>
                  ) : (
                    previewRows.map((row, index) => (
                      <tr key={index} className="align-top">
                        {config.fields.map((field) => (
                          <td key={field} className="px-4 py-3 text-gray-700 whitespace-nowrap max-w-[240px] truncate">
                            {String(mappedRows[index]?.[field] ?? row[field] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="min-w-0 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-[#6BAEC9]/10 p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-[#4A4A4A]">Plantilla en vista previa</h2>
                <button
                  type="button"
                  onClick={() => downloadTemplate(templatePreviewType)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#6BAEC9]/30 bg-white px-3 py-2 text-xs font-semibold text-[#2c3e50] hover:bg-[#f6fbfd] transition"
                >
                  <FileText className="w-3.5 h-3.5" /> Descargar esta plantilla
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-[#F8F8F5] p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{templatePreview.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{templatePreview.description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {templatePreview.fields.map((field) => (
                    <span key={field} className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700">
                      {field}
                    </span>
                  ))}
                </div>

                <div
                  className="max-h-[280px] overflow-auto rounded-xl border border-gray-200 bg-white"
                  style={{ scrollbarWidth: "thin", scrollbarGutter: "stable both-edges" }}
                >
                  <table className="min-w-max w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 uppercase">
                      <tr>
                        {templatePreview.fields.map((field) => (
                          <th key={field} className="px-3 py-2 text-left whitespace-nowrap">{field}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {templatePreview.sampleRows.slice(0, 2).map((row, index) => (
                        <tr key={index}>
                          {templatePreview.fields.map((field) => (
                            <td key={field} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[180px] truncate">
                              {String(row[field] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Plantillas por tipo</h3>
                <div className="space-y-3">
                  {TEMPLATE_TYPES.map((template) => (
                    <div key={template.type} className={`rounded-xl border p-4 transition ${template.type === templatePreviewType ? "border-[#6BAEC9] bg-[#f6fbfd]" : "border-gray-200 bg-white"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{template.label}</p>
                          <p className="text-xs text-gray-500 mt-1">{template.note}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => previewTemplateByType(template.type)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadTemplateByType(template.type)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                          >
                            <FileText className="w-3.5 h-3.5" /> CSV
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-[#6BAEC9]/10 p-6">
              <h2 className="text-lg font-bold text-[#4A4A4A] mb-4">Notas de uso</h2>
              <ul className="space-y-3 text-sm text-gray-600 list-disc pl-5">
                <li>El CSV puede usar coma, punto y coma o barra vertical como separador; el importador intenta detectarlo.</li>
                <li>Para productos, usa <strong>marca</strong> y <strong>categoria/categorias</strong> por nombre.</li>
                <li>Para combinaciones, usa <strong>productoReferencia</strong> y un campo <strong>atributos</strong> con IDs o valores separados por <strong>|</strong>, <strong>;</strong> o coma.</li>
                <li>Para valores de atributo, crea antes el atributo padre o referencia su nombre en la columna <strong>atributo</strong>.</li>
                <li>Si un registro ya existe por su clave natural, se actualiza en lugar de duplicarse.</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-[#6BAEC9]/10 p-6">
              <h2 className="text-lg font-bold text-[#4A4A4A] mb-4">Orden recomendado</h2>
              <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-5">
                <li>Categorías y categorías hijas.</li>
                <li>Marcas y proveedores.</li>
                <li>Atributos y sus valores.</li>
                <li>Productos básicos.</li>
                <li>Combinaciones / variantes de producto.</li>
                <li>Clientes y direcciones.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}