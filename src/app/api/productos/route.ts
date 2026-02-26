import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper para formatear variantes en la lista (opcional, pero útil)
function formatearVariantesParaFrontend(variantes: any[]) {
  if (!Array.isArray(variantes)) return [];
  return variantes.map((v) => {
    let tipo = "";
    let valor = "";
    if (v.tamano) { tipo = "TAMAÑO"; valor = v.tamano; }
    else if (v.tirador) { tipo = "TIRADOR"; valor = v.tirador; }
    else if (v.color) { tipo = "COLOR"; valor = v.color; }
    return { ...v, tipo, valor, precio_extra: Number(v.precio_extra || 0) };
  });
}

// ----------------------------------------------------------------------
// GET /api/productos
// ----------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoriaParam = searchParams.get("categoria");
    const q = searchParams.get("q") || searchParams.get("search");
    const destacado = searchParams.get("destacado");

    // Construimos el filtro dinámicamente (TU LÓGICA ORIGINAL)
    const whereClause: any = {};

    // 1. Lógica inteligente para Categoría (ID o Nombre)
    if (categoriaParam) {
      const catId = parseInt(categoriaParam);
      if (!isNaN(catId)) {
        whereClause.categoriaId = catId;
      } else {
        whereClause.Categoria = { nombre: categoriaParam };
      }
    }

    // 2. Filtro por Buscador (q)
    if (q) {
      whereClause.OR = [
        { nombre: { contains: q } },
        { descripcion: { contains: q } }
      ];
    }

    // 3. Filtro Destacados
    if (destacado === "true") {
      whereClause.destacado = true;
    }

    const productos = await prisma.producto.findMany({
      where: whereClause,
      include: {
        Marca: true,      
        Categoria: true, 
        Variante: true  
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 4. Mapeo para el Frontend
    const productosNormalizados = productos.map((p: any) => ({
      ...p,
      marca: p.Marca,
      categoria: p.Categoria,
      // Aplicamos el formateo también aquí por si acaso
      variantes: formatearVariantesParaFrontend(p.Variante)
    }));

    return NextResponse.json({ ok: true, productos: productosNormalizados }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Error en GET /api/productos:", error.message);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------
// POST /api/productos
// ----------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validar si existen Marca y Categoria
    const marca = await prisma.marca.findFirst({ where: { nombre: body.marca } });
    const categoria = await prisma.categoria.findFirst({ where: { nombre: body.categoria } });

    if (!marca) {
      return NextResponse.json({ ok: false, error: `Marca "${body.marca}" no encontrada` }, { status: 400 });
    }

    if (!categoria) {
      return NextResponse.json({ ok: false, error: `Categoría "${body.categoria}" no encontrada` }, { status: 400 });
    }

    // 2. Crear el producto
    const nuevoProducto = await prisma.producto.create({
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion || "",
        descripcion_html: body.descripcion_html_cruda || "", 
        precio: parseFloat(body.precio),
        stock: parseInt(body.stock),
        destacado: body.destacado || false,
        imagenes: body.imagenes || [], 

        // Relaciones
        Marca: { connect: { id: marca.id } },
        Categoria: { connect: { id: categoria.id } },

        // Variantes (TRADUCTOR: Formulario -> Base de Datos)
        Variante: {
          create: body.variantes?.map((v: any) => ({
            tamano: v.tipo === 'TAMAÑO' ? v.valor : null,
            tirador: v.tipo === 'TIRADOR' ? v.valor : null,
            color: v.tipo === 'COLOR' ? v.valor : null,
            precio_extra: parseFloat(v.precio_extra || 0),
            imagen: v.imagen || null
          })) || []
        }
      },
      include: {
        Marca: true,
        Categoria: true,
        Variante: true
      }
    });

    // Formatear respuesta
    const productoRespuesta = {
        ...nuevoProducto,
        marca: (nuevoProducto as any).Marca,
        categoria: (nuevoProducto as any).Categoria,
        variantes: formatearVariantesParaFrontend((nuevoProducto as any).Variante)
    };

    return NextResponse.json(
      { ok: true, producto: productoRespuesta },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("❌ POST Error /api/productos:", error.message);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}