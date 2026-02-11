import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client instance with better error handling
// In development, we cache it to avoid creating multiple instances
// but we need to ensure it's recreated when schema changes
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Test database connection on initialization with better error handling
if (!globalForPrisma.prisma) {
  prisma.$connect().catch((error: any) => {
    console.error("❌ Failed to connect to database:", error.message);
    if (error.code === "P1001" || error.message?.includes("ECONNREFUSED") || error.message?.includes("ENOTFOUND")) {
      console.error("💡 MySQL service appears to be down. Please restart MySQL service in Railway.");
    } else if (error.message?.includes("Access denied")) {
      console.error("💡 Database authentication failed. Check DATABASE_URL credentials.");
    } else if (!process.env.DATABASE_URL) {
      console.error("💡 DATABASE_URL environment variable is not set.");
    } else {
      console.error("💡 Check DATABASE_URL format: mysql://user:password@host:port/database");
    }
  });
}

// Cache in development only
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
