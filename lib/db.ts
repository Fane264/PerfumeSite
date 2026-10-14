import { PrismaClient } from "@prisma/client";

// Prisma client singleton.
//
// In development Next.js clears the Node module cache on every request, which
// would otherwise spawn a new PrismaClient (and a new connection pool) on each
// hot reload. We cache the instance on `globalThis` to avoid exhausting DB
// connections. In production a single instance is created per server process.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
