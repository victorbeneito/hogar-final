// src/app/api/debug/db/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: Record<string, any> = {};

  try {
    results.tables = await prisma.$queryRaw`SHOW TABLES`;
    results.cupon_count = await prisma.cupon.count();
  } catch (e: any) {
    return NextResponse.json({ error: e.message, code: e.code, step: "tables" }, { status: 500 });
  }

  try {
    results.cliente_count = await prisma.cliente.count();
  } catch (e: any) {
    results.cliente_error = { message: e.message, code: e.code };
  }

  try {
    results.cliente_sample = await prisma.cliente.findMany({
      take: 1,
      select: { id: true, nombre: true, email: true, activo: true, role: true, createdAt: true },
    });
  } catch (e: any) {
    results.cliente_sample_error = { message: e.message, code: e.code };
  }

  try {
    const cols = await prisma.$queryRaw`SHOW COLUMNS FROM cliente`;
    results.cliente_columns = cols;
  } catch (e: any) {
    results.cliente_columns_error = { message: e.message, code: e.code };
  }

  return NextResponse.json({ status: "OK", ...results });
}
