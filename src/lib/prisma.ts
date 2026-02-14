import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client instance
// In development, we cache it to avoid creating multiple instances
// but we need to ensure it's recreated when schema changes
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Cache in development only
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
