"use client";

export const dynamic = "force-dynamic";

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
    fields: ["accion", "nombre", "slug", "descripcion", "imagen", "activa", "orden", "parentId", "parentNombre"],
    requiredFields: ["nombre"],
    hint: "Usa accion con upsert o delete. Usa parentId o parentNombre para crear subcategorías.",
    sampleRows: [
      { accion: "upsert", nombre: "Estores Digitales", slug: "estores-digitales", descripcion: "Colección principal", imagen: "https://example.com/categorias/estores.jpg", activa: "1", orden: "1" },
      { accion: "delete", nombre: "Infantiles" },
    ],
  },
  marcas: {
    label: "Marcas",
    description: "Alta o actualización de marcas.",
    fields: ["accion", "nombre", "descripcion", "imagen", "logo_url"],
    requiredFields: ["nombre"],
    hint: "Usa accion con upsert o delete. El nombre es único.",
    sampleRows: [
      { accion: "upsert", nombre: "Happystor", descripcion: "Marca demo de estores", imagen: "https://example.com/marcas/happystor.png", logo_url: "https://example.com/marcas/happystor-logo.png" },
      { accion: "delete", nombre: "Marca antigua" },
    ],
  },
  proveedores: {
    label: "Proveedores",
    description: "Importa proveedores y opcionalmente los vincula a una marca.",
    fields: ["accion", "nombre", "descripcion", "imagen", "contacto", "email", "telefono", "direccion", "nif", "activo", "marca"],
    requiredFields: ["nombre"],
    hint: "Usa accion con upsert o delete. Si indicas marca, debe existir previamente.",
    sampleRows: [
      {
        accion: "upsert",
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
      { accion: "delete", nombre: "Proveedor Antiguo" },
    ],
  },
  atributos: {
    label: "Atributos",
    description: "Crea atributos como Tamaño, Color o Tirador y define su modo visual.",
    fields: ["accion", "nombre", "tipo", "orden"],
    requiredFields: ["nombre"],
    hint: "Usa accion con upsert o delete. Puedes enviar tipo, group_type o is_color_group para dejar preparado el modo visual del atributo. Después importa sus valores con el tipo de atributo valores.",
    sampleRows: [
      { accion: "upsert", nombre: "Tamaño", tipo: "desplegable", orden: "1" },
      { accion: "upsert", nombre: "Color", tipo: "miniatura_imagen_color", orden: "2" },
      { accion: "delete", nombre: "Tirador" },
    ],
  },
  atributovalores: {
    label: "Valores de atributo",
    description: "Crea valores para un atributo existente.",
    fields: ["accion", "atributo", "atributoId", "valor", "colorHex", "imagen", "orden"],
    requiredFields: ["valor", "atributo"],
    hint: "Usa accion con upsert o delete. Puedes indicar atributo por nombre o atributoId.",
    sampleRows: [
      { accion: "upsert", atributo: "Tamaño", valor: "80x200", orden: "1" },
      { accion: "delete", atributo: "Color", valor: "Blanco" },
    ],
  },
  clientes: {
    label: "Clientes",
    description: "Importa cuentas de cliente y su dirección principal.",
    fields: ["accion", "nombre", "apellidos", "email", "password", "telefono", "empresa", "nif", "direccion", "direccionComplementaria", "codigoPostal", "ciudad", "provincia", "pais", "activo", "aceptaMarketing", "role"],
    requiredFields: ["nombre", "apellidos", "email"],
    hint: "Usa accion con upsert o delete. Con este import basta el CSV de clientes: si envías direccion, también se creará o actualizará la dirección principal. Si no envías password, se usará 123456. Si el password viene ya hasheado en bcrypt (por ejemplo, desde PrestaShop `passwd`), se guardará tal cual.",
    sampleRows: [
      {
        accion: "upsert",
        nombre: "Cliente",
        apellidos: "Demo",
        email: "cliente@demo.com",
        password: "123456",
        telefono: "600000000",
        empresa: "Demo S.L.",
        nif: "12345678A",
        direccion: "Calle Principal 1",
        direccionComplementaria: "Piso 3",
        codigoPostal: "46000",
        ciudad: "Valencia",
        provincia: "Valencia",
        pais: "España",
        activo: "1",
        aceptaMarketing: "0",
        role: "cliente",
      },
      { accion: "delete", email: "cliente-a-borrar@demo.com" },
    ],
  },
  direcciones: {
    label: "Direcciones",
    description: "Importa direcciones asociadas a clientes.",
    fields: ["accion", "clienteId", "clienteEmail", "alias", "nombre", "apellidos", "empresa", "nif", "telefono", "direccion", "complemento", "codigoPostal", "ciudad", "provincia", "pais", "predeterminada"],
    requiredFields: ["alias", "nombre", "apellidos", "direccion"],
    hint: "Usa accion con upsert o delete. Debes indicar clienteId o clienteEmail.",
    sampleRows: [
      {
        accion: "upsert",
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
      { accion: "delete", clienteEmail: "cliente@demo.com", alias: "Trabajo" },
    ],
  },
  productos: {
    label: "Productos",
    description: "Importa o actualiza productos básicos con imágenes y categorías.",
    fields: ["accion", "referencia", "nombre", "descripcion", "descripcion_html", "precio", "precioOferta", "descuento", "precioCoste", "reglaImpuesto", "reglaImpuestoId", "stock", "stockMinimo", "activo", "destacado", "enOferta", "marca", "categoria", "categorias", "imagenes", "slug"],
    requiredFields: ["nombre", "referencia"],
    hint: "Usa accion con upsert o delete. La referencia es obligatoria y única. Usa precioOferta o descuento. Si rellenas descuento, se calculará el precio oferta automáticamente. Si no indicas reglaImpuesto, se usará IVA GENERAL 21%. categorias e imagenes admiten listas separadas por |, ; o coma.",
    sampleRows: [
      {
        accion: "upsert",
        referencia: "PROD-001",
        nombre: "Estor enrollable demo",
        descripcion: "Estor enrollable con tejido translúcido.",
        descripcion_html: "<p>Estor enrollable con tejido translúcido.</p>",
        precio: "49.95",
        precioOferta: "39.95",
        descuento: "20",
        reglaImpuesto: "IVA GENERAL",
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
      { accion: "delete", referencia: "PROD-002" },
    ],
  },
  combinaciones: {
    label: "Combinaciones",
    description: "Crea variantes de producto.",
    fields: ["accion", "productoReferencia", "referencia", "stock", "precio_extra", "imagen", "imagenMuestra", "imagenesVariante", "color", "tamano", "tirador"],
    requiredFields: ["productoReferencia", "referencia"],
    hint: "Usa accion con upsert o delete. Usa productoReferencia para enlazar la variante con el producto padre. La columna imagen es la foto principal de esa combinación y imagenesVariante admite varias URLs separadas por | para su carrusel. atributos es opcional y solo sirve si quieres pasar IDs o valores de atributo ya creados.",
    sampleRows: [
      { accion: "upsert", productoReferencia: "PROD-001", referencia: "PROD-001-GRIS", stock: "10", precio_extra: "5", color: "Gris", tamano: "80x200", tirador: "Izquierda", imagenesVariante: "https://example.com/ambiente.jpg|https://example.com/detalle.jpg" },
      { accion: "delete", productoReferencia: "PROD-001", referencia: "PROD-001-BLANCO" },
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
  { type: "productos", label: "Productos", note: "Referencia, precios, impuestos, descripciones y categorías." },
  { type: "combinaciones", label: "Combinaciones", note: "Variantes de producto por color/tamaño/tirador." },
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

  const fieldAliases: Record<string, string[]> = {
    nombre: ["firstname", "name", "nombre"],
    apellidos: ["lastname", "surname", "apellidos"],
    email: ["email", "mail", "correo"],
    password: ["password", "passwd", "passwordhash", "hashedpassword"],
    telefono: ["telefono", "phone", "mobile"],
    empresa: ["empresa", "company"],
    nif: ["nif", "vatnumber", "vat_number", "dni"],
    direccion: ["direccion", "address1", "address"],
    direccionComplementaria: ["direccioncomplementaria", "address2", "address_2", "complemento"],
    codigoPostal: ["codigopostal", "postcode", "zip", "zipcode"],
    ciudad: ["ciudad", "city"],
    provincia: ["provincia", "state", "region"],
    pais: ["pais", "country"],
    activo: ["activo", "active"],
    aceptaMarketing: ["aceptamarketing", "newsletter", "optin"],
    role: ["role"],
    tipo: ["tipo", "group_type", "grouptype"],
    orden: ["orden", "position"],
  };

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

  const rowValidation = useMemo(() => validateRows(mappedRows, config.requiredFields, tipo), [mappedRows, config.requiredFields, tipo]);

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
          setColumnMap(dedupeMapping(filtered as Record<string, string>, config.fields));
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
      if (exact) {
        map[field] = exact.raw;
        return;
      }

      const aliases = fieldAliases[field] ?? [];
      const aliasMatch = normalizedSource.find((item) => aliases.includes(item.norm));
      if (aliasMatch) map[field] = aliasMatch.raw;
    });

    return map;
  }

  function dedupeMapping(mapping: Record<string, string>, targetFields: string[]) {
    const normalized: Record<string, string> = {};
    const used = new Set<string>();

    for (const field of targetFields) {
      const header = mapping[field];
      if (!header || used.has(header)) continue;
      normalized[field] = header;
      used.add(header);
    }

    return normalized;
  }

  function validateRows(mapped: Record<string, string>[], requiredFields: string[], currentType: ImportType) {
    const errors: string[] = [];

    mapped.forEach((row, index) => {
      const action = String(row.accion ?? "").trim().toLowerCase();
      const deleteFields =
        action === "delete"
          ? currentType === "productos"
            ? ["referencia"]
            : currentType === "combinaciones"
              ? ["productoReferencia", "referencia"]
              : currentType === "clientes"
                ? ["email"]
                : currentType === "direcciones"
                  ? ["alias"]
                  : currentType === "atributovalores"
                    ? ["valor"]
                    : ["nombre"]
          : requiredFields;
      const missing = deleteFields.filter((field) => !String(row[field] ?? "").trim());

      if (tipo === "atributovalores" && !String(row.atributoId ?? "").trim() && !String(row.atributo ?? "").trim()) {
        missing.push("atributo o atributoId");
      }

      if (tipo === "clientes" && action !== "delete") {
        const nombre = String(row.nombre ?? "").trim();
        const apellidos = String(row.apellidos ?? "").trim();
        const email = String(row.email ?? "").trim();
        if (!nombre) missing.push("nombre");
        if (!apellidos) missing.push("apellidos");
        if (!email) missing.push("email");
      }

      if (tipo === "direcciones") {
        const clientKey = String(row.clienteId ?? "").trim() || String(row.clienteEmail ?? "").trim();
        if (!clientKey) missing.push("clienteId o clienteEmail");
        if (action !== "delete") {
          const nombre = String(row.nombre ?? "").trim();
          const apellidos = String(row.apellidos ?? "").trim();
          const direccion = String(row.direccion ?? "").trim();
          if (!nombre) missing.push("nombre");
          if (!apellidos) missing.push("apellidos");
          if (!direccion) missing.push("direccion");
        }
      }

      if (tipo === "combinaciones" && action !== "delete" && !String(row.productoReferencia ?? "").trim()) {
        missing.push("productoReferencia");
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
    link.download = `plantilla-${currentType}.csv`;
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

    const rowsForExport = result.errors.map((item: { row: number; error: string; sourceRow?: Record<string, any> }) => {
      const exportRow: Record<string, any> = {};
      const sourceRow = item.sourceRow ?? {};

      exportRow.fila = item.row;
      exportRow.error = item.error;

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

  async function handleFile(file: File) {
    setError("");
    setResult(null);
    setFileName(file.name);

    const detectDelimiter = (text: string) => {
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5);

      const candidates = [";", ",", "\t", "|"];
      let best = ";";
      let bestScore = -1;

      for (const candidate of candidates) {
        const score = lines.reduce((sum, line) => sum + Math.max(0, line.split(candidate).length - 1), 0);
        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }

      return bestScore > 0 ? best : ";";
    };

    try {
      const text = await file.text();
      const delimiter = detectDelimiter(text);

      Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        delimiter,
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
    } catch (err: any) {
      setError(err.message);
      setRows([]);
      setHeaders([]);
      setColumnMap({});
      setValidationErrors([]);
    }
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
                        onChange={(e) => {
                          const value = e.target.value;
                          setColumnMap((prev) => {
                            const next = { ...prev };
                            for (const otherField of config.fields) {
                              if (otherField !== field && next[otherField] === value) {
                                delete next[otherField];
                              }
                            }
                            if (value) next[field] = value;
                            else delete next[field];
                            return next;
                          });
                        }}
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#6BAEC9]/40 focus:border-[#6BAEC9] transition"
                      >
                        <option value="">-- no usar --</option>
                        {headers.filter((header) => {
                          const usedElsewhere = Object.entries(columnMap).some(([otherField, otherHeader]) => otherField !== field && otherHeader === header);
                          return !usedElsewhere || columnMap[field] === header;
                        }).map((header) => (
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
                <li>La columna <strong>accion</strong> acepta <strong>upsert</strong> o <strong>delete</strong> en todas las plantillas que la incluyen.</li>
                <li>Para productos, usa <strong>referencia</strong> como clave única, y <strong>marca</strong> y <strong>categoria/categorias</strong> por nombre.</li>
                <li>Para combinaciones, usa <strong>productoReferencia</strong> para enlazar el producto padre y <strong>referencia</strong> para identificar cada variante. El campo <strong>atributos</strong> es opcional.</li>
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
