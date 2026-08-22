import "dotenv/config";
import { z } from "zod";

// Validates env vars at boot and fails with a CLEAR error message instead of
// a cryptic downstream crash (e.g. Sequelize's "url must be a string" when
// DATABASE_URL was simply missing — this is exactly that failure mode, fixed).
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required — did you copy .env.example to .env?"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be set and reasonably long"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be set and reasonably long"),
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // Market data (Portfolio module) — all optional. If MARKET_API_KEY is
  // unset, the market data refresh loop simply never runs and every
  // STOCK/CRYPTO holding shows as "market data unavailable" — the rest of
  // the app (including the rest of Portfolio) is completely unaffected.
  MARKET_API_URL: z.string().default("https://api.twelvedata.com"),
  MARKET_API_KEY: z.string().optional(),
  MARKET_DATA_REFRESH_SECONDS: z.coerce.number().int().positive().default(60),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n❌ Invalid or missing environment variables:\n");
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("\nDid you run `cp .env.example .env` and fill in real values? Exiting.\n");
  process.exit(1);
}

export const env = parsed.data;
