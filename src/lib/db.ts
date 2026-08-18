import { PrismaClient } from "@prisma/client";

const SCHEMA_REV = 5;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaRev?: number;
};

function createPrisma() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });
  void client.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
  void client.$queryRawUnsafe("PRAGMA busy_timeout=3000;");
  return client;
}

function getPrisma() {
  if (globalForPrisma.prisma && globalForPrisma.prismaRev === SCHEMA_REV) {
    return globalForPrisma.prisma;
  }
  const client = createPrisma();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaRev = SCHEMA_REV;
  }
  return client;
}

export const prisma = getPrisma();
