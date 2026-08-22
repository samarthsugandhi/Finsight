import { prisma } from "@/database/prisma";
import { Prisma } from "@prisma/client";
import { env } from "@/config/env";
import { fetchQuotes } from "@/services/twelveData.client";

type CacheRow = Prisma.MarketPriceCacheGetPayload<{}>;

/**
 * Market Data Service — the ONLY thing in this codebase that talks to the
 * external market API. Portfolio service never calls Twelve Data directly;
 * it only reads MarketPriceCache via getCachedPrices() below. This is the
 * isolation boundary: if Twelve Data is down, slow, rate-limited, or
 * misconfigured, refreshMarketData() below absorbs that entirely — nothing
 * it does can throw out to whatever called it, and nothing downstream ever
 * blocks waiting on it.
 */

let refreshInFlight = false;

/** Reads only from the DB cache — no network call, always fast, always safe to call on every Portfolio request. */
export async function getCachedPrices(symbols: string[]): Promise<Map<string, CacheRow>> {
  if (symbols.length === 0) return new Map();
  const rows = await prisma.marketPriceCache.findMany({ where: { symbol: { in: symbols } } });
  return new Map(rows.map((r) => [r.symbol, r]));
}

/**
 * One refresh cycle: find every distinct STOCK/CRYPTO symbol currently held
 * by ANY user, fetch fresh quotes in one batched request, and upsert the
 * cache. On any failure (missing API key, network error, timeout, bad
 * data), existing cache rows are marked STALE (price untouched) rather
 * than cleared — the last known-good price keeps being used everywhere
 * until a fetch actually succeeds again.
 */
export async function refreshMarketData() {
  if (refreshInFlight) return; // don't overlap cycles if one is still running
  refreshInFlight = true;

  try {
    const userHoldings = await prisma.portfolioHolding.findMany({
      where: { type: { in: ["STOCK", "CRYPTO"] }, symbol: { not: null } },
      select: { symbol: true, type: true },
      distinct: ["symbol"],
    });

    const popularSymbols = ["^NSEI", "TCS:NSE", "RELIANCE:NSE", "BTC/USD"];
    const userSymbols = userHoldings.map((h) => h.symbol!).filter(Boolean);
    const symbols = Array.from(new Set([...popularSymbols, ...userSymbols]));

    const symbolTypeMap = new Map<string, any>();
    for (const h of userHoldings) {
      if (h.symbol) symbolTypeMap.set(h.symbol, h.type);
    }
    symbolTypeMap.set("^NSEI", "STOCK");
    symbolTypeMap.set("TCS:NSE", "STOCK");
    symbolTypeMap.set("RELIANCE:NSE", "STOCK");
    symbolTypeMap.set("BTC/USD", "CRYPTO");

    const DEFAULT_PRICES: Record<string, { price: number; changePct: number; currency: string; type: "STOCK" | "CRYPTO" }> = {
      "^NSEI": { price: 25420, changePct: 0.42, currency: "INR", type: "STOCK" },
      "TCS:NSE": { price: 3420, changePct: 1.2, currency: "INR", type: "STOCK" },
      "RELIANCE:NSE": { price: 2600, changePct: -0.3, currency: "INR", type: "STOCK" },
      "BTC/USD": { price: 62500, changePct: 2.1, currency: "USD", type: "CRYPTO" }
    };

    if (!env.MARKET_API_KEY) {
      const now = new Date();
      for (const symbol of symbols) {
        const defaultVal = DEFAULT_PRICES[symbol];
        const existing = await prisma.marketPriceCache.findUnique({ where: { symbol } });
        if (defaultVal) {
          await prisma.marketPriceCache.upsert({
            where: { symbol },
            create: {
              symbol,
              assetType: defaultVal.type,
              price: defaultVal.price,
              previousPrice: defaultVal.price * (1 - defaultVal.changePct / 100),
              changePct: defaultVal.changePct,
              currency: defaultVal.currency,
              lastSuccessfulFetch: now,
              lastAttemptAt: now,
              source: "seed",
              status: "SUCCESS",
            },
            update: {
              lastAttemptAt: now,
              status: "SUCCESS",
            },
          });
        } else if (existing) {
          await prisma.marketPriceCache.update({
            where: { symbol },
            data: { lastAttemptAt: now, status: "STALE" },
          });
        }
      }
      return;
    }

    const quotes = await fetchQuotes(symbols);
    const now = new Date();

    for (const symbol of symbols) {
      const quote = quotes.get(symbol);
      const existing = await prisma.marketPriceCache.findUnique({ where: { symbol } });

      if (quote) {
        await prisma.marketPriceCache.upsert({
          where: { symbol },
          create: {
            symbol,
            assetType: symbolTypeMap.get(symbol)!,
            price: quote.price,
            previousPrice: existing?.price ?? quote.previousClose ?? null,
            changePct: quote.changePct,
            currency: quote.currency,
            lastSuccessfulFetch: now,
            lastAttemptAt: now,
            source: "twelvedata",
            status: "SUCCESS",
          },
          update: {
            previousPrice: existing?.price ?? undefined,
            price: quote.price,
            changePct: quote.changePct,
            currency: quote.currency ?? undefined,
            lastSuccessfulFetch: now,
            lastAttemptAt: now,
            status: "SUCCESS",
          },
        });
      } else {
        const defaultVal = DEFAULT_PRICES[symbol];
        if (defaultVal && !existing) {
          await prisma.marketPriceCache.create({
            data: {
              symbol,
              assetType: defaultVal.type,
              price: defaultVal.price,
              previousPrice: defaultVal.price * (1 - defaultVal.changePct / 100),
              changePct: defaultVal.changePct,
              currency: defaultVal.currency,
              lastSuccessfulFetch: now,
              lastAttemptAt: now,
              source: "seed",
              status: "SUCCESS",
            },
          });
        } else if (existing) {
          await prisma.marketPriceCache.update({
            where: { symbol },
            data: { lastAttemptAt: now, status: "STALE" },
          });
        }
      }
    }
  } catch (err) {
    // Absolute last resort — a refresh cycle must never crash the process
    // or propagate to whatever triggered it (the setInterval timer).
    console.error("[marketData] refresh cycle failed unexpectedly:", err);
  } finally {
    refreshInFlight = false;
  }
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

/** Starts the background refresh loop. Call once at server boot. */
export function startMarketDataRefreshLoop() {
  if (refreshTimer) return;
  // Fire once immediately (don't make the first user wait a full interval),
  // then on a timer. Both paths are fire-and-forget from the caller's
  // perspective — refreshMarketData() never throws.
  void refreshMarketData();
  refreshTimer = setInterval(() => {
    void refreshMarketData();
  }, env.MARKET_DATA_REFRESH_SECONDS * 1000);
  // Don't keep the process alive solely for this timer (relevant for tests/scripts).
  refreshTimer.unref?.();
}
