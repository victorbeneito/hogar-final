import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// TU HELPER ORIGINAL (adaptado al nuevo schema)
function formatearVariantesParaFrontend(variantes: any[]) {
  if (!Array.isArray(variantes)) return [];
  return variantes.map((v) => {
    let tipo = "";
    let valor = "";
    if (v.Atributos) {
      v.Atributos.forEach((attr: any) => {
        // ← ahora el Atributo viene dentro de AtributoValor
        if (attr.AtributoValor?.valor) {
          const nombreAtributo = attr.AtributoValor.Atributo?.nombre || "";
          if (attr.AtributoValor.valor.includes("x")) tipo = "TAMAÑO";
          else if (
            attr.AtributoValor.valor.toLowerCase().includes("izq") ||
            attr.AtributoValor.valor.toLowerCase().includes("der")
          ) tipo = "TIRADOR";
          else tipo = nombreAtributo || "OTRO";
          valor = attr.AtributoValor.valor;
        }
      });
    }
    return { ...v, tipo, valor, precio_extra: Number(v.precio_extra || 0) };
  });
}

// ----------------------------------------------------------------------
// GET: Obtener un producto por ID
// ----------------------------------------------------------------------
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    if (isNaN(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        Marca: true,
        Categorias: {
          include: {
            Categoria: {
              include: { hijos: true }
            }
          }
        },
        Imagenes: true,
        Caracteristicas: true,
        Variantes: {
          include: {
            Atributos: {
  include: {
    AtributoValor: {
      include: {
        Atributo: true   // ← se llega al Atributo a través de AtributoValor
      }
    }
  }
}
          }
        },
        ReglaImpuesto: true,
        PreciosEspecificos: true
      },
    });

    if (!producto) {
      return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });
    }

    // TU MAPEADO ORIGINAL MEJORADO
    const productoNormalizado = {
      ...producto,
      marca: producto.Marca,
      categoria: producto.Categorias?.[0]?.Categoria, // principal
      categorias: producto.Categorias?.map((pc: any) => pc.Categoria),
      imagenPortada: producto.Imagenes?.find((img: any) => img.esPortada)?.url,
      imagenes: producto.Imagenes?.map((img: any) => img.url),
      caracteristicas: producto.Caracteristicas,
      variantes: formatearVariantesParaFrontend(producto.Variantes),
      precioSinDescuento: producto.precioOferta ? producto.precio : null
    };

    return NextResponse.json({ ok: true, producto: productoNormalizado }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Error GET /api/productos/[id]:", error);
    return NextResponse.json({ ok: false, error: "Error servidor" }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// PUT: Actualizar un producto — TU LÓGICA ORIGINAL ADAPTADA
// ----------------------------------------------------------------------
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    if (isNaN(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

    const body = await req.json();
    console.log(`📝 [API PUT] Actualizando Producto ID ${id}...`);

    // 1. Preparar relaciones — TU CÓDIGO ORIGINAL
    let marcaConnect = undefined;
    let categoriaPrincipalConnect = undefined;

    if (body.marca) {
      const m = await prisma.marca.findFirst({ where: { nombre: body.marca } });
      if (m) marcaConnect = { connect: { id: m.id } };
    } 

    if (body.categoriaPrincipal) {
      const c = await prisma.categoria.findFirst({ where: { nombre: body.categoriaPrincipal } });
      if (c) categoriaPrincipalConnect = { connect: { id: c.id } };
    }

    // 2. Transacción — TU LÓGICA MEJORADA
    const productoActualizado = await prisma.$transaction(async (tx) => {
      // A. Borrar datos viejos
      await tx.productoCategoria.deleteMany({ where: { productoId: id } });
      await tx.productoImagen.deleteMany({ where: { productoId: id } });
      await tx.caracteristica.deleteMany({ where: { productoId: id } });
      await tx.variante.deleteMany({ where: { productoId: id } });

      // B. Actualizar producto
      const producto = await tx.producto.update({
        where: { id },
        data: {
          nombre: body.nombre,
          referencia: body.referencia,
          resumen: body.resumen,
          descripcion: body.descripcion,
          descripcion_html: body.descripcion_html,
          precio: parseFloat(body.precio),
          precioOferta: body.precioOferta ? parseFloat(body.precioOferta) : null,
          precioCoste: body.precioCoste ? parseFloat(body.precioCoste) : null,
          activo: body.activo !== undefined ? body.activo : true,
          destacado: body.destacado || false,
          enOferta: body.enOferta || false,
          visibilidad: body.visibilidad || "tienda",
          tieneVariantes: body.tieneVariantes || false,
          Marca: marcaConnect ? marcaConnect : { disconnect: true },
          ReglaImpuesto: body.reglaImpuestoId ? { connect: { id: parseInt(body.reglaImpuestoId) } } : { disconnect: true }
        },
        include: {
          Marca: true,
          ReglaImpuesto: true
        }
      });

      // C. Categorías N:M
      if (body.categorias?.length) {
        await tx.productoCategoria.createMany({
          data: body.categorias.map((catId: number, index: number) => ({
            productoId: producto.id,
            categoriaId: catId,
            esPrincipal: index === 0
          }))
        });
      }

      // D. Imágenes
      if (body.imagenes?.length) {
        const imagenesData = body.imagenes.map((url: string, index: number) => ({
          url,
          orden: index,
          esPortada: index === 0,
          productoId: producto.id
        }));
        await tx.productoImagen.createMany({ data: imagenesData });
      }

      // E. Características
      if (body.caracteristicas?.length) {
        await tx.caracteristica.createMany({
          data: body.caracteristicas.map((car: any, index: number) => ({
            clave: car.clave,
            valor: car.valor,
            orden: index,
            productoId: producto.id
          }))
        });
      }

      // F. Variantes
      if (body.tieneVariantes && body.variantes?.length) {
        const variantesData = body.variantes.map((v: any) => ({
          productoId: producto.id,
          referencia: v.referencia,
          precioExtra: parseFloat(v.precio_extra || "0"),
          stock: parseInt(v.stock || "0"),
          esDefault: v.esDefault || false,
          imagen: v.imagen || null,
          activa: v.activa !== undefined ? v.activa : true
        }));
        const variantes = await Promise.all(
  variantesData.map((v: any) => tx.variante.create({ data: v }))
);

        for (let i = 0; i < variantes.length; i++) {
          const variante = variantes[i];
          const atributos = body.variantes[i].atributos || [];
          const relaciones = atributos.map((attr: any) => ({
            varianteId: variante.id,
            atributoValorId: parseInt(attr.atributoValorId)
          }));
          if (relaciones.length > 0) {
            await tx.varianteAtributo.createMany({ data: relaciones });
          }
        }
      }

      // G. Cargar completo
      return tx.producto.findUnique({
        where: { id },
        include: {
          Marca: true,
          Categorias: { include: { Categoria: true } },
          Imagenes: true,
          Caracteristicas: true,
          Variantes: {
            include: {
              Atributos: {
  include: {
    AtributoValor: {
      include: {
        Atributo: true   // ← se llega al Atributo a través de AtributoValor
      }
    }
  }
}
            }
          },
          ReglaImpuesto: true
        }
      });
    });

    const respuesta = {
      ...productoActualizado,
      marca: (productoActualizado as any).Marca,
      categoria: (productoActualizado as any).Categorias?.[0]?.Categoria,
      categorias: (productoActualizado as any).Categorias?.map((pc: any) => pc.Categoria),
      imagenPortada: (productoActualizado as any).Imagenes?.find((img: any) => img.esPortada)?.url,
      imagenes: (productoActualizado as any).Imagenes?.map((img: any) => img.url),
      variantes: formatearVariantesParaFrontend((productoActualizado as any).Variantes),
      precioSinDescuento: (productoActualizado as any).precioOferta ? (productoActualizado as any).precio : null
    };

    console.log(`✅ [API PUT] OK`);
    return NextResponse.json({ ok: true, producto: respuesta }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Error PUT /api/productos/[id]:", error.message);
    return NextResponse.json(
      { ok: false, error: error.message, meta: error.meta },
      { status: 500 }
    );
  }
}

// DELETE — TU CÓDIGO ORIGINAL MEJORADO
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    if (isNaN(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

    // Borrar en cascada: imagenes, características, categorías, variantes...
    await prisma.producto.delete({
      where: { id },
      include: {
        Imagenes: true,
        Categorias: true,
        Caracteristicas: true,
        Variantes: true
      }
    });

    return NextResponse.json({ ok: true, message: "Eliminado" }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Error DELETE:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
