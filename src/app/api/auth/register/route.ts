import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { normalizeClientNif } from "@/lib/clientNif";
import { sendTemplateEmail } from "@/lib/emailService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, apellidos, email, password, telefono, empresa, direccion, ciudad, cp, codigoPostal, provincia, pais } = body;

    // 1. Validar campos
    if (!email || !password || !nombre) {
      return NextResponse.json(
        { ok: false, message: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // 2. Verificar duplicados
    const usuarioExistente = await prisma.cliente.findUnique({
      where: { email },
      select: { id: true, esInvitado: true },
    });

    // Si ese email sólo se usó para comprar como invitado, la ficha se convierte
    // en cuenta real y conserva el historial de pedidos.
    if (usuarioExistente && !usuarioExistente.esInvitado) {
      return NextResponse.json(
        { ok: false, message: "El correo ya está registrado" },
        { status: 400 }
      );
    }

    // 3. Crear usuario (o convertir el invitado existente)
    const hashedPassword = await bcrypt.hash(password, 10);
    const cpFinal = codigoPostal || cp || "";
    const nifInput = body?.nif ?? body?.nifCliente ?? body?.documento;
    const nifFinal = normalizeClientNif(nifInput) || null;

    const datosCliente = {
        nombre,
        apellidos: apellidos || "",
        email,
        password: hashedPassword,
        ...(telefono ? { telefono } : {}),
        ...(empresa ? { empresa } : {}),
        ...(nifFinal ? { nif: nifFinal } : {}),
        ...(direccion ? { direccion } : {}),
        ...(ciudad ? { ciudad } : {}),
        ...(cpFinal ? { codigoPostal: cpFinal } : {}),
        ...(provincia ? { provincia } : {}),
        pais: pais || "España",
        role: "client",
        esInvitado: false,
        updatedAt: new Date(),
    };

    const camposCliente = {
      id: true,
      nombre: true,
      apellidos: true,
      email: true,
      telefono: true,
      empresa: true,
      nif: true,
      direccion: true,
      direccionComplementaria: true,
      codigoPostal: true,
      ciudad: true,
      provincia: true,
      pais: true,
      activo: true,
      aceptaMarketing: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    } as const;

    const nuevoCliente = usuarioExistente
      ? await prisma.cliente.update({
          where: { id: usuarioExistente.id },
          data: datosCliente,
          select: camposCliente,
        })
      : await prisma.cliente.create({
          data: datosCliente,
          select: camposCliente,
        });

    // 4. Email de bienvenida (no bloquea el registro si falla)
    sendTemplateEmail({
      to: nuevoCliente.email,
      templateSlug: "account-created",
      variables: {
        nombre: nuevoCliente.nombre,
        email: nuevoCliente.email,
        loginUrl: `${process.env.APP_URL || "https://www.elhogardetusuenos.com"}/auth`,
      },
    }).catch((err) => console.error("❌ Email bienvenida:", err?.message));

    // 5. 🔥 GENERAR TOKEN CORREGIDO 🔥
    // AHORA USAMOS 'SECRETO_JWT_CLIENTE' IGUAL QUE EN EL LOGIN
    const token = jwt.sign(
      { 
        id: nuevoCliente.id, 
        email: nuevoCliente.email, 
        role: nuevoCliente.role 
      },
      process.env.SECRETO_JWT_CLIENTE!, // 👈 CAMBIO CLAVE AQUÍ
      { expiresIn: "30d" }
    );

    return NextResponse.json(
      {
        ok: true,
        message: "Usuario registrado con éxito",
        user: nuevoCliente,
        cliente: nuevoCliente,
        token: token 
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("❌ Error en Register:", error);
    return NextResponse.json(
      { ok: false, message: "Error interno", error: error.message },
      { status: 500 }
    );
  }
}
