import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { canEdit } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ error: "Sin permiso para subir imágenes" }, { status: 403 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido. Usa JPG, PNG, WEBP o GIF." }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "El archivo supera el límite de 5MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Subcarpeta de destino dentro de /public/img. Por compatibilidad, si no se
    // indica nada (o no está en la lista permitida) se usa "productos" como siempre.
    const CARPETAS_PERMITIDAS = ["productos", "popups"];
    const carpetaPedida = String(formData.get("carpeta") ?? "");
    const carpeta = CARPETAS_PERMITIDAS.includes(carpetaPedida) ? carpetaPedida : "productos";

    // En Plesk el proceso arranca desde el directorio del proyecto (donde está server.js)
    // process.cwd() puede variar; usamos la ruta relativa al módulo como fallback
    const projectRoot = process.cwd();
    const uploadDir = path.join(projectRoot, "public", "img", carpeta);

    // Crear el directorio si no existe (primera subida)
    await mkdir(uploadDir, { recursive: true });

    const savePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(savePath, buffer);

    return NextResponse.json({ url: `/img/${carpeta}/${filename}` });
  } catch (err: any) {
    console.error("Error subiendo imagen:", err?.message ?? err);
    return NextResponse.json(
      { error: `Error interno al subir la imagen: ${err?.message ?? "desconocido"}` },
      { status: 500 }
    );
  }
}
