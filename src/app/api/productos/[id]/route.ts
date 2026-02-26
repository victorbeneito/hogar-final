import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// --- HELPER: Formatear variantes para el Frontend ---
// Convierte lo que viene de la BD (tamano="XL") a lo que espera el Formulario (tipo="TAMAÑO", valor="XL")
function formatearVariantesParaFrontend(variantes: any[]) {
  if (!Array.isArray(variantes)) return [];
  return variantes.map((v) => {
    let tipo = "";
    let valor = "";

    if (v.tamano) { tipo = "TAMAÑO"; valor = v.tamano; }
    else if (v.tirador) { tipo = "TIRADOR"; valor = v.tirador; }
    else if (v.color) { tipo = "COLOR"; valor = v.color; }

    return {
      ...v,
      tipo,
      valor,
      precio_extra: Number(v.precio_extra || 0)
    };
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
        Categoria: true,
        Variante: true,
      },
    });

    if (!producto) {
      return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });
    }

    // 🔄 Mapeo para el Frontend (Tu código original + el arreglo de variantes)
    const productoNormalizado = {
      ...producto,
      marca: (producto as any).Marca,
      categoria: (producto as any).Categoria,
      // AQUI EL ARREGLO: Pasamos las variantes formateadas para que el formulario las entienda
      variantes: formatearVariantesParaFrontend((producto as any).Variante)
    };

    return NextResponse.json({ ok: true, producto: productoNormalizado }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Error GET /api/productos/[id]:", error);
    return NextResponse.json({ ok: false, error: "Error servidor" }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// PUT: Actualizar un producto
// ----------------------------------------------------------------------
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    if (isNaN(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

    const body = await req.json();
    console.log(`📝 [API PUT] Actualizando Producto ID ${id}...`);

    // 1. Preparar relaciones
    let marcaConnect = undefined;
    let categoriaConnect = undefined;

    if (body.marca) {
      const m = await prisma.marca.findFirst({ where: { nombre: body.marca } });
      if (m) marcaConnect = { connect: { id: m.id } };
    } 

    if (body.categoria) {
      const c = await prisma.categoria.findFirst({ where: { nombre: body.categoria } });
      if (c) categoriaConnect = { connect: { id: c.id } };
    }

    // 2. Transacción
    const productoActualizado = await prisma.$transaction(async (tx:any) => {
      
      // A. Borrar variantes viejas
      if (body.variantes) {
        await tx.variante.deleteMany({ where: { productoId: id } });
      }

      // B. Actualizar Producto y Crear Variantes Nuevas
      const producto = await tx.producto.update({
        where: { id },
        data: {
          nombre: body.nombre,
          descripcion: body.descripcion,
          descripcion_html: body.descripcion_html_cruda || body.descripcionHtml || "", 
          precio: parseFloat(body.precio),
          stock: parseInt(body.stock),
          destacado: body.destacado || false,
          imagenes: body.imagenes || [],

          // Relaciones
          Marca: marcaConnect ? marcaConnect : { disconnect: true },
          Categoria: categoriaConnect ? categoriaConnect : { disconnect: true },

          // C. Crear variantes nuevas (TRADUCTOR: Formulario -> Base de Datos)
          Variante: body.variantes ? {
            create: body.variantes.map((v: any) => ({
              // Si el usuario eligió "TAMAÑO", guardamos en 'tamano', si no null.
              tamano: v.tipo === 'TAMAÑO' ? v.valor : null,
              tirador: v.tipo === 'TIRADOR' ? v.valor : null,
              color: v.tipo === 'COLOR' ? v.valor : null,
              
              precio_extra: parseFloat(v.precio_extra || 0),
              imagen: v.imagen || null
            }))
          } : undefined,
        },
        include: {
          Marca: true,
          Categoria: true,
          Variante: true,
        },
      });

      return producto;
    });

    // Devolvemos el producto formateado para que el formulario se actualice sin recargar
    const respuestaFrontend = {
      ...productoActualizado,
      marca: (productoActualizado as any).Marca,
      categoria: (productoActualizado as any).Categoria,
      variantes: formatearVariantesParaFrontend((productoActualizado as any).Variante)
    };

    console.log(`✅ [API PUT] OK`);
    return NextResponse.json({ ok: true, producto: respuestaFrontend }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Error PUT /api/productos/[id]:", error.message);
    return NextResponse.json(
      { ok: false, error: error.message, meta: error.meta },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------
// DELETE: Eliminar un producto
// ----------------------------------------------------------------------
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    if (isNaN(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

    await prisma.variante.deleteMany({ where: { productoId: id } });
    await prisma.producto.delete({ where: { id } });

    return NextResponse.json({ ok: true, message: "Eliminado" }, { status: 200 });
    
  } catch (error: any) {
    console.error("❌ Error DELETE:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}