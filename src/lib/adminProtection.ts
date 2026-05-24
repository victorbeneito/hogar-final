import { NextRequest, NextResponse } from "next/server";
import { canEdit } from "./adminAuth";

/**
 * Middleware para proteger endpoints de administración
 * Rechaza cambios (PUT, DELETE, POST) si el usuario no puede editar
 */
export function protectAdminEndpoint(req: NextRequest, method: "GET" | "POST" | "PUT" | "DELETE") {
  // GET siempre permitido (solo lectura)
  if (method === "GET") return true;

  // PUT, DELETE, POST necesitan permiso de edición
  return canEdit(req);
}

export function unauthorized(message: string = "No tienes permiso para realizar esta acción") {
  return NextResponse.json({ error: message, ok: false }, { status: 403 });
}
