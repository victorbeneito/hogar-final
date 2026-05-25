// src/app/api/debug/db/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const allTables = await prisma.$queryRaw`SHOW TABLES`;
    const cuponCount = await prisma.cupon.count();
    return NextResponse.json({ status: "OK", tables: allTables, cupon_count: cuponCount });
  } catch (e: any) {
    console.error("❌ ERROR COMPLETO:", e.message);
    return NextResponse.json({ error: e.message, code: e.code }, { status: 500 });
  }
}
