// PEGAR EN: src/app/api/clientes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { SPANISH_FISCAL_DOCUMENT_ERROR, isValidSpanishFiscalDocument, normalizeClientNif } from "@/lib/clientNif";
import { canEdit } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function getToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return authHeader?.split(" ")[1]?.replace(/"/g, "") || null;
}

async function verificarAdmin(req: NextRequest) {
  const token = getToken(req);
  if (!token) return { autorizado: false, status: 401, error: "Token requerido" };

  try {
    const secret = process.env.SECRETO_JWT_ADMIN || "palabra_secreta_emergencia_2026";
    const decodedAdmin: any = jwt.verify(token, secret);
    const rol = String(decodedAdmin?.rol ?? decodedAdmin?.role ?? "").toLowerCase();
    if (["admin", "superadmin", "auditor"].includes(rol)) return { autorizado: true as const };
    return { autorizado: false, status: 403, error: "Acceso denegado" };
  } catch (error: any) {
    return { autorizado: false, status: 403, error: "Token inválido" };
  }
}

export async function GET(req: NextRequest) {
  try {
    const permiso = await verificarAdmin(req);
    if (!permiso.autorizado) {
      return NextResponse.json({ ok: false, error: permiso.error }, { status: permiso.status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const nombre = searchParams.get("nombre")?.trim() || "";
    const contacto = searchParams.get("contacto")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "12") || 12));

    const whereParts: any[] = [];
    if (nombre) {
      whereParts.push({
        OR: [
          { nombre: { contains: nombre } },
          { apellidos: { contains: nombre } },
        ],
      });
    }

    if (contacto) {
      whereParts.push({
        OR: [
          { email: { contains: contacto } },
          { telefono: { contains: contacto } },
          { empresa: { contains: contacto } },
          { nif: { contains: contacto } },
        ],
      });
    }

    if (!nombre && !contacto && search) {
      whereParts.push({
        OR: [
          { nombre: { contains: search } },
          { apellidos: { contains: search } },
          { email: { contains: search } },
          { telefono: { contains: search } },
          { empresa: { contains: search } },
          { nif: { contains: search } },
        ],
      });
    }

    const whereClause = whereParts.length > 0 ? { AND: whereParts } : {};
    const total = await prisma.cliente.count({ where: whereClause });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pageSafe = Math.min(page, totalPages);

    const clientes = await prisma.cliente.findMany({
      where: whereClause,
      orderBy: { id: "desc" },
      skip: (pageSafe - 1) * limit,
      take: limit,
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        telefono: true,
        ciudad: true,
        provincia: true,
        empresa: true,
        nif: true,
        activo: true,
        role: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      ok: true,
      clientes,
      total,
      page: pageSafe,
      limit,
      totalPages,
    });

  } catch (error: any) {
    console.error("❌ Error API Clientes:", error.message);
    return NextResponse.json({ ok: false, error: "Error de servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!canEdit(req)) {
    return NextResponse.json({ ok: false, error: "Sin permiso para crear clientes" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { nombre, apellidos, email, password, telefono, empresa, nif, direccion, direccionComplementaria, codigoPostal, ciudad, provincia, pais } = body;

    if (!nombre || !email || !password) {
      return NextResponse.json({ ok: false, error: "Nombre, email y contraseña son obligatorios" }, { status: 400 });
    }

    const existente = await prisma.cliente.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existente) {
      return NextResponse.json({ ok: false, error: "El email ya está registrado" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const ahora = new Date();
    const nifFinal = normalizeClientNif(nif);

    if (!nifFinal) {
      return NextResponse.json({ ok: false, error: "El NIF/CIF es obligatorio" }, { status: 400 });
    }

    if (!isValidSpanishFiscalDocument(nifFinal)) {
      return NextResponse.json({ ok: false, error: SPANISH_FISCAL_DOCUMENT_ERROR }, { status: 400 });
    }

    const cliente = await prisma.$transaction(async (tx) => {
      const nuevoCliente = await tx.cliente.create({
        data: {
          nombre,
          apellidos: apellidos || "",
          email,
          password: hashedPassword,
          telefono: telefono || "",
          empresa: empresa || null,
          nif: nifFinal,
          direccion: direccion || "",
          direccionComplementaria: direccionComplementaria || null,
          codigoPostal: codigoPostal || "",
          ciudad: ciudad || "",
          provincia: provincia || "",
          pais: pais || "España",
          role: "cliente",
          updatedAt: ahora,
        },
        select: {
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
        },
      });

      if (direccion) {
        await tx.direccion.create({
          data: {
            clienteId: nuevoCliente.id,
            alias: "Principal",
            nombre: nombre,
            apellidos: apellidos || "",
            empresa: empresa || null,
            nif: nifFinal,
            telefono: telefono || null,
            direccion,
            complemento: direccionComplementaria || null,
            codigoPostal: codigoPostal || "",
            ciudad: ciudad || "",
            provincia: provincia || "",
            pais: pais || "España",
            predeterminada: true,
            createdAt: ahora,
            updatedAt: ahora,
          },
        });
      }

      return nuevoCliente;
    });

    const clienteSinPassword = cliente;
    return NextResponse.json({ ok: true, cliente: clienteSinPassword }, { status: 201 });
  } catch (error: any) {
    console.error("❌ Error API Clientes POST:", error.message);
    return NextResponse.json({ ok: false, error: error.message || "Error de servidor" }, { status: 500 });
  }
}

// // GET: Buscar Clientes
// export async function GET(req: NextRequest) {
//   try {
//     // Aquí podrías validar token de admin si quisieras

//     const { searchParams } = new URL(req.url);
//     const search = searchParams.get("search");
//     const emailParam = searchParams.get("email");
//     const idParam = searchParams.get("id");

//     let whereClause: any = {};

//     if (idParam) {
//       whereClause.id = parseInt(idParam);
//     } else if (emailParam) {
//       whereClause.email = emailParam;
//     } else if (search) {
//       whereClause = {
//         OR: [
//           { nombre: { contains: search } }, // En Postgres añadir: mode: 'insensitive'
//           { apellidos: { contains: search } },
//           { email: { contains: search } }
//         ]
//       };
//     }

//     const clientes = await prisma.cliente.findMany({
//       where: whereClause,
//       orderBy: { createdAt: 'desc' }
//     });

//     // Quitamos passwords de la lista
//     const clientesSafe = clientes.map(({ password, ...resto }) => resto);

//     return NextResponse.json({ ok: true, clientes: clientesSafe });
//   } catch (error: any) {
//     return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
//   }
// }

// // POST: Crear Cliente (Registro Simple)
// export async function POST(req: NextRequest) {
//   try {
//     const data = await req.json();

//     // Hashear password
//     const hashedPassword = await bcrypt.hash(data.password, 10);

//     const cliente = await prisma.cliente.create({
//       data: {
//         ...data,
//         password: hashedPassword,
//         role: "cliente"
//       }
//     });

//     const token = jwt.sign(
//       { id: cliente.id, email: cliente.email, role: cliente.role },
//       process.env.SECRETO_JWT_CLIENTE!,
//       { expiresIn: "24h" }
//     );

//     const { password: _, ...clienteSafe } = cliente;

//     return NextResponse.json({ ok: true, cliente: clienteSafe, token }, { status: 201 });
//   } catch (error: any) {
//     // Código de error P2002 es "Unique constraint failed" (Email duplicado)
//     if (error.code === 'P2002') {
//       return NextResponse.json({ ok: false, error: "Email ya registrado" }, { status: 400 });
//     }
//     return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
//   }
// }

// // PUT: Registro completo (Doble password)
// export async function PUT(req: NextRequest) {
//   try {
//     const { nombre, apellidos, email, password, password2, telefono } = await req.json();

//     if (password !== password2) {
//       return NextResponse.json({ ok: false, error: "Las contraseñas no coinciden" }, { status: 400 });
//     }

//     const existe = await prisma.cliente.findUnique({ where: { email } });
//     if (existe) return NextResponse.json({ ok: false, error: "Email ya registrado" }, { status: 400 });

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const cliente = await prisma.cliente.create({
//       data: {
//         nombre,
//         apellidos,
//         email,
//         password: hashedPassword,
//         telefono,
//         role: "cliente"
//       }
//     });

//     const token = jwt.sign(
//       { id: cliente.id, email: cliente.email, role: "cliente" },
//       process.env.SECRETO_JWT_CLIENTE!,
//       { expiresIn: "24h" }
//     );

//     const { password: _, ...clienteSafe } = cliente;

//     return NextResponse.json({ ok: true, cliente: clienteSafe, token }, { status: 201 });
//   } catch (error: any) {
//     return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
//   }
// }

// // PATCH: Login
// export async function PATCH(req: NextRequest) {
//   try {
//     const { email, password } = await req.json();

//     const cliente = await prisma.cliente.findUnique({ where: { email } });

//     if (!cliente || !(await bcrypt.compare(password, cliente.password))) {
//       return NextResponse.json({ ok: false, error: "Credenciales inválidas" }, { status: 400 });
//     }

//     const token = jwt.sign(
//       { id: cliente.id, email: cliente.email, role: cliente.role },
//       process.env.SECRETO_JWT_CLIENTE!,
//       { expiresIn: "24h" }
//     );

//     const { password: _, ...clienteSafe } = cliente;

//     return NextResponse.json({ ok: true, cliente: clienteSafe, token });
//   } catch (error: any) {
//     return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
//   }
// }
