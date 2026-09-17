import jwt from "jsonwebtoken";

/**
 * Identifica al cliente que hace la petición a partir de su token.
 *
 * Es la contrapartida de `getAdminFromRequest` (src/lib/adminAuth.ts) para la tienda. Hasta ahora
 * cada ruta de cliente copiaba su propia versión de este código; se saca aquí para que las rutas
 * que protegen datos personales compartan una sola forma de comprobarlo.
 *
 * El cliente manda el token en `Authorization: Bearer ...` (ver src/utils/fetchWithAuth.ts), a
 * diferencia del admin, que lo lleva en una cookie httpOnly. El secreto es el mismo con el que lo
 * firma POST /api/auth/login, con las mismas alternativas que ya usaban las rutas de /api/clientes.
 */
export function getClienteFromRequest(req: Request): { clienteId: number; email: string | null } | null {
  const secreto = process.env.SECRETO_JWT_CLIENTE || process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
  // Sin secreto no hay forma segura de verificar nada: mejor rechazar que aceptar cualquier token.
  if (!secreto) return null;

  const cabecera = req.headers.get("authorization");
  if (!cabecera?.startsWith("Bearer ")) return null;

  // fetchWithAuth limpia comillas que a veces se cuelan al guardar el token; se replica aquí
  // para no rechazar tokens válidos que llegan envueltos en ellas.
  const token = cabecera.slice("Bearer ".length).replace(/['"]+/g, "").trim();
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, secreto) as { id?: number | string; email?: string };
    const clienteId = Number(decoded.id);
    if (!Number.isInteger(clienteId) || clienteId <= 0) return null;
    return { clienteId, email: decoded.email ?? null };
  } catch {
    return null;
  }
}
