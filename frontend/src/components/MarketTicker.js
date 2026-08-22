"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";

const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

/** Never assume every price is in rupees — fall back to the ISO code itself for anything we don't have a glyph for, rather than silently mislabeling it. */
function currencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || (code ? `${code} ` : "₹");
}

const SYMBOL_LABELS = {
  "^NSEI": "NIFTY 50",
  "TCS:NSE": "TCS",
  "RELIANCE:NSE": "RELIANCE",
  "BTC/USD": "BTC"
};

function formatSymbol(sym) {
  return SYMBOL_LABELS[sym] || sym;
}

/**
 * Visual-only ticker. `realStatus` (from GET /portfolio/market-status) is
 * the ONLY source of truth — this component NEVER writes anywhere, never
 * feeds into any financial calculation, and never leaves the browser tab.
 * Between real ~60s refreshes it animates a small jitter purely for visual
 * texture, always centered on the last real price, clearly labeled so it's
 * never mistaken for genuine market data.
 */
export default function MarketTicker({ status, refreshSeconds }) {
  const [simulated, setSimulated] = useState({});

  // Reset the simulated baseline every time real data changes.
  useEffect(() => {
    const base = {};
    status.forEach((s) => {
      if (s.price !== null) base[s.symbol] = s.price;
    });
    setSimulated(base);
  }, [status]);

  // Pure client-side visual jitter — never touches real state, never persisted.
  useEffect(() => {
    if (status.length === 0) return;
    const id = setInterval(() => {
      setSimulated((current) => {
        const next = { ...current };
        status.forEach((s) => {
          if (s.price === null) return;
          const jitter = (Math.random() - 0.5) * s.price * 0.002; // ±0.2% visual wiggle only
          next[s.symbol] = s.price + jitter;
        });
        return next;
      });
    }, 2500);
    return () => clearInterval(id);
  }, [status]);

  const trackedSymbols = status.filter((s) => s.price !== null);

  return (
    <div className="rounded-xl border border-line bg-paper-raised overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-line/60 bg-paper">
        <div className="flex items-center gap-2 text-[11px] font-editorial font-semibold text-ink-soft uppercase tracking-wide">
          <Radio className="h-3 w-3 text-horizon animate-pulse" />
          Market
        </div>
        <p className="text-[10px] text-ink-soft/70 font-editorial">
          Live prices refresh every {refreshSeconds}s · animation between refreshes is visual only, not real data
        </p>
      </div>

      {trackedSymbols.length === 0 ? (
        <p className="px-4 py-3 text-xs text-ink-soft font-editorial">
          No live-priced holdings yet — add a Stock or Crypto holding with a symbol to see it here.
        </p>
      ) : (
        <div className="flex gap-6 overflow-x-auto px-4 py-3 scrollbar-none">
          {trackedSymbols.map((s) => {
            const displayPrice = simulated[s.symbol] ?? s.price;
            const up = (s.changePct ?? 0) >= 0;
            return (
              <div key={s.symbol} className="flex shrink-0 items-center gap-2 font-editorial">
                <span className="text-xs font-semibold text-ink">{formatSymbol(s.symbol)}</span>
                <span className="font-figure text-sm text-ink tabular-nums">
                  {currencySymbol(s.currency)}
                  {displayPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
                {s.changePct !== null && (
                  <span className={`text-[11px] font-semibold ${up ? "text-signal-pos" : "text-signal-neg"}`}>
                    {up ? "▲" : "▼"}
                    {Math.abs(s.changePct).toFixed(2)}%
                  </span>
                )}
                <span
                  className={`h-1.5 w-1.5 rounded-full ${s.status === "SUCCESS" ? "bg-signal-pos animate-pulse" : "bg-ink-soft/40"}`}
                  title={s.status === "SUCCESS" ? "Live" : "Stale — showing last known price"}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
