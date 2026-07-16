import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL no esta configurada.");
  }

  const adapter =
    connectionString.includes("neon.tech") || connectionString.includes("neon.aws")
      ? new PrismaNeon({ connectionString })
      : new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

export const prisma =
  global.prismaGlobal ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}
