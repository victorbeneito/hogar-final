import { NextRequest, NextResponse } from "next/server";
import { buscarProductos } from "@/lib/productosLista";

// Ruta pública de SÓLO lectura: alimenta el buscador y cualquier consumidor externo.
// El POST que había aquí se eliminó el 2026-08-11 por no comprobar credenciales.
// Los productos se crean desde /api/admin/productos, que sí valida el rol.
//
// La consulta vive en src/lib/productosLista.ts porque /productos y la home la
// ejecutan directamente en el servidor. Esta ruta es un envoltorio sobre ella:
// así no puede haber dos criterios distintos de filtrado u orden.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // registrarBusqueda sólo aquí: en el render de servidor cada recarga de /productos
  // inflaría la tabla busqueda_log con términos que nadie ha tecleado de nuevo.
  const resultado = await buscarProductos(searchParams, { registrarBusqueda: true });

  return NextResponse.json({ ok: true, ...resultado });
}
