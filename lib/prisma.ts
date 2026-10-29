import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  if (
    globalForPrisma.prisma && 
    "saaSCustomer" in globalForPrisma.prisma &&
    "saaSInvoice" in globalForPrisma.prisma &&
    "saaSPackage" in globalForPrisma.prisma
  ) {
    return globalForPrisma.prisma;
  }
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
