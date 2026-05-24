// src/app/api/debug/db/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Intenta listar TODAS las tablas que ve Prisma
    const allTables = await prisma.$queryRaw`SHOW TABLES`;
    console.log("✅ TODAS LAS TABLAS:", allTables);
    
    // 2. Intenta count (para ver error exacto)
    const cuponCount = await prisma.cupon.count();
    
    return NextResponse.json({
      status: "OK",
      tables: allTables,
      cupon_count: cuponCount
    });
  } catch (e: any) {
    console.error("❌ ERROR COMPLETO:", e.message);
    return NextResponse.json({
      error: e.message,
      code: e.code
    }, { status: 500 });
  }
}
