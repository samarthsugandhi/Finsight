import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env";

// Reuse a single PrismaClient instance across the app.
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
