import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

function toSlug(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

async function validateImportRow(tipo: ImportType, row: ImportRow) {
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
  }

  if (tipo === "clientes") {
    const nombre = normalizeText(row.nombre);
    const apellidos = normalizeText(row.apellidos);
    const email = normalizeText(row.email);
    if (!nombre) errors.push("Falta nombre de cliente");
    if (!apellidos) errors.push("Faltan apellidos de cliente");
    if (!email) errors.push("Falta email de cliente");
    else if (!isEmail(email)) errors.push(`Email inválido: ${email}`);
  }

  if (tipo === "direcciones") {
    const alias = normalizeText(row.alias);
    const nombre = normalizeText(row.nombre);
    const apellidos = normalizeText(row.apellidos);
    const direccion = normalizeText(row.direccion);
    if (!alias) errors.push("Falta alias de dirección");
    if (!nombre) errors.push("Falta nombre de dirección");
    if (!apellidos) errors.push("Faltan apellidos de dirección");
    if (!direccion) errors.push("Falta dirección");

    let clienteExists = false;
    if (row.clienteId !== undefined && row.clienteId !== "") {
      const clienteId = Number(row.clienteId);
      if (!Number.isInteger(clienteId)) {
        errors.push(`clienteId inválido: ${row.clienteId}`);
      } else {
        clienteExists = Boolean(await prisma.cliente.findUnique({ where: { id: clienteId } }));
        if (!clienteExists) errors.push(`No existe el cliente con id ${clienteId}`);
      }
    } else if (row.clienteEmail) {
      clienteExists = Boolean(await prisma.cliente.findUnique({ where: { email: normalizeText(row.clienteEmail) } }));
      if (!clienteExists) errors.push(`No existe el cliente con email ${normalizeText(row.clienteEmail)}`);
    } else {
      errors.push("Debes indicar clienteId o clienteEmail");
    }
  }

  if (tipo === "productos") {
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
    const productKey = normalizeText(row.productoReferencia || row.producto || row.nombreProducto);
    if (!productKey) {
      errors.push("Falta productoReferencia o nombreProducto");
    } else {
      const producto = await prisma.producto.findFirst({
        where: { OR: [{ referencia: productKey }, { nombre: productKey }] },
      });
      if (!producto) errors.push(`No existe el producto: ${productKey}`);
    }

    const atributos = splitList(row.atributos || row.attributeValues || row.atributoValores);
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

async function upsertAtributo(row: ImportRow) {
  const nombre = normalizeText(row.nombre);
  if (!nombre) throw new Error("Falta nombre de atributo");
  return prisma.atributo.upsert({
    where: { nombre },
    update: { orden: parseNumber(row.orden, 0) },
    create: { nombre, orden: parseNumber(row.orden, 0) },
  });
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

async function upsertCliente(row: ImportRow) {
  const email = normalizeText(row.email);
  if (!email) throw new Error("Falta email de cliente");

  const passwordPlain = normalizeText(row.password) || "123456";
  const hashedPassword = await bcrypt.hash(passwordPlain, 10);

  const data = {
    nombre: normalizeText(row.nombre),
    apellidos: normalizeText(row.apellidos),
    email,
    password: hashedPassword,
    telefono: normalizeText(row.telefono),
    empresa: row.empresa ? normalizeText(row.empresa) : null,
    nif: normalizeText(row.nif),
    direccion: normalizeText(row.direccion),
    direccionComplementaria: row.direccionComplementaria ? normalizeText(row.direccionComplementaria) : null,
    codigoPostal: normalizeText(row.codigoPostal),
    ciudad: normalizeText(row.ciudad),
    provincia: normalizeText(row.provincia),
    pais: row.pais ? normalizeText(row.pais) : "España",
    activo: row.activo !== undefined ? parseBool(row.activo, true) : true,
    aceptaMarketing: row.aceptaMarketing !== undefined ? parseBool(row.aceptaMarketing, false) : false,
    role: normalizeText(row.role) || "cliente",
    updatedAt: new Date(),
  };

  const existing = await prisma.cliente.findUnique({ where: { email } });
  if (existing) {
    return prisma.cliente.update({ where: { email }, data });
  }

  return prisma.cliente.create({ data });
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
    const cliente = await prisma.cliente.findUnique({ where: { email: normalizeText(row.clienteEmail) } });
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

async function upsertProducto(row: ImportRow) {
  const nombre = normalizeText(row.nombre);
  if (!nombre) throw new Error("Falta nombre de producto");

  const referencia = row.referencia ? normalizeText(row.referencia) : null;
  const productoExistente = referencia
    ? await prisma.producto.findFirst({ where: { referencia } })
    : await prisma.producto.findFirst({ where: { nombre } });

  const marca = row.marca ? await prisma.marca.findFirst({ where: { nombre: normalizeText(row.marca) } }) : null;

  const data = {
    nombre,
    referencia,
    resumen: row.resumen ?? null,
    descripcion: row.descripcion ?? null,
    descripcion_html: row.descripcion_html ?? null,
    precio: parseNumber(row.precio, 0),
    precioOferta: row.precioOferta !== undefined && row.precioOferta !== "" ? parseNumber(row.precioOferta, 0) : null,
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
    slug: row.slug ?? null,
    marcaId: marca?.id ?? null,
    reglaImpuestoId: row.reglaImpuestoId !== undefined && row.reglaImpuestoId !== "" ? Number(row.reglaImpuestoId) : null,
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
    await prisma.productoCategoria.deleteMany({ where: { productoId: producto.id } });
    for (let index = 0; index < categorias.length; index += 1) {
      const categoriaNombre = categorias[index];
      const categoria = await prisma.categoria.findFirst({ where: { nombre: categoriaNombre } });
      if (!categoria) continue;
      await prisma.productoCategoria.create({
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

async function upsertCombinacion(row: ImportRow) {
  const productKey = normalizeText(row.productoReferencia || row.producto || row.nombreProducto);
  if (!productKey) throw new Error("Falta productoReferencia o nombreProducto");

  const producto = await prisma.producto.findFirst({
    where: {
      OR: [
        { referencia: productKey },
        { nombre: productKey },
      ],
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
    precio_extra: row.precio_extra !== undefined && row.precio_extra !== "" ? parseNumber(row.precio_extra, 0) : 0,
    tamano: row.tamano ? normalizeText(row.tamano) : null,
    tirador: row.tirador ? normalizeText(row.tirador) : null,
  };

  const variante = existing
    ? await prisma.variante.update({ where: { id: existing.id }, data: varianteData })
    : await prisma.variante.create({ data: varianteData });

  const atributos = splitList(row.atributos || row.attributeValues || row.atributoValores);
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

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] as ImportRow;
      const sourceRow = (sourceRows[i] as ImportRow | undefined) ?? row;

      try {
        const validationErrors = await validateImportRow(tipo, row);
        if (validationErrors.length > 0) {
          errors.push({ row: i + 1, error: validationErrors.join(" · "), data: sanitizeRowForReport(row), sourceRow: sanitizeRowForReport(sourceRow) });
          continue;
        }

        if (tipo === "categorias") await upsertCategoria(row);
        else if (tipo === "marcas") await upsertMarca(row);
        else if (tipo === "proveedores") await upsertProveedor(row);
        else if (tipo === "atributos") await upsertAtributo(row);
        else if (tipo === "atributovalores") await upsertAtributoValor(row);
        else if (tipo === "clientes") await upsertCliente(row);
        else if (tipo === "direcciones") await upsertDireccion(row);
        else if (tipo === "productos") await upsertProducto(row);
        else if (tipo === "combinaciones") await upsertCombinacion(row);
        else throw new Error(`Tipo no soportado: ${tipo}`);

        created += 1;
      } catch (error: any) {
        errors.push({ row: i + 1, error: error.message, data: sanitizeRowForReport(row), sourceRow: sanitizeRowForReport(sourceRow) });
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      imported: created,
      updated,
      failed: errors.length,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}