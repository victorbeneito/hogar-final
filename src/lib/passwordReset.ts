import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Recuperación de contraseña de clientes.
 *
 * Existe porque la importación de Prestashop no pudo conservar todas las
 * contraseñas: los clientes con hash bcrypt (`$2y$`, PS 1.7) siguen entrando con
 * la suya, pero los que tenían el md5 legacy de PS 1.6 se importaron como
 * bcrypt(md5) y su contraseña original ya no valida nunca. Sin este flujo esos
 * clientes se quedaban fuera de su cuenta y sin forma de comprar.
 *
 * Reglas de seguridad que se aplican aquí, en un solo sitio:
 *  - En la base de datos solo se guarda el SHA256 del token.
 *  - Un token vale una vez y caduca a los 60 minutos.
 *  - Pedir un enlace nuevo invalida los anteriores del mismo cliente.
 */

/** Minutos que el enlace sigue siendo válido desde que se envía. */
export const MINUTOS_VALIDEZ_RESET = 60;

/** Solicitudes permitidas por cliente dentro de la ventana de control. */
const MAX_SOLICITUDES = 3;
const VENTANA_SOLICITUDES_MINUTOS = 15;

/** Longitud mínima de la contraseña nueva (la misma que exige el registro). */
export const MIN_LONGITUD_PASSWORD = 6;

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Normaliza el email tal y como lo hace el login, para que ambos busquen igual. */
export function normalizarEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}

/**
 * Crea un token nuevo e invalida los pendientes del cliente.
 * Devuelve el token en claro: es la única vez que existe fuera del correo.
 */
export async function crearTokenReset(clienteId: number, ip?: string | null) {
  const ahora = new Date();

  // Los pendientes se marcan como usados en lugar de borrarse, así queda
  // rastro de cuántos enlaces se pidieron si hubiera que auditar un abuso.
  await prisma.password_reset.updateMany({
    where: { clienteId, usadoEn: null },
    data: { usadoEn: ahora },
  });

  const token = crypto.randomBytes(32).toString("base64url");
  const expiraEn = new Date(ahora.getTime() + MINUTOS_VALIDEZ_RESET * 60 * 1000);

  await prisma.password_reset.create({
    data: {
      clienteId,
      tokenHash: hashToken(token),
      expiraEn,
      ip: ip ? ip.slice(0, 64) : null,
    },
  });

  return { token, expiraEn };
}

/**
 * Freno para no convertir el formulario en una máquina de mandar correos
 * a un tercero. Cuenta las solicitudes recientes de ese cliente.
 */
export async function demasiadasSolicitudes(clienteId: number) {
  const desde = new Date(Date.now() - VENTANA_SOLICITUDES_MINUTOS * 60 * 1000);
  const recientes = await prisma.password_reset.count({
    where: { clienteId, createdAt: { gte: desde } },
  });
  return recientes >= MAX_SOLICITUDES;
}

export type ResetValido = {
  resetId: number;
  clienteId: number;
};

/**
 * Comprueba un token recibido del navegador. Devuelve `null` si no existe,
 * si ya se usó o si ha caducado: los tres casos se tratan igual de cara al
 * usuario para no dar pistas sobre qué enlaces existen.
 */
export async function validarTokenReset(token: unknown): Promise<ResetValido | null> {
  const valor = String(token ?? "").trim();
  if (!valor) return null;

  const registro = await prisma.password_reset.findUnique({
    where: { tokenHash: hashToken(valor) },
    select: { id: true, clienteId: true, expiraEn: true, usadoEn: true },
  });

  if (!registro) return null;
  if (registro.usadoEn) return null;
  if (registro.expiraEn.getTime() <= Date.now()) return null;

  return { resetId: registro.id, clienteId: registro.clienteId };
}

/** Oculta el email para poder confirmar la cuenta sin exponerla entera. */
export function ofuscarEmail(email: string): string {
  const [usuario, dominio] = email.split("@");
  if (!dominio) return "";
  const visible = usuario.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(usuario.length - 2, 1))}@${dominio}`;
}
