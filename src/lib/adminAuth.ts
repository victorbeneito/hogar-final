import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

type AdminTokenPayload = {
  id?: number | string;
  email?: string;
  rol?: string;
  role?: string;
};

export const ROLES_ADMIN_VALIDOS = ["admin", "superadmin", "auditor"];

export function getAdminSecret() {
  return process.env.SECRETO_JWT_ADMIN || "palabra_secreta_emergencia_2026";
}

export function getAdminFromRequest(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value || req.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getAdminSecret()) as AdminTokenPayload;
    const adminId = Number(decoded.id);
    const role = String(decoded.rol ?? decoded.role ?? "").toLowerCase();

    if (!Number.isInteger(adminId) || !ROLES_ADMIN_VALIDOS.includes(role)) return null;
    return { adminId, email: decoded.email ?? null, role };
  } catch {
    return null;
  }
}

export function isSuperAdmin(req: NextRequest): boolean {
  const admin = getAdminFromRequest(req);
  return admin?.role === "superadmin";
}

export function canEdit(req: NextRequest): boolean {
  const admin = getAdminFromRequest(req);
  return admin?.role === "superadmin" || admin?.role === "admin";
}
