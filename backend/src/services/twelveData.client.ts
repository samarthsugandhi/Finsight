import { env } from "@/config/env";

/**
 * Thin client for Twelve Data's /quote endpoint. Deliberately never throws
 * — every failure mode (timeout, network error, non-2xx, malformed JSON,
 * per-symbol error) resolves to `null` for the affected symbol(s) so the
 * caller (marketData.service.ts's refresh loop) can fall back to cached
 * data instead of the whole refresh cycle blowing up.
 *
 * Symbol format (verified against Twelve Data's own documentation, see
 * https://support.twelvedata.com/en/articles/5203360-batch-api-requests,
 * which gives `SBIN:NSE` as its own worked example):
 *   - Exchange-qualified equities: `SYMBOL:EXCHANGE`, e.g. `RELIANCE:NSE`.
 *   - Crypto/forex pairs: `BASE/QUOTE`, e.g. `BTC/USD`.
 * Both formats used in this project's UI placeholders and .env.example
 * match this exactly.
 */

export interface TwelveDataQuote {
  price: number;
  previousClose: number | null;
  changePct: number | null;
  currency: string | null;
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch {
    // Covers both network errors and AbortError (timeout) — either way,
    // this is treated as "no data this cycle", not a crash.
    return null;
  } finally {
    clearTimeout(id);
  }
}

function parseQuoteEntry(entry: any): TwelveDataQuote | null {
  if (!entry || typeof entry !== "object") return null;
  if (entry.status === "error" || entry.code) return null; // Twelve Data's per-symbol error shape

  const price = Number(entry.close ?? entry.price);
  if (!Number.isFinite(price)) return null;

  const previousClose = entry.previous_close !== undefined ? Number(entry.previous_close) : null;
  const changePct = entry.percent_change !== undefined ? Number(entry.percent_change) : null;
  // Never assumed — Twelve Data reports this per-symbol (e.g. "INR" for
  // RELIANCE:NSE, "USD" for BTC/USD), and the frontend renders whichever
  // symbol this actually is instead of hardcoding ₹.
  const currency = typeof entry.currency === "string" ? entry.currency : null;

  return {
    price,
    previousClose: Number.isFinite(previousClose as number) ? previousClose : null,
    changePct: Number.isFinite(changePct as number) ? changePct : null,
    currency,
  };
}

/**
 * Fetches quotes for a batch of symbols in a single request (Twelve Data
 * supports comma-separated symbols on /quote). Returns a Map from symbol
 * to quote — symbols that failed or weren't found are simply absent from
 * the map, never present with fake/zero data.
 */
export async function fetchQuotes(symbols: string[]): Promise<Map<string, TwelveDataQuote>> {
  const result = new Map<string, TwelveDataQuote>();
  if (symbols.length === 0 || !env.MARKET_API_KEY) return result;

  const url = `${env.MARKET_API_URL}/quote?symbol=${encodeURIComponent(symbols.join(","))}&apikey=${env.MARKET_API_KEY}`;
  const response = await fetchWithTimeout(url);
  if (!response || !response.ok) return result;

  let data: any;
  try {
    data = await response.json();
  } catch {
    return result;
  }

  if (symbols.length === 1) {
    // Single-symbol requests return a flat object, not keyed by symbol.
    const quote = parseQuoteEntry(data);
    if (quote) result.set(symbols[0], quote);
    return result;
  }

  for (const symbol of symbols) {
    const quote = parseQuoteEntry(data?.[symbol]);
    if (quote) result.set(symbol, quote);
  }
  return result;
}
