"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Upload, FileText, CheckCircle2, AlertTriangle, RefreshCw, History, ChevronDown, ChevronUp, Clock } from "lucide-react";

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
    description: "Importa o actualiza productos básicos con imágenes, categorías y SEO.",
    fields: ["accion", "referencia", "nombre", "descripcion", "descripcion_html", "composicion", "precio", "precioOferta", "descuento", "precioCoste", "reglaImpuesto", "reglaImpuestoId", "stock", "stockMinimo", "activo", "destacado", "enOferta", "marca", "categoria", "categorias", "imagenes", "slug", "metaTitulo", "metaDescripcion"],
    requiredFields: ["nombre", "referencia"],
    hint: "Usa accion con upsert o delete. La referencia es obligatoria y única. Usa precioOferta o descuento. Si rellenas descuento, se calculará el precio oferta automáticamente. Si no indicas reglaImpuesto, se usará IVA GENERAL 21%. categorias e imagenes admiten listas separadas por |, ; o coma. El campo composicion es opcional (100% Poliéster, tratamientos, etc.). metaTitulo y metaDescripcion son para SEO (opcional). NOTA: El precio del CSV debe tener IVA incluido; el importador lo divide automáticamente.",
    sampleRows: [
      {
        accion: "upsert",
        referencia: "PROD-001",
        nombre: "Estor enrollable demo",
        descripcion: "Estor enrollable con tejido translúcido.",
        descripcion_html: "<p>Estor enrollable con tejido translúcido.</p>",
        composicion: "100% Poliéster\nTratamiento UV protector",
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
        metaTitulo: "Happystor Estor Enrollable Estampado Digital Cocina Traslúcido",
        metaDescripcion: "Estor digital para cocina de alta calidad. Bonitos diseños gastronómicos exclusivos, económico, a medida y envío gratuito.",
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
  const JOB_STORAGE_KEY = "importaciones:lastJobId";
  const router = useRouter();
  const [tipo, setTipo] = useState<ImportType>("productos");
  const [templatePreviewType, setTemplatePreviewType] = useState<ImportType>("productos");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [jobAction, setJobAction] = useState<"import" | "validate" | null>(null);
  const [importJob, setImportJob] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [mappingStatus, setMappingStatus] = useState<string>("");
  const [mappingOwner, setMappingOwner] = useState<{ adminId: number | null; adminEmail: string | null }>({ adminId: null, adminEmail: null });
  const [presetName, setPresetName] = useState<string>("");
  const [savedPresets, setSavedPresets] = useState<string[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialExpandido, setHistorialExpandido] = useState<Record<string, boolean>>({});

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
        if (sourceHeader) {
          mapped[field] = String(row[sourceHeader] ?? "").trim();
        }
        // Fields without a source header (sin usar) are omitted entirely
        // so existing DB values are preserved on update
      }
      return mapped;
    });
  }, [rows, columnMap, config.fields]);

  const rowValidation = useMemo(() => validateRows(mappedRows, config.requiredFields, tipo), [mappedRows, config.requiredFields, tipo]);

  const canImport = mappedRows.length > 0 && rowValidation.errors.length === 0;

  function formatProgressDuration(seconds: number) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function formatImportJobTime(job: any) {
    if (!job?.updatedAt) return "--:--";
    return formatProgressDuration(job.stalledSeconds ?? 0);
  }

  const isValidationJob = importJob?.mode === "validate";

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

        if (Array.isArray(data.presets)) {
          setSavedPresets(data.presets as string[]);
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
    setSavedPresets([]);
    setPresetName("");
  }, [tipo]);

  useEffect(() => {
    if (!headers.length) return;
    setValidationErrors(rowValidation.errors.slice(0, 20));
  }, [rowValidation.errors, headers.length]);

  useEffect(() => {
    let cancelled = false;

    async function restoreLastJob() {
      const lastJobId = localStorage.getItem(JOB_STORAGE_KEY);
      if (!lastJobId) return;

      try {
        const res = await fetch(`/api/importaciones?jobId=${encodeURIComponent(lastJobId)}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok || !data.ok || cancelled) {
          if (res.status === 404) {
            localStorage.removeItem(JOB_STORAGE_KEY);
          }
          return;
        }

        setImportJob(data.job ?? null);
        if (data.job?.status === "completed") {
          setResult(data.job.result ?? null);
        } else if (data.job?.status === "running" || data.job?.status === "queued") {
          void monitorImportJob(lastJobId);
        }
      } catch {
        if (!cancelled) return;
      }
    }

    restoreLastJob();

    return () => {
      cancelled = true;
    };
  }, []);

  const cargarHistorial = useCallback(async () => {
    setHistorialLoading(true);
    try {
      const res = await fetch("/api/importaciones", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setHistorial(data.jobs ?? []);
    } catch {
      // silencio
    } finally {
      setHistorialLoading(false);
    }
  }, []);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

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
    const jobErrors = Array.isArray(result?.errors) && result.errors.length > 0 ? result.errors : Array.isArray(importJob?.errors) ? importJob.errors : [];
    if (!jobErrors.length) return;

    const rowsForExport = jobErrors.map((item: { row: number; error: string; sourceRow?: Record<string, any> }) => {
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

  async function monitorImportJob(jobId: string) {
    let keepPolling = true;

    while (keepPolling) {
      const statusRes = await fetch(`/api/importaciones?jobId=${encodeURIComponent(jobId)}`, {
        cache: "no-store",
      });
      const statusData = await statusRes.json();

      if (!statusRes.ok || !statusData.ok) {
        throw new Error(statusData.error ?? "No se pudo consultar el progreso");
      }

      setImportJob(statusData.job ?? null);

      if (statusData.job?.status === "completed") {
        setResult(statusData.job.result ?? null);
        setValidationErrors([]);
        keepPolling = false;
      } else if (statusData.job?.status === "failed") {
        throw new Error(statusData.job.error ?? "La importación se ha detenido con error");
      } else if (statusData.job?.status === "paused") {
        keepPolling = false;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async function sendJobAction(action: "cancel" | "resume") {
    if (!importJob?.id) return;

    const res = await fetch("/api/importaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: importJob.id, action }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? `No se pudo ${action === "cancel" ? "pausar" : "reanudar"} la importación`);
    }

    setImportJob(data.job ?? null);
    localStorage.setItem(JOB_STORAGE_KEY, importJob.id);

    if (action === "resume") {
      await monitorImportJob(importJob.id);
    }
  }

  async function cancelImportJob() {
    setError("");
    try {
      await sendJobAction("cancel");
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function resumeImportJob() {
    setError("");
    setLoading(true);
    try {
      await sendJobAction("resume");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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

  async function startBackgroundJob(mode: "import" | "validate") {
    if (!rows.length) {
      setError("Sube primero un CSV con filas válidas.");
      return;
    }

    if (!mappedRows.length) {
      setError("No hay filas mapeadas para importar.");
      return;
    }

    if (mode === "import" && rowValidation.errors.length > 0) {
      setError("Hay filas con campos obligatorios incompletos. Corrige la validación antes de importar.");
      return;
    }

    setLoading(true);
    setJobAction(mode);
    setError("");
    setResult(null);
    setImportJob(null);

    const CHUNK_SIZE = 500;

    try {
      // ── 1. Create empty pending job ──────────────────────────────────────────
      const createRes = await fetch("/api/importaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", tipo, mode }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.ok || !createData.jobId) {
        throw new Error(createData.error ?? "No se pudo crear el trabajo de importación");
      }
      const jobId = createData.jobId as string;
      localStorage.setItem(JOB_STORAGE_KEY, jobId);

      // ── 2. Send rows in chunks ───────────────────────────────────────────────
      const totalChunks = Math.ceil(mappedRows.length / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, mappedRows.length);
        const chunkRows = mappedRows.slice(start, end);
        const chunkSource = rows.slice(start, end);

        setImportJob((prev) => prev
          ? { ...prev, message: `Enviando filas ${end}/${mappedRows.length}...` }
          : null
        );

        const appendRes = await fetch("/api/importaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "append", jobId, rows: chunkRows, sourceRows: chunkSource }),
        });
        const appendData = await appendRes.json();
        if (!appendRes.ok || !appendData.ok) {
          throw new Error(appendData.error ?? `Error enviando chunk ${i + 1}/${totalChunks}`);
        }
      }

      // ── 3. Start processing ──────────────────────────────────────────────────
      const startRes = await fetch("/api/importaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", jobId }),
      });
      const startData = await startRes.json();
      if (!startRes.ok || !startData.ok) {
        throw new Error(startData.error ?? "No se pudo iniciar el procesamiento");
      }

      setImportJob(startData.job ?? null);
      await monitorImportJob(jobId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setJobAction(null);
    }
  }

  async function runImport() {
    await startBackgroundJob("import");
  }

  async function runPrevalidation() {
    await startBackgroundJob("validate");
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
            {importJob && (
              <div className={`rounded-2xl border p-4 ${importJob.status === "failed" ? "border-red-200 bg-red-50 text-red-800" : importJob.status === "completed" ? "border-green-200 bg-green-50 text-green-800" : "border-[#6BAEC9]/20 bg-[#6BAEC9]/5 text-[#2c3e50]"}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] font-semibold text-gray-500">Progreso de importación</p>
                    <h2 className="mt-1 text-lg font-bold">
                      {importJob.status === "paused" ? "Pausado" : importJob.phase || "Procesando"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">{importJob.currentLabel || "Preparando importación"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold">{importJob.current || 0}/{importJob.total || 0}</p>
                    <p className="text-xs text-gray-500">{importJob.progress ?? 0}%</p>
                  </div>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/70 border border-white/60">
                  <div
                    className={`h-full rounded-full transition-all ${importJob.status === "failed" ? "bg-red-500" : importJob.status === "completed" ? "bg-green-500" : "bg-[#6BAEC9]"}`}
                    style={{ width: `${Math.max(0, Math.min(100, importJob.progress ?? 0))}%` }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                  <span>Creados: {importJob.counts?.created ?? 0}</span>
                  <span>Actualizados: {importJob.counts?.updated ?? 0}</span>
                  <span>Eliminados: {importJob.counts?.deleted ?? 0}</span>
                  <span>Omitidos: {importJob.counts?.skipped ?? 0}</span>
                  <span>Errores: {importJob.counts?.failed ?? 0}</span>
                  <span>Inactividad: {formatImportJobTime(importJob)}</span>
                  {importJob.stalled && <span className="font-semibold text-red-600">Sin avance detectado</span>}
                </div>

                {importJob.status === "failed" && importJob.error && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-white/80 p-3 text-sm text-red-800">
                    <p className="font-semibold">Causa del fallo</p>
                    <p className="mt-1 break-words">{importJob.error}</p>
                  </div>
                )}

                {(Array.isArray(importJob.errors) && importJob.errors.length > 0) && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-white/80 p-3 text-xs text-amber-900">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="font-semibold">Filas con error</p>
                      <button
                        type="button"
                        onClick={downloadErrorReport}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-50 transition"
                      >
                        <FileText className="w-3.5 h-3.5" /> Descargar CSV
                      </button>
                    </div>
                    <ul className="space-y-1 list-disc pl-5 max-h-44 overflow-auto">
                      {(Array.isArray(result?.errors) && result.errors.length > 0 ? result.errors : importJob.errors).map((item: { row: number; error: string }) => (
                        <li key={`${item.row}-${item.error}`}>
                          Fila {item.row}: {item.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {importJob.status === "running" && (
                    <button
                      type="button"
                      onClick={cancelImportJob}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Pausar importación
                    </button>
                  )}
                  {importJob.status === "paused" && (
                    <button
                      type="button"
                      onClick={resumeImportJob}
                      className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
                    >
                      Reanudar importación
                    </button>
                  )}
                </div>

                <div className="mt-2 text-xs text-gray-500 break-all">
                  Trabajo {importJob.id}
                </div>
              </div>
            )}

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

            {/* Preset save/load area */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Presets de mapeo</p>

              {/* Save preset */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Nombre del preset (ej: solo categorias)"
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6BAEC9]/40"
                />
                <button
                  type="button"
                  disabled={!headers.length || !presetName.trim()}
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/importaciones/mapeo", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tipo, mapping: columnMap, nombre: presetName.trim() }),
                      });
                      const data = await res.json();
                      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo guardar el preset");
                      setSavedPresets(Array.isArray(data.presets) ? data.presets : []);
                      setMappingStatus(`Preset "${presetName.trim()}" guardado`);
                      setPresetName("");
                    } catch (e: any) {
                      setMappingStatus(e.message);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6BAEC9] hover:bg-[#5a9db8] text-white text-sm font-semibold transition disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" /> Guardar preset
                </button>
                <button
                  type="button"
                  disabled={!headers.length}
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/importaciones/mapeo", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tipo, mapping: columnMap }),
                      });
                      const data = await res.json();
                      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo guardar el mapeo");
                      setMappingOwner({ adminId: data.adminId ?? null, adminEmail: data.adminEmail ?? null });
                      setMappingStatus(data.adminEmail ? `Mapeo por defecto guardado para ${data.adminEmail}` : "Mapeo por defecto guardado");
                    } catch (e: any) {
                      setMappingStatus(e.message);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-100 text-sm font-semibold transition disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" /> Guardar como predeterminado
                </button>
              </div>

              {/* Saved presets list */}
              {savedPresets.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Presets guardados — haz clic para cargar:</p>
                  <div className="flex flex-wrap gap-2">
                    {savedPresets.map((name) => (
                      <div key={name} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white text-sm overflow-hidden">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `/api/importaciones/mapeo?tipo=${encodeURIComponent(tipo)}&preset=${encodeURIComponent(name)}`,
                                { credentials: "include" }
                              );
                              const data = await res.json();
                              if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo cargar el preset");
                              if (!data.found) throw new Error(`Preset "${name}" no encontrado`);
                              const filtered = Object.fromEntries(
                                Object.entries(data.mapping as Record<string, string>).filter(([, h]) => headers.includes(h))
                              );
                              setColumnMap(dedupeMapping(filtered, config.fields));
                              setMappingStatus(`Preset "${name}" cargado`);
                            } catch (e: any) {
                              setMappingStatus(e.message);
                            }
                          }}
                          className="px-3 py-1.5 text-gray-700 hover:bg-[#f0f8fc] hover:text-[#2c3e50] font-medium transition"
                        >
                          {name}
                        </button>
                        <button
                          type="button"
                          title="Eliminar preset"
                          onClick={async () => {
                            if (!confirm(`¿Eliminar el preset "${name}"?`)) return;
                            try {
                              const res = await fetch(
                                `/api/importaciones/mapeo?tipo=${encodeURIComponent(tipo)}&preset=${encodeURIComponent(name)}`,
                                { method: "DELETE", credentials: "include" }
                              );
                              const data = await res.json();
                              if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo eliminar");
                              setSavedPresets(Array.isArray(data.presets) ? data.presets : []);
                              setMappingStatus(`Preset "${name}" eliminado`);
                            } catch (e: any) {
                              setMappingStatus(e.message);
                            }
                          }}
                          className="px-2 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition border-l border-gray-200"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              <div className={`rounded-2xl p-4 text-sm flex items-start gap-3 ${(result.failed > 0 || result.skipped > 0) ? "border border-amber-200 bg-amber-50 text-amber-800" : "border border-green-200 bg-green-50 text-green-700"}`}>
                <CheckCircle2 className="w-5 h-5 mt-0.5" />
                <div className="space-y-3 w-full">
                  <div>
                    <p className="font-semibold">
                      {isValidationJob
                        ? (result.failed > 0 || result.skipped > 0)
                          ? "Prevalidación completada con avisos"
                          : "Prevalidación completada"
                        : (result.failed > 0 || result.skipped > 0)
                          ? "Importación completada con avisos"
                          : "Importación completada"}
                    </p>
                    <p>
                      {isValidationJob ? "Filas verificadas" : "Procesadas"}: {result.imported ?? 0} · Fallidas: {result.failed ?? 0}
                      {typeof result.skipped === "number" ? ` · Omitidas: ${result.skipped}` : ""}
                    </p>
                    {isValidationJob && (result.failed > 0 || result.skipped > 0) && (
                      <p className="text-xs mt-1 text-amber-700">Corrige estas filas antes de lanzar la importación real.</p>
                    )}
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

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={runPrevalidation}
                  disabled={!mappedRows.length || loading || importJob?.status === "running"}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#6BAEC9]/30 bg-white text-[#2c3e50] font-semibold shadow-sm transition disabled:opacity-50 hover:bg-[#6BAEC9]/5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {loading && jobAction === "validate" ? "Prevalidando..." : "Prevalidar CSV"}
                </button>

                <button
                  type="button"
                  onClick={runImport}
                  disabled={!canImport || loading || importJob?.status === "running"}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#6BAEC9] hover:bg-[#5FA0B3] text-white font-semibold shadow transition disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {loading && jobAction === "import" ? "Importando..." : "Ejecutar importación"}
                </button>
              </div>
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
        {/* ── Historial de importaciones ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#6BAEC9]/10 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#6BAEC9]" />
              <h2 className="text-lg font-bold text-[#4A4A4A]">Historial de importaciones</h2>
              <span className="text-xs text-gray-400">({historial.length} registros · últimos 7 días)</span>
            </div>
            <button
              type="button"
              onClick={cargarHistorial}
              disabled={historialLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historialLoading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>

          {historial.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              {historialLoading ? "Cargando historial…" : "No hay importaciones registradas en los últimos 7 días."}
            </p>
          ) : (
            <div className="space-y-2">
              {historial.map((job: any) => {
                const isCompleted = job.status === "completed";
                const isFailed = job.status === "failed";
                const isPaused = job.status === "paused";
                const isRunning = job.status === "running" || job.status === "queued";
                const isValidate = job.mode === "validate";
                const errorCount = Array.isArray(job.errors) ? job.errors.length : (job.counts?.failed ?? 0);
                const expandido = historialExpandido[job.id] ?? false;

                const duracionMs = job.finishedAt && job.startedAt
                  ? new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()
                  : null;
                const duracionStr = duracionMs !== null
                  ? duracionMs < 60000
                    ? `${Math.round(duracionMs / 1000)}s`
                    : `${Math.floor(duracionMs / 60000)}m ${Math.round((duracionMs % 60000) / 1000)}s`
                  : null;

                const fechaStr = new Date(job.createdAt).toLocaleString("es-ES", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                });

                return (
                  <div
                    key={job.id}
                    className={`rounded-xl border p-4 text-sm ${
                      isFailed ? "border-red-200 bg-red-50" :
                      isCompleted && errorCount > 0 ? "border-amber-200 bg-amber-50" :
                      isCompleted ? "border-green-200 bg-green-50" :
                      isPaused ? "border-yellow-200 bg-yellow-50" :
                      "border-[#6BAEC9]/20 bg-[#6BAEC9]/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Icono estado */}
                        <div className="mt-0.5 shrink-0">
                          {isCompleted && errorCount === 0 && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                          {isCompleted && errorCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                          {isFailed && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          {isPaused && <Clock className="w-4 h-4 text-yellow-600" />}
                          {isRunning && <RefreshCw className="w-4 h-4 text-[#6BAEC9] animate-spin" />}
                        </div>
                        <div className="min-w-0">
                          {/* Tipo + modo + estado */}
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-800 capitalize">{job.tipo}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isValidate ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                              {isValidate ? "Prevalidación" : "Importación"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              isCompleted && errorCount === 0 ? "bg-green-100 text-green-700" :
                              isCompleted ? "bg-amber-100 text-amber-700" :
                              isFailed ? "bg-red-100 text-red-700" :
                              isPaused ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {isCompleted ? (errorCount === 0 ? "Completado" : "Completado con errores") :
                               isFailed ? "Fallido" :
                               isPaused ? "Pausado" :
                               isRunning ? "En curso" : job.status}
                            </span>
                          </div>
                          {/* Fecha + duración */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                            <span>{fechaStr}</span>
                            {duracionStr && <span>Duración: {duracionStr}</span>}
                            <span>ID: <span className="font-mono">{job.id.slice(0, 8)}…</span></span>
                          </div>
                          {/* Contadores */}
                          <div className="flex flex-wrap gap-3 text-xs">
                            <span className="text-green-700">✓ Creados: {job.counts?.created ?? 0}</span>
                            <span className="text-blue-700">↑ Actualizados: {job.counts?.updated ?? 0}</span>
                            <span className="text-gray-600">↗ Total: {job.total ?? 0}</span>
                            {(job.counts?.failed ?? 0) > 0 && (
                              <span className="text-red-600 font-semibold">✗ Errores: {job.counts?.failed ?? 0}</span>
                            )}
                            {(job.counts?.skipped ?? 0) > 0 && (
                              <span className="text-amber-600">⚠ Omitidos: {job.counts?.skipped ?? 0}</span>
                            )}
                          </div>
                          {/* Error fatal */}
                          {isFailed && job.error && (
                            <p className="mt-2 text-xs text-red-700 font-medium break-words">{job.error}</p>
                          )}
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 shrink-0">
                        {errorCount > 0 && Array.isArray(job.errors) && (
                          <button
                            type="button"
                            onClick={() => setHistorialExpandido(prev => ({ ...prev, [job.id]: !prev[job.id] }))}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 transition"
                          >
                            {expandido ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {errorCount} error{errorCount !== 1 ? "es" : ""}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setTipo(job.tipo as ImportType);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                        >
                          Repetir tipo
                        </button>
                      </div>
                    </div>

                    {/* Lista de errores expandida */}
                    {expandido && Array.isArray(job.errors) && job.errors.length > 0 && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-white/80 p-3">
                        <p className="text-xs font-semibold text-amber-800 mb-2">Filas con error ({job.errors.length})</p>
                        <ul className="space-y-1 list-disc pl-4 max-h-48 overflow-auto text-xs text-amber-900">
                          {job.errors.map((item: any, idx: number) => (
                            <li key={idx}>
                              <span className="font-medium">Fila {item.row}:</span> {item.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
