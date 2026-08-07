// lib/prisma.ts
import { PrismaClient } from "../../generated/prisma/client";

// Tipos del cliente generado (generated/prisma), no los de @prisma/client.
export type { Prisma } from "../../generated/prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma