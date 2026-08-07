import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SPANISH_FISCAL_DOCUMENT_ERROR,
  isValidSpanishFiscalDocument,
  normalizeClientNif,
} from "@/lib/clientNif";
import { EMAIL_REGEX } from "@/lib/guestCheckout";

export const dynamic = "force-dynamic";

const OBLIGATORIOS: { campo: string; etiqueta: string }[] = [
  { campo: "nombre", etiqueta: "El nombre" },
  { campo: "apellidos", etiqueta: "Los apellidos" },
  { campo: "email", etiqueta: "El email" },
  { campo: "telefono", etiqueta: "El teléfono" },
  { campo: "direccion", etiqueta: "La dirección" },
  { campo: "codigoPostal", etiqueta: "El código postal" },
  { campo: "ciudad", etiqueta: "La ciudad" },
  { campo: "provincia", etiqueta: "La provincia" },
  { campo: "pais", etiqueta: "El país" },
];

/**
 * Valida los datos de un checkout como invitado antes de dejarle avanzar.
 * No crea nada en base de datos: el cliente invitado se crea al confirmar
 * el pedido (POST /api/pedidos).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    for (const { campo, etiqueta } of OBLIGATORIOS) {
      if (!String(body?.[campo] ?? "").trim()) {
        return NextResponse.json({ ok: false, error: `${etiqueta} es obligatorio` }, { status: 400 });
      }
    }

    const email = String(body.email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ ok: false, error: "El email no es válido" }, { status: 400 });
    }

    const nif = normalizeClientNif(body.nif);
    if (!nif) {
      return NextResponse.json({ ok: false, error: "El NIF/CIF es obligatorio" }, { status: 400 });
    }
    if (!isValidSpanishFiscalDocument(nif)) {
      return NextResponse.json({ ok: false, error: SPANISH_FISCAL_DOCUMENT_ERROR }, { status: 400 });
    }

    // Si el email ya pertenece a una cuenta real, pedimos login en lugar de
    // dejar que un invitado cuelgue pedidos de una cuenta ajena.
    const existente = await prisma.cliente.findUnique({
      where: { email },
      select: { id: true, esInvitado: true },
    });

    if (existente && !existente.esInvitado) {
      return NextResponse.json(
        {
          ok: false,
          cuentaExistente: true,
          error: "Ya existe una cuenta con este email. Inicia sesión para completar tu compra.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, email, nif });
  } catch (error: any) {
    console.error("❌ Error validando checkout invitado:", error?.message);
    return NextResponse.json({ ok: false, error: "No se pudieron validar los datos" }, { status: 500 });
  }
}
