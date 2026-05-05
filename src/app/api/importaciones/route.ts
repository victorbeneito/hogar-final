import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { buildFallbackNif, isPlausibleClientNif, normalizeClientNif } from "@/lib/clientNif";
import { resolveAtributoTipo } from "@/lib/atributoTipo";

export const dynamic = "force-dynamic";

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

type ImportRow = Record<string, any>;
type ImportErrorItem = {
  row: number;
  error: string;
  data: ImportRow;
  sourceRow: ImportRow;
};

type ImportAction = "upsert" | "delete";

function normalizeText(value: any) {
  return String(value ?? "").trim();
}

function parseBool(value: any, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "si", "sí", "s", "yes", "y", "activo"].includes(normalized);
}

function parseNumber(value: any, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = Number(String(value).replace(",", "."));
  return Number.isFinite(normalized) ? normalized : fallback;
}

function splitList(value: any) {
  return String(value ?? "")
    .split(/[|;\n,]/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getCombinationTokens(row: ImportRow) {
  const explicit = splitList(row.atributos || row.attributeValues || row.atributoValores);
  if (explicit.length) return explicit;

  return [row.color, row.tamano, row.tirador]
    .map((value) => normalizeText(value))
    .filter(Boolean);
}

function toSlug(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getUniqueProductSlug(base: string, productId?: number) {
  const cleanBase = toSlug(base) || `producto-${Date.now()}`;
  let candidate = cleanBase;
  let counter = 0;

  while (true) {
    const existing = await prisma.producto.findFirst({
      where: productId
        ? { slug: candidate, NOT: { id: productId } }
        : { slug: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;

    counter += 1;
    candidate = `${cleanBase}-${counter}`;
  }
}

function sanitizeRowForReport(row: ImportRow) {
  const sanitized = { ...row };
  delete sanitized.password;
  delete sanitized.passwordHash;
  delete sanitized.hashedPassword;
  return sanitized;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeAction(value: any): ImportAction {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === "delete" ? "delete" : "upsert";
}

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

async function validateImportRow(tipo: ImportType, row: ImportRow, accion: ImportAction) {
  const errors: string[] = [];

  if (tipo === "categorias") {
    const nombre = normalizeText(row.nombre);
    if (!nombre) errors.push("Falta nombre de categoría");
    if (row.parentNombre) {
      const parent = await prisma.categoria.findFirst({ where: { nombre: normalizeText(row.parentNombre) } });
      if (!parent) errors.push(`No existe la categoría padre: ${normalizeText(row.parentNombre)}`);
    }
  }

  if (tipo === "marcas") {
    if (!normalizeText(row.nombre)) errors.push("Falta nombre de marca");
  }

  if (tipo === "proveedores") {
    const nombre = normalizeText(row.nombre);
    if (!nombre) errors.push("Falta nombre de proveedor");
    if (row.marca) {
      const marca = await prisma.marca.findFirst({ where: { nombre: normalizeText(row.marca) } });
      if (!marca) errors.push(`No existe la marca: ${normalizeText(row.marca)}`);
    }
  }

  if (tipo === "atributos") {
    if (!normalizeText(row.nombre)) errors.push("Falta nombre de atributo");
  }

  if (tipo === "atributovalores") {
    const valor = normalizeText(row.valor);
    if (!valor) errors.push("Falta valor de atributo");

    let atributo = null as null | { id: number };
    if (row.atributoId !== undefined && row.atributoId !== "") {
      const atributoId = Number(row.atributoId);
      if (!Number.isInteger(atributoId)) {
        errors.push(`atributoId inválido: ${row.atributoId}`);
      } else {
        atributo = await prisma.atributo.findUnique({ where: { id: atributoId } });
        if (!atributo) errors.push(`No existe el atributo con id ${atributoId}`);
      }
    } else if (row.atributo) {
      atributo = await prisma.atributo.findFirst({ where: { nombre: normalizeText(row.atributo) } });
      if (!atributo) errors.push(`No existe el atributo: ${normalizeText(row.atributo)}`);
    } else {
      errors.push("Debes indicar atributo o atributoId");
    }

    if (accion === "delete") {
      if (!atributo) {
        errors.push("No existe el atributo indicado");
      } else {
        const existente = await prisma.atributovalor.findFirst({
          where: { atributoId: atributo.id, valor },
        });
        if (!existente) errors.push(`No existe el valor de atributo: ${valor}`);
      }
      return errors;
    }
  }

  if (tipo === "clientes") {
    const email = normalizeText(row.email);
    if (!email) errors.push("Falta email de cliente");
    else if (!isEmail(email)) errors.push(`Email inválido: ${email}`);

    if (accion === "delete") {
      const cliente = email
        ? await prisma.cliente.findUnique({
            where: { email },
            select: { id: true },
          })
        : null;
      if (!cliente) errors.push(`No existe el cliente con email ${email}`);
      return errors;
    }

    const nombre = normalizeText(row.nombre);
    const apellidos = normalizeText(row.apellidos);
    if (!nombre) errors.push("Falta nombre de cliente");
    if (!apellidos) errors.push("Faltan apellidos de cliente");
  }

  if (tipo === "direcciones") {
    const alias = normalizeText(row.alias);
    let clienteExists = false;
    let clienteId: number | null = null;
    if (row.clienteId !== undefined && row.clienteId !== "") {
      const parsedClienteId = Number(row.clienteId);
      if (!Number.isInteger(parsedClienteId)) {
        errors.push(`clienteId inválido: ${row.clienteId}`);
      } else {
        clienteExists = Boolean(await prisma.cliente.findUnique({ where: { id: parsedClienteId }, select: { id: true } }));
        clienteId = parsedClienteId;
        if (!clienteExists) errors.push(`No existe el cliente con id ${parsedClienteId}`);
      }
    } else if (row.clienteEmail) {
      const cliente = await prisma.cliente.findUnique({
        where: { email: normalizeText(row.clienteEmail) },
        select: { id: true },
      });
      clienteExists = Boolean(cliente);
      clienteId = cliente?.id ?? null;
      if (!clienteExists) errors.push(`No existe el cliente con email ${normalizeText(row.clienteEmail)}`);
    } else {
      errors.push("Debes indicar clienteId o clienteEmail");
    }

    if (accion === "delete") {
      if (!alias) errors.push("Falta alias de dirección");
      if (clienteExists && alias) {
        const existente = await prisma.direccion.findFirst({
          where: {
            clienteId: clienteId ?? undefined,
            alias,
            ...(row.direccion ? { direccion: normalizeText(row.direccion) } : {}),
          },
        });
        if (!existente) errors.push(`No existe la dirección ${alias}`);
      }
      return errors;
    }

    const nombre = normalizeText(row.nombre);
    const apellidos = normalizeText(row.apellidos);
    const direccion = normalizeText(row.direccion);
    if (!alias) errors.push("Falta alias de dirección");
    if (!nombre) errors.push("Falta nombre de dirección");
    if (!apellidos) errors.push("Faltan apellidos de dirección");
    if (!direccion) errors.push("Falta dirección");
  }

  if (tipo === "productos") {
    const referencia = normalizeText(row.referencia);
    if (!referencia) errors.push("Falta referencia de producto");

    const producto = referencia
      ? await prisma.producto.findFirst({ where: { referencia }, select: { id: true } })
      : null;

    if (accion === "delete") {
      if (!producto) errors.push(`No existe el producto: ${referencia}`);
      return errors;
    }

    const nombre = normalizeText(row.nombre);
    if (!nombre) errors.push("Falta nombre de producto");

    if (row.marca) {
      const marca = await prisma.marca.findFirst({ where: { nombre: normalizeText(row.marca) } });
      if (!marca) errors.push(`No existe la marca: ${normalizeText(row.marca)}`);
    }

    const categorias = splitList(row.categorias || row.categoria || row.category);
    for (const categoriaNombre of categorias) {
      const categoria = await prisma.categoria.findFirst({ where: { nombre: categoriaNombre } });
      if (!categoria) errors.push(`No existe la categoría: ${categoriaNombre}`);
    }
  }

  if (tipo === "combinaciones") {
    const productKey = normalizeText(row.productoReferencia);
    if (!productKey) {
      errors.push("Falta productoReferencia");
    } else {
      const producto = await prisma.producto.findFirst({
        where: { referencia: productKey },
      });
      if (!producto) errors.push(`No existe el producto: ${productKey}`);
    }

    if (accion === "delete") {
      const referencia = normalizeText(row.referencia);
      if (!referencia) {
        errors.push("Falta referencia");
      } else if (!productKey) {
        errors.push("Falta productoReferencia");
      } else {
        const producto = await prisma.producto.findFirst({ where: { referencia: productKey }, select: { id: true } });
        const variante = producto
          ? await prisma.variante.findFirst({ where: { productoId: producto.id, referencia } })
          : null;
        if (!variante) errors.push(`No existe la combinación: ${productKey} / ${referencia}`);
      }
      return errors;
    }

    const atributos = getCombinationTokens(row);
    for (const token of atributos) {
      const atributoValorId = Number(token);
      if (Number.isInteger(atributoValorId)) {
        const valor = await prisma.atributovalor.findUnique({ where: { id: atributoValorId } });
        if (!valor) errors.push(`No existe el valor de atributo con id ${atributoValorId}`);
        continue;
      }

      const encontrado = await prisma.atributovalor.findFirst({ where: { valor: token } });
      if (!encontrado) errors.push(`No existe el valor de atributo: ${token}`);
    }
  }

  return errors;
}

async function upsertCategoria(row: ImportRow) {
  const nombre = normalizeText(row.nombre);
  if (!nombre) throw new Error("Falta nombre de categoría");

  let slug = normalizeText(row.slug) || toSlug(nombre);
  const existing = await prisma.categoria.findFirst({ where: { OR: [{ nombre }, { slug }] } });
  if (!existing && slug) {
    const sameSlug = await prisma.categoria.findUnique({ where: { slug } });
    if (sameSlug) slug = `${slug}-${Date.now()}`;
  }

  const parentId = row.parentId !== undefined && row.parentId !== "" ? Number(row.parentId) : null;
  if (row.parentNombre) {
    const parent = await prisma.categoria.findFirst({ where: { nombre: normalizeText(row.parentNombre) } });
    if (!parent) throw new Error(`No existe la categoría padre: ${row.parentNombre}`);
    return prisma.categoria.upsert({
      where: { nombre },
      update: {
        slug,
        descripcion: row.descripcion ?? null,
        imagen: row.imagen ?? null,
        activa: row.activa !== undefined ? parseBool(row.activa, true) : true,
        orden: parseNumber(row.orden, 0),
        parentId: parent.id,
      },
      create: {
        nombre,
        slug,
        descripcion: row.descripcion ?? null,
        imagen: row.imagen ?? null,
        activa: row.activa !== undefined ? parseBool(row.activa, true) : true,
        orden: parseNumber(row.orden, 0),
        parentId: parent.id,
      },
    });
  }

  return prisma.categoria.upsert({
    where: { nombre },
    update: {
      slug,
      descripcion: row.descripcion ?? null,
      imagen: row.imagen ?? null,
      activa: row.activa !== undefined ? parseBool(row.activa, true) : true,
      orden: parseNumber(row.orden, 0),
      parentId,
    },
    create: {
      nombre,
      slug,
      descripcion: row.descripcion ?? null,
      imagen: row.imagen ?? null,
      activa: row.activa !== undefined ? parseBool(row.activa, true) : true,
      orden: parseNumber(row.orden, 0),
      parentId,
    },
  });
}

async function deleteCategoria(row: ImportRow) {
  const nombre = normalizeText(row.nombre);
  if (!nombre) throw new Error("Falta nombre de categoría");

  const categoria = await prisma.categoria.findFirst({
    where: {
      OR: [{ nombre }, ...(row.slug ? [{ slug: normalizeText(row.slug) }] : [])],
    },
    select: { id: true },
  });

  if (!categoria) throw new Error(`No existe la categoría: ${nombre}`);

  await prisma.categoria.delete({ where: { id: categoria.id } });
}

async function upsertMarca(row: ImportRow) {
  const nombre = normalizeText(row.nombre);
  if (!nombre) throw new Error("Falta nombre de marca");
  return prisma.marca.upsert({
    where: { nombre },
    update: {
      descripcion: row.descripcion ?? null,
      imagen: row.imagen ?? row.logo_url ?? null,
      logo_url: row.logo_url ?? row.imagen ?? null,
    },
    create: {
      nombre,
      descripcion: row.descripcion ?? null,
      imagen: row.imagen ?? row.logo_url ?? null,
      logo_url: row.logo_url ?? row.imagen ?? null,
    },
  });
}

async function deleteMarca(row: ImportRow) {
  const nombre = normalizeText(row.nombre);
  if (!nombre) throw new Error("Falta nombre de marca");

  const marca = await prisma.marca.findUnique({ where: { nombre }, select: { id: true } });
  if (!marca) throw new Error(`No existe la marca: ${nombre}`);

  await prisma.marca.delete({ where: { id: marca.id } });
}

async function upsertProveedor(row: ImportRow) {
  const nombre = normalizeText(row.nombre);
  if (!nombre) throw new Error("Falta nombre de proveedor");
  const marca = row.marca ? await prisma.marca.findFirst({ where: { nombre: normalizeText(row.marca) } }) : null;

  return prisma.proveedor.upsert({
    where: { nombre },
    update: {
      descripcion: row.descripcion ?? null,
      imagen: row.imagen ?? null,
      contacto: row.contacto ?? null,
      email: row.email ?? null,
      telefono: row.telefono ?? null,
      direccion: row.direccion ?? null,
      nif: row.nif ?? null,
      activo: row.activo !== undefined ? parseBool(row.activo, true) : true,
      marcaId: marca?.id ?? null,
      updatedAt: new Date(),
    },
    create: {
      nombre,
      descripcion: row.descripcion ?? null,
      imagen: row.imagen ?? null,
      contacto: row.contacto ?? null,
      email: row.email ?? null,
      telefono: row.telefono ?? null,
      direccion: row.direccion ?? null,
      nif: row.nif ?? null,
      activo: row.activo !== undefined ? parseBool(row.activo, true) : true,
      marcaId: marca?.id ?? null,
      updatedAt: new Date(),
    },
  });
}

async function deleteProveedor(row: ImportRow) {
  const nombre = normalizeText(row.nombre);
  if (!nombre) throw new Error("Falta nombre de proveedor");

  const proveedor = await prisma.proveedor.findUnique({ where: { nombre }, select: { id: true } });
  if (!proveedor) throw new Error(`No existe el proveedor: ${nombre}`);

  await prisma.proveedor.delete({ where: { id: proveedor.id } });
}

async function upsertAtributo(row: ImportRow) {
  const nombre = normalizeText(row.nombre);
  if (!nombre) throw new Error("Falta nombre de atributo");
  const tipo = resolveAtributoTipo({
    tipo: row.tipo,
    groupType: row.group_type ?? row.groupType,
    isColorGroup: row.is_color_group ?? row.isColorGroup,
  });
  return prisma.atributo.upsert({
    where: { nombre },
    update: { tipo, orden: parseNumber(row.orden, 0) },
    create: { nombre, tipo, orden: parseNumber(row.orden, 0) },
  });
}

async function deleteAtributo(row: ImportRow) {
  const nombre = normalizeText(row.nombre);
  if (!nombre) throw new Error("Falta nombre de atributo");

  const atributo = await prisma.atributo.findUnique({ where: { nombre }, select: { id: true } });
  if (!atributo) throw new Error(`No existe el atributo: ${nombre}`);

  await prisma.atributo.delete({ where: { id: atributo.id } });
}

async function upsertAtributoValor(row: ImportRow) {
  const valor = normalizeText(row.valor);
  if (!valor) throw new Error("Falta valor de atributo");

  let atributo = null as null | { id: number };
  if (row.atributoId !== undefined && row.atributoId !== "") {
    atributo = await prisma.atributo.findUnique({ where: { id: Number(row.atributoId) } });
  } else if (row.atributo) {
    atributo = await prisma.atributo.findFirst({ where: { nombre: normalizeText(row.atributo) } });
  }

  if (!atributo) throw new Error(`No existe el atributo para el valor: ${valor}`);

  const existing = await prisma.atributovalor.findFirst({
    where: { atributoId: atributo.id, valor },
  });

  const data = {
    atributoId: atributo.id,
    valor,
    colorHex: row.colorHex ?? row.color ?? null,
    imagen: row.imagen ?? null,
    orden: parseNumber(row.orden, 0),
  };

  if (existing) {
    return prisma.atributovalor.update({ where: { id: existing.id }, data });
  }

  return prisma.atributovalor.create({ data });
}

async function deleteAtributoValor(row: ImportRow) {
  const valor = normalizeText(row.valor);
  if (!valor) throw new Error("Falta valor de atributo");

  let atributoId: number | null = null;
  if (row.atributoId !== undefined && row.atributoId !== "") {
    const parsed = Number(row.atributoId);
    if (Number.isInteger(parsed)) {
      atributoId = parsed;
    }
  } else if (row.atributo) {
    const atributo = await prisma.atributo.findFirst({ where: { nombre: normalizeText(row.atributo) }, select: { id: true } });
    atributoId = atributo?.id ?? null;
  }

  if (!atributoId) throw new Error("Debes indicar atributo o atributoId");

  const existente = await prisma.atributovalor.findFirst({
    where: { atributoId, valor },
    select: { id: true },
  });

  if (!existente) throw new Error(`No existe el valor de atributo: ${valor}`);

  await prisma.atributovalor.delete({ where: { id: existente.id } });
}

async function resolveClienteNif(row: ImportRow, nifOwnerCache: Map<string, string>) {
  const email = normalizeText(row.email);
  if (!email) throw new Error("Falta email de cliente");

  const nifCandidate = normalizeClientNif(row.nif);
  if (!isPlausibleClientNif(nifCandidate)) {
    return buildFallbackNif(email);
  }

  const emailKey = email.toLowerCase();
  const cachedOwner = nifOwnerCache.get(nifCandidate);
  if (cachedOwner) {
    return cachedOwner === emailKey ? nifCandidate : buildFallbackNif(email);
  }

  const existingByNif = await prisma.cliente.findUnique({
    where: { nif: nifCandidate },
    select: { email: true },
  });

  const existingEmail = normalizeText(existingByNif?.email).toLowerCase();
  if (existingEmail && existingEmail !== emailKey) {
    nifOwnerCache.set(nifCandidate, existingEmail);
    return buildFallbackNif(email);
  }

  nifOwnerCache.set(nifCandidate, emailKey);
  return nifCandidate;
}

async function upsertCliente(row: ImportRow, nifOwnerCache: Map<string, string>) {
  const email = normalizeText(row.email);
  if (!email) throw new Error("Falta email de cliente");

  const passwordValue = normalizeText(row.password) || "123456";
  const hashedPassword = isBcryptHash(passwordValue) ? passwordValue : await bcrypt.hash(passwordValue, 10);
  const now = new Date();
  const nif = await resolveClienteNif(row, nifOwnerCache);

  const data = {
    nombre: normalizeText(row.nombre),
    apellidos: normalizeText(row.apellidos),
    email,
    password: hashedPassword,
    telefono: normalizeText(row.telefono),
    empresa: row.empresa ? normalizeText(row.empresa) : null,
    nif,
    direccion: normalizeText(row.direccion),
    direccionComplementaria: row.direccionComplementaria ? normalizeText(row.direccionComplementaria) : null,
    codigoPostal: normalizeText(row.codigoPostal),
    ciudad: normalizeText(row.ciudad),
    provincia: normalizeText(row.provincia),
    pais: row.pais ? normalizeText(row.pais) : "España",
    activo: row.activo !== undefined ? parseBool(row.activo, true) : true,
    aceptaMarketing: row.aceptaMarketing !== undefined ? parseBool(row.aceptaMarketing, false) : false,
    role: normalizeText(row.role) || "cliente",
    updatedAt: now,
  };

  const existing = await prisma.cliente.findUnique({
    where: { email },
    select: { id: true },
  });

  const cliente = await prisma.$transaction(async (tx) => {
    const clienteGuardado = existing
      ? await tx.cliente.update({
          where: { email },
          data,
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
        })
      : await tx.cliente.create({
          data,
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

    const direccionPrincipal = normalizeText(row.direccion);
    if (direccionPrincipal) {
      const direccionData = {
        clienteId: clienteGuardado.id,
        alias: "Principal",
        nombre: normalizeText(row.nombre),
        apellidos: normalizeText(row.apellidos),
        empresa: row.empresa ? normalizeText(row.empresa) : null,
        nif,
        telefono: row.telefono ? normalizeText(row.telefono) : null,
        direccion: direccionPrincipal,
        complemento: row.direccionComplementaria ? normalizeText(row.direccionComplementaria) : null,
        codigoPostal: normalizeText(row.codigoPostal),
        ciudad: normalizeText(row.ciudad),
        provincia: normalizeText(row.provincia),
        pais: row.pais ? normalizeText(row.pais) : "España",
        predeterminada: true,
        updatedAt: now,
      };

      const direccionExistente = await tx.direccion.findFirst({
        where: { clienteId: clienteGuardado.id, alias: "Principal" },
        select: { id: true },
      });

      if (direccionExistente) {
        await tx.direccion.update({
          where: { id: direccionExistente.id },
          data: direccionData,
        });
      } else {
        await tx.direccion.create({
          data: {
            ...direccionData,
            createdAt: now,
          },
        });
      }
    }

    return clienteGuardado;
  });

  return cliente;
}

async function deleteCliente(row: ImportRow) {
  const email = normalizeText(row.email);
  if (!email) throw new Error("Falta email de cliente");

  const cliente = await prisma.cliente.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!cliente) throw new Error(`No existe el cliente con email ${email}`);

  await prisma.$transaction(async (tx) => {
    const pedidos = await tx.pedido.findMany({
      where: { clienteId: cliente.id },
      select: { id: true },
    });

    const pedidoIds = pedidos.map((pedido) => pedido.id);
    if (pedidoIds.length > 0) {
      await tx.factura.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
      await tx.pedidoproducto.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
      await tx.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
    }

    await tx.cupon_uso.deleteMany({ where: { clienteId: cliente.id } });
    await tx.precioespecifico.deleteMany({ where: { clienteId: cliente.id } });
    await tx.direccion.deleteMany({ where: { clienteId: cliente.id } });
    await tx.cliente.delete({ where: { id: cliente.id } });
  });
}

async function upsertDireccion(row: ImportRow) {
  const alias = normalizeText(row.alias);
  const nombre = normalizeText(row.nombre);
  const apellidos = normalizeText(row.apellidos);
  const direccion = normalizeText(row.direccion);
  if (!alias || !nombre || !apellidos || !direccion) {
    throw new Error("Faltan campos obligatorios de dirección");
  }

  let clienteId: number | null = null;
  if (row.clienteId !== undefined && row.clienteId !== "") {
    clienteId = Number(row.clienteId);
  } else if (row.clienteEmail) {
    const cliente = await prisma.cliente.findUnique({
      where: { email: normalizeText(row.clienteEmail) },
      select: { id: true },
    });
    clienteId = cliente?.id ?? null;
  }

  if (!clienteId) throw new Error("Debes indicar clienteId o clienteEmail");

  return prisma.direccion.create({
    data: {
      clienteId,
      alias,
      nombre,
      apellidos,
      empresa: row.empresa ? normalizeText(row.empresa) : null,
      nif: row.nif ? normalizeText(row.nif) : null,
      telefono: row.telefono ? normalizeText(row.telefono) : null,
      direccion,
      complemento: row.complemento ? normalizeText(row.complemento) : null,
      codigoPostal: normalizeText(row.codigoPostal),
      ciudad: normalizeText(row.ciudad),
      provincia: normalizeText(row.provincia),
      pais: row.pais ? normalizeText(row.pais) : "España",
      predeterminada: row.predeterminada !== undefined ? parseBool(row.predeterminada, false) : false,
      updatedAt: new Date(),
    },
  });
}

async function deleteDireccion(row: ImportRow) {
  const alias = normalizeText(row.alias);
  if (!alias) throw new Error("Falta alias de dirección");

  let clienteId: number | null = null;
  if (row.clienteId !== undefined && row.clienteId !== "") {
    const parsed = Number(row.clienteId);
    if (Number.isInteger(parsed)) {
      clienteId = parsed;
    }
  } else if (row.clienteEmail) {
    const cliente = await prisma.cliente.findUnique({
      where: { email: normalizeText(row.clienteEmail) },
      select: { id: true },
    });
    clienteId = cliente?.id ?? null;
  }

  if (!clienteId) throw new Error("Debes indicar clienteId o clienteEmail");

  const direccion = await prisma.direccion.findFirst({
    where: {
      clienteId,
      alias,
      ...(row.direccion ? { direccion: normalizeText(row.direccion) } : {}),
    },
    select: { id: true },
  });

  if (!direccion) throw new Error(`No existe la dirección ${alias}`);

  await prisma.direccion.delete({ where: { id: direccion.id } });
}

async function upsertProducto(row: ImportRow) {
  const nombre = normalizeText(row.nombre);
  if (!nombre) throw new Error("Falta nombre de producto");

  const referencia = normalizeText(row.referencia);
  if (!referencia) throw new Error("Falta referencia de producto");
  const productoExistente = await prisma.producto.findFirst({ where: { referencia } });
  const slugActual = productoExistente
    ? await prisma.producto.findUnique({
        where: { id: productoExistente.id },
        select: { slug: true },
      })
    : null;

  const marca = row.marca ? await prisma.marca.findFirst({ where: { nombre: normalizeText(row.marca) } }) : null;
  const reglaImpuestoPorId = row.reglaImpuestoId !== undefined && row.reglaImpuestoId !== ""
    ? await prisma.reglaimpuesto.findUnique({ where: { id: Number(row.reglaImpuestoId) } })
    : null;
  const reglaImpuestoPorNombre = !reglaImpuestoPorId && row.reglaImpuesto
    ? await prisma.reglaimpuesto.findFirst({ where: { nombre: normalizeText(row.reglaImpuesto) } })
    : null;
  const reglaImpuestoDefault = await prisma.reglaimpuesto.findFirst({
    where: {
      OR: [
        { nombre: "IVA GENERAL" },
        { porcentaje: 21 },
      ],
    },
  });
  const reglaImpuesto = reglaImpuestoPorId ?? reglaImpuestoPorNombre ?? reglaImpuestoDefault;
  const descuento = row.descuento !== undefined && row.descuento !== "" ? parseNumber(row.descuento, NaN) : NaN;
  const precioBase = parseNumber(row.precio, 0);
  const precioOfertaDesdeDescuento = Number.isFinite(descuento) && descuento >= 0 && descuento < 100
    ? precioBase * (1 - descuento / 100)
    : null;
  const precioOferta =
    row.precioOferta !== undefined && row.precioOferta !== ""
      ? parseNumber(row.precioOferta, 0)
      : precioOfertaDesdeDescuento;
  const slugBase = normalizeText(row.slug) || slugActual?.slug || referencia || nombre;
  const slug = await getUniqueProductSlug(slugBase, productoExistente?.id);

  const data = {
    nombre,
    referencia,
    slug,
    resumen: row.resumen ?? null,
    descripcion: row.descripcion ?? null,
    descripcion_html: row.descripcion_html ?? null,
    precio: precioBase,
    precioOferta,
    precioCoste: row.precioCoste !== undefined && row.precioCoste !== "" ? parseNumber(row.precioCoste, 0) : null,
    stock: parseNumber(row.stock, 0),
    stockMinimo: parseNumber(row.stockMinimo, 0),
    activo: row.activo !== undefined ? parseBool(row.activo, true) : true,
    destacado: row.destacado !== undefined ? parseBool(row.destacado, false) : false,
    enOferta: row.enOferta !== undefined ? parseBool(row.enOferta, false) : false,
    visibilidad: normalizeText(row.visibilidad) || "tienda",
    disponiblePedidos: row.disponiblePedidos !== undefined ? parseBool(row.disponiblePedidos, true) : true,
    soloWeb: row.soloWeb !== undefined ? parseBool(row.soloWeb, false) : false,
    condicion: normalizeText(row.condicion) || "nuevo",
    mostrarCondicion: row.mostrarCondicion !== undefined ? parseBool(row.mostrarCondicion, false) : false,
    etiquetas: row.etiquetas ?? null,
    ean13: row.ean13 ?? null,
    upc: row.upc ?? null,
    isbn: row.isbn ?? null,
    anchura: row.anchura !== undefined && row.anchura !== "" ? parseNumber(row.anchura, 0) : null,
    altura: row.altura !== undefined && row.altura !== "" ? parseNumber(row.altura, 0) : null,
    profundidad: row.profundidad !== undefined && row.profundidad !== "" ? parseNumber(row.profundidad, 0) : null,
    peso: row.peso !== undefined && row.peso !== "" ? parseNumber(row.peso, 0) : null,
    plazoEntregaStock: row.plazoEntregaStock ?? null,
    plazoEntregaSinStock: row.plazoEntregaSinStock ?? null,
    gastosEnvioExtra: row.gastosEnvioExtra !== undefined && row.gastosEnvioExtra !== "" ? parseNumber(row.gastosEnvioExtra, 0) : 0,
    metaTitulo: row.metaTitulo ?? null,
    metaDescripcion: row.metaDescripcion ?? null,
    marcaId: marca?.id ?? null,
    reglaImpuestoId: reglaImpuesto?.id ?? null,
    updatedAt: new Date(),
  };

  let producto;
  if (productoExistente) {
    producto = await prisma.producto.update({ where: { id: productoExistente.id }, data });
  } else {
    producto = await prisma.producto.create({ data: { ...data, createdAt: new Date() } });
  }

  const categorias = splitList(row.categorias || row.categoria || row.category);
  if (categorias.length) {
    await prisma.productocategoria.deleteMany({ where: { productoId: producto.id } });
    for (let index = 0; index < categorias.length; index += 1) {
      const categoriaNombre = categorias[index];
      const categoria = await prisma.categoria.findFirst({ where: { nombre: categoriaNombre } });
      if (!categoria) continue;
      await prisma.productocategoria.create({
        data: { productoId: producto.id, categoriaId: categoria.id, esPrincipal: index === 0 },
      });
    }
  }

  const imagenes = splitList(row.imagenes || row.imagen || row.urlsImagenes);
  if (imagenes.length) {
    await prisma.productoimagen.deleteMany({ where: { productoId: producto.id } });
    for (let index = 0; index < imagenes.length; index += 1) {
      await prisma.productoimagen.create({
        data: {
          productoId: producto.id,
          url: imagenes[index],
          orden: index,
          esPortada: index === 0,
        },
      });
    }
  }

  return producto;
}

async function deleteProducto(row: ImportRow) {
  const referencia = normalizeText(row.referencia);
  if (!referencia) throw new Error("Falta referencia de producto");

  const producto = await prisma.producto.findFirst({ where: { referencia } });
  if (!producto) throw new Error(`No existe el producto: ${referencia}`);

  await prisma.producto.delete({ where: { id: producto.id } });
}

async function upsertCombinacion(row: ImportRow) {
  const productKey = normalizeText(row.productoReferencia);
  if (!productKey) throw new Error("Falta productoReferencia");

  const producto = await prisma.producto.findFirst({
    where: {
      referencia: productKey,
    },
  });

  if (!producto) throw new Error(`No existe el producto: ${productKey}`);

  const referencia = normalizeText(row.referencia) || null;
  const existing = referencia
    ? await prisma.variante.findFirst({ where: { productoId: producto.id, referencia } })
    : null;

  const varianteData = {
    productoId: producto.id,
    referencia,
    stock: parseNumber(row.stock, 0),
    imagen: row.imagen ? normalizeText(row.imagen) : null,
    color: row.color ? normalizeText(row.color) : null,
    imagenMuestra: row.imagenMuestra ? normalizeText(row.imagenMuestra) : null,
    imagenesVariante: row.imagenesVariante ? normalizeText(row.imagenesVariante) : null,
    precio_extra: row.precio_extra !== undefined && row.precio_extra !== "" ? parseNumber(row.precio_extra, 0) : 0,
    tamano: row.tamano ? normalizeText(row.tamano) : null,
    tirador: row.tirador ? normalizeText(row.tirador) : null,
  };

  const variante = existing
    ? await prisma.variante.update({ where: { id: existing.id }, data: varianteData })
    : await prisma.variante.create({ data: varianteData });

  const atributos = getCombinationTokens(row);
  if (atributos.length) {
    await prisma.varianteatributo.deleteMany({ where: { varianteId: variante.id } });
    for (const token of atributos) {
      const atributoValorId = Number(token);
      if (Number.isInteger(atributoValorId)) {
        await prisma.varianteatributo.create({ data: { varianteId: variante.id, atributoValorId } });
        continue;
      }

      const encontrado = await prisma.atributovalor.findFirst({ where: { valor: token } });
      if (encontrado) {
        await prisma.varianteatributo.create({ data: { varianteId: variante.id, atributoValorId: encontrado.id } });
      }
    }
  }

  return variante;
}

async function deleteCombinacion(row: ImportRow) {
  const productKey = normalizeText(row.productoReferencia);
  const referencia = normalizeText(row.referencia);
  if (!productKey) throw new Error("Falta productoReferencia");
  if (!referencia) throw new Error("Falta referencia");

  const producto = await prisma.producto.findFirst({
    where: { referencia: productKey },
    select: { id: true },
  });

  if (!producto) throw new Error(`No existe el producto: ${productKey}`);

  const variante = await prisma.variante.findFirst({
    where: { productoId: producto.id, referencia },
    select: { id: true },
  });

  if (!variante) throw new Error(`No existe la combinación: ${productKey} / ${referencia}`);

  await prisma.variante.delete({ where: { id: variante.id } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tipo = String(body.tipo ?? "").trim() as ImportType;
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const sourceRows = Array.isArray(body.sourceRows) ? body.sourceRows : [];

    if (!tipo) return NextResponse.json({ ok: false, error: "Falta el tipo de importación" }, { status: 400 });
    if (!rows.length) return NextResponse.json({ ok: false, error: "No hay filas para importar" }, { status: 400 });

    const errors: ImportErrorItem[] = [];
    let created = 0;
    let updated = 0;
    let deleted = 0;
    const clienteNifCache = new Map<string, string>();

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] as ImportRow;
      const sourceRow = (sourceRows[i] as ImportRow | undefined) ?? row;
      const accion = normalizeAction(row.accion);

      try {
        const validationErrors = await validateImportRow(tipo, row, accion);
        if (validationErrors.length > 0) {
          errors.push({ row: i + 1, error: validationErrors.join(" · "), data: sanitizeRowForReport(row), sourceRow: sanitizeRowForReport(sourceRow) });
          continue;
        }

        if (tipo === "productos") {
          if (accion === "delete") {
            await deleteProducto(row);
            deleted += 1;
          } else {
            const existing = await prisma.producto.findFirst({ where: { referencia: normalizeText(row.referencia) }, select: { id: true } });
            await upsertProducto(row);
            if (existing) updated += 1;
            else created += 1;
          }
        } else if (tipo === "combinaciones") {
          if (accion === "delete") {
            await deleteCombinacion(row);
            deleted += 1;
          } else {
            const productKey = normalizeText(row.productoReferencia);
            const referencia = normalizeText(row.referencia);
            const producto = await prisma.producto.findFirst({ where: { referencia: productKey }, select: { id: true } });
            const existing = producto && referencia
              ? await prisma.variante.findFirst({ where: { productoId: producto.id, referencia }, select: { id: true } })
              : null;
            await upsertCombinacion(row);
            if (existing) updated += 1;
            else created += 1;
          }
        } else {
          if (accion === "delete") {
            if (tipo === "categorias") await deleteCategoria(row);
            else if (tipo === "marcas") await deleteMarca(row);
            else if (tipo === "proveedores") await deleteProveedor(row);
            else if (tipo === "atributos") await deleteAtributo(row);
            else if (tipo === "atributovalores") await deleteAtributoValor(row);
            else if (tipo === "clientes") await deleteCliente(row);
            else if (tipo === "direcciones") await deleteDireccion(row);
            else throw new Error(`Tipo no soportado: ${tipo}`);

            deleted += 1;
          } else {
            if (tipo === "categorias") await upsertCategoria(row);
            else if (tipo === "marcas") await upsertMarca(row);
            else if (tipo === "proveedores") await upsertProveedor(row);
            else if (tipo === "atributos") await upsertAtributo(row);
            else if (tipo === "atributovalores") await upsertAtributoValor(row);
            else if (tipo === "clientes") await upsertCliente(row, clienteNifCache);
            else if (tipo === "direcciones") await upsertDireccion(row);
            else throw new Error(`Tipo no soportado: ${tipo}`);

            created += 1;
          }
        }
      } catch (error: any) {
        errors.push({ row: i + 1, error: error.message, data: sanitizeRowForReport(row), sourceRow: sanitizeRowForReport(sourceRow) });
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      imported: created + updated + deleted,
      updated,
      deleted,
      failed: errors.length,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
