"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Button, Input, Select, EmptyState, ErrorState, StatCard } from "@/components/ui";
import { useFinance } from "@/context/FinanceContext";
import { api } from "@/lib/api";
import MarketTicker from "@/components/MarketTicker";
import { CHART_COLORS } from "@/lib/chartColors";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

const HOLDING_TYPES = [
  { value: "STOCK", label: "Stock" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "MUTUAL_FUND", label: "Mutual Fund" },
  { value: "GOLD", label: "Gold" },
  { value: "FIXED_DEPOSIT", label: "Fixed Deposit" },
];

const PRICE_SOURCE_LABEL = {
  LIVE: "● Live market data",
  MANUAL: "◐ Manually priced",
  FIXED_DEPOSIT: "◆ Fixed Deposit",
  UNAVAILABLE: "○ Price unavailable — showing invested amount only",
};

const UNIT_LABELS = {
  STOCK: { qty: "Quantity", qtyPlaceholder: "Quantity", price: "Price", avgPrice: "Avg Buy Price" },
  CRYPTO: { qty: "Quantity", qtyPlaceholder: "Quantity", price: "Price", avgPrice: "Avg Buy Price" },
  MUTUAL_FUND: { qty: "Units", qtyPlaceholder: "Units", price: "NAV per unit", avgPrice: "Avg NAV" },
  GOLD: { qty: "Grams", qtyPlaceholder: "Grams", price: "Price per gram", avgPrice: "Avg Price/gram" },
};

const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

function fmt(n, currency = "INR") {
  if (n === null || n === undefined) return "—";
  const symbol = CURRENCY_SYMBOLS[currency] || (currency ? `${currency} ` : "₹");
  return `${symbol}${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatQuantityLabel(qty, type) {
  if (qty === null || qty === undefined) return "";
  const count = Number(qty);
  if (type === "STOCK") return `${count} share${count === 1 ? "" : "s"}`;
  if (type === "MUTUAL_FUND") return `${count} unit${count === 1 ? "" : "s"}`;
  if (type === "CRYPTO") return `${count} unit${count === 1 ? "" : "s"}`;
  if (type === "GOLD") return `${count} gram${count === 1 ? "" : "s"}`;
  return `${count} unit${count === 1 ? "" : "s"}`;
}

const tooltipStyle = {
  backgroundColor: "var(--color-paper-raised)",
  borderColor: "var(--color-line)",
  borderRadius: "8px",
  color: "var(--color-ink)",
  fontFamily: "var(--font-editorial)",
  fontSize: "12px",
};

function HoldingTransactions({ holdingId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState(null);

  async function handleToggle() {
    if (!open && transactions === null) {
      setLoading(true);
      try {
        const res = await api.portfolioTransactions(holdingId);
        setTransactions(res.transactions);
      } finally {
        setLoading(false);
      }
    }
    setOpen(!open);
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={handleToggle} className="text-[11px] text-ink-soft hover:text-horizon underline cursor-pointer font-editorial">
        {open ? "Hide transaction history" : "View transaction history"}
      </button>
      {open && (
        <div className="mt-2 rounded-md border border-line/60 bg-paper p-2.5">
          {loading ? (
            <p className="text-[11px] text-ink-soft font-editorial">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="text-[11px] text-ink-soft font-editorial">No transactions yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {transactions.map((t) => (
                <li key={t.id} className="flex justify-between text-[11px] font-editorial">
                  <span className={t.side === "BUY" ? "text-signal-pos font-semibold" : "text-signal-neg font-semibold"}>
                    {t.side}
                  </span>
                  <span className="text-ink-soft">
                    {t.quantity} @ {fmt(t.price)} · {new Date(t.date).toLocaleDateString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function HoldingCard({ holding, onAddTransaction, onUpdateManualPrice, onDelete }) {
  const [txForm, setTxForm] = useState({ side: "BUY", quantity: "", price: "" });
  const [showTxForm, setShowTxForm] = useState(false);
  const [manualPriceInput, setManualPriceInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isFd = holding.type === "FIXED_DEPOSIT";
  const canManualPrice = holding.type === "MUTUAL_FUND" || holding.type === "GOLD";
  const profitPositive = holding.profitLoss !== null && holding.profitLoss >= 0;
  const units = UNIT_LABELS[holding.type] || UNIT_LABELS.STOCK;

  const currentPrice = holding.quantity > 0 && holding.currentValue !== null 
    ? holding.currentValue / holding.quantity 
    : null;

  async function handleTxSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const ok = await onAddTransaction(holding.id, {
      side: txForm.side,
      quantity: Number(txForm.quantity),
      price: Number(txForm.price),
    });
    if (ok) {
      setTxForm({ side: "BUY", quantity: "", price: "" });
      setShowTxForm(false);
    }
    setSubmitting(false);
  }

  async function handleManualPriceSubmit(e) {
    e.preventDefault();
    if (!manualPriceInput) return;
    setSubmitting(true);
    const ok = await onUpdateManualPrice(holding.id, Number(manualPriceInput));
    if (ok) setManualPriceInput("");
    setSubmitting(false);
  }

  return (
    <Card className="text-xs font-editorial">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-ink text-sm">{holding.name}</p>
          <p className="text-ink-soft uppercase text-[9px] tracking-wider mt-0.5">
            {HOLDING_TYPES.find((t) => t.value === holding.type)?.label || holding.type}
            {holding.symbol && ` · ${holding.symbol}`}
            {holding.quantity !== null && ` · ${formatQuantityLabel(holding.quantity, holding.type)}`}
          </p>
        </div>
        <button type="button" onClick={() => onDelete(holding.id)} className="text-signal-neg hover:underline cursor-pointer">
          Delete
        </button>
      </div>

      <p className="mt-1.5 text-[10px] text-ink-soft">{PRICE_SOURCE_LABEL[holding.priceSource]}</p>

      {isFd ? (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line/40 pt-2.5 text-ink-soft">
          <div>
            <span className="block text-[8px] uppercase">Principal</span>
            <span className="font-figure text-ink font-medium">{fmt(holding.principal)}</span>
          </div>
          <div>
            <span className="block text-[8px] uppercase">Current (accrued)</span>
            <span className="font-figure text-ink font-medium">{fmt(holding.currentValue)}</span>
          </div>
          {holding.interestRate !== null && (
            <div>
              <span className="block text-[8px] uppercase">Rate</span>
              <span className="font-figure text-ink font-medium">{holding.interestRate}% p.a.</span>
            </div>
          )}
          {holding.maturityDate && (
            <div>
              <span className="block text-[8px] uppercase">Maturity</span>
              <span className="font-figure text-ink font-medium">{new Date(holding.maturityDate).toLocaleDateString("en-IN")}</span>
            </div>
          )}
        </div>
      ) : (
        <>
          {holding.avgBuyPrice !== null && currentPrice !== null && (
            <div className="mt-3 space-y-2 border-t border-line/40 pt-2.5">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="block text-[8px] uppercase tracking-wide text-ink-soft">Buy Price</span>
                  <span className="font-figure text-ink font-semibold text-sm">{fmt(holding.avgBuyPrice)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[8px] uppercase tracking-wide text-ink-soft">Current Price</span>
                  <span className="font-figure text-ink font-semibold text-sm">{fmt(currentPrice, holding.currency)}</span>
                </div>
              </div>

              {/* Visual connection timeline: Buy Target Dot -------- Market Dot */}
              <div className="relative py-1 my-1.5">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className={`w-full border-t-2 border-dashed ${profitPositive ? "border-signal-pos/40" : "border-signal-neg/40"}`} />
                </div>
                <div className="relative flex justify-between">
                  <span className={`h-2.5 w-2.5 rounded-full border-2 bg-paper-raised ${profitPositive ? "border-signal-pos" : "border-signal-neg"}`} />
                  <span className={`h-2.5 w-2.5 rounded-full border-2 bg-paper-raised ${profitPositive ? "border-signal-pos" : "border-signal-neg"} ${holding.priceSource === "LIVE" ? "animate-pulse" : ""}`} />
                </div>
                <div className="flex justify-between text-[8px] uppercase tracking-wider text-ink-soft/75 mt-0.5">
                  <span>Avg Buy</span>
                  <span>Current Price</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-3 border-t border-line/40 pt-2.5 text-xs text-ink-soft">
            <div>
              <span className="block text-[8px] uppercase tracking-wide text-ink-soft">Invested</span>
              <span className="font-figure text-ink font-medium">{fmt(holding.investedAmount)}</span>
            </div>
            <div>
              <span className="block text-[8px] uppercase tracking-wide text-ink-soft">Current Value</span>
              <span className="font-figure text-ink font-medium">{fmt(holding.currentValue, holding.currency)}</span>
            </div>
            <div>
              <span className="block text-[8px] uppercase tracking-wide text-ink-soft">Profit/Loss</span>
              <span className={`font-figure font-semibold ${holding.profitLoss === null ? "text-ink-soft" : profitPositive ? "text-signal-pos" : "text-signal-neg"}`}>
                {holding.profitLoss === null ? "—" : `${profitPositive ? "+" : ""}${fmt(holding.profitLoss, holding.currency)}`}
              </span>
            </div>
            <div>
              <span className="block text-[8px] uppercase tracking-wide text-ink-soft">Return</span>
              <span className={`font-figure font-semibold ${holding.returnPct === null ? "text-ink-soft" : profitPositive ? "text-signal-pos" : "text-signal-neg"}`}>
                {holding.returnPct === null ? "—" : `${profitPositive ? "+" : ""}${holding.returnPct.toFixed(2)}%`}
              </span>
            </div>
          </div>

          {holding.priceSource === "UNAVAILABLE" && (
            <p className="mt-2 text-[10px] text-horizon font-editorial">
              No current price available — figures above show your invested amount only.
            </p>
          )}
          {holding.currency !== "INR" && holding.priceSource === "LIVE" && (
            <p className="mt-1 text-[9px] text-ink-soft/70 font-editorial">
              Current price and profit shown in {holding.currency} — invested amount was entered in INR.
            </p>
          )}

          <HoldingTransactions holdingId={holding.id} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowTxForm(!showTxForm)} className="text-horizon hover:underline cursor-pointer">
              {showTxForm ? "Cancel" : "Buy / Sell"}
            </button>
          </div>

          {showTxForm && (
            <form onSubmit={handleTxSubmit} className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-line/60 bg-paper p-2.5">
              <select
                value={txForm.side}
                onChange={(e) => setTxForm({ ...txForm, side: e.target.value })}
                className="px-2 py-1.5 bg-paper-raised border border-line rounded text-ink text-[11px] focus-visible:outline-none"
              >
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
              <input
                type="number"
                step="0.000001"
                min="0"
                placeholder={units.qtyPlaceholder}
                required
                value={txForm.quantity}
                onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })}
                className="w-24 px-2 py-1.5 bg-paper-raised border border-line rounded text-ink text-[11px] focus-visible:outline-none"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={units.price}
                required
                value={txForm.price}
                onChange={(e) => setTxForm({ ...txForm, price: e.target.value })}
                className="w-24 px-2 py-1.5 bg-paper-raised border border-line rounded text-ink text-[11px] focus-visible:outline-none"
              />
              <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-horizon text-[#0f1b33] rounded font-semibold cursor-pointer disabled:opacity-50">
                {submitting ? "Saving…" : "Confirm"}
              </button>
            </form>
          )}

          {canManualPrice && (
            <form onSubmit={handleManualPriceSubmit} className="mt-2">
              <label className="block text-[9px] uppercase tracking-wide text-ink-soft mb-1">
                Update {units.price} (₹)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={holding.type === "GOLD" ? "e.g. 6250 per gram" : "e.g. 42.15 per unit"}
                  value={manualPriceInput}
                  onChange={(e) => setManualPriceInput(e.target.value)}
                  className="w-40 px-2 py-1.5 bg-paper border border-line rounded text-ink text-[11px] focus-visible:outline-none"
                />
                <button type="submit" disabled={submitting} className="px-2.5 py-1.5 border border-line rounded text-ink-soft hover:text-ink cursor-pointer disabled:opacity-50">
                  Update Price
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </Card>
  );
}

export default function PortfolioPage() {
  const { portfolio, loading, error, refetch, addHolding, addPortfolioTransaction, updateManualPrice, deleteHolding } =
    useFinance();

  const [marketStatus, setMarketStatus] = useState({ status: [], refreshSeconds: 60 });
  const [holdingForm, setHoldingForm] = useState({
    type: "STOCK",
    name: "",
    symbol: "",
    quantity: "",
    averageBuyPrice: "",
    principal: "",
    interestRate: "",
    startDate: "",
    maturityDate: "",
    maturityAmount: "",
  });
  const [submittingHolding, setSubmittingHolding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await api.portfolioMarketStatus();
        if (!cancelled) setMarketStatus(res);
      } catch {
        // market status is best-effort
      }
    }
    poll();
    const id = setInterval(poll, marketStatus.refreshSeconds * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function handleHoldingSubmit(e) {
    e.preventDefault();
    setSubmittingHolding(true);
    let payload;
    if (holdingForm.type === "FIXED_DEPOSIT") {
      payload = {
        type: "FIXED_DEPOSIT",
        name: holdingForm.name,
        principal: Number(holdingForm.principal),
        interestRate: holdingForm.interestRate ? Number(holdingForm.interestRate) : undefined,
        startDate: holdingForm.startDate ? new Date(holdingForm.startDate).toISOString() : undefined,
        maturityDate: holdingForm.maturityDate ? new Date(holdingForm.maturityDate).toISOString() : undefined,
        maturityAmount: holdingForm.maturityAmount ? Number(holdingForm.maturityAmount) : undefined,
      };
    } else {
      payload = {
        type: holdingForm.type,
        name: holdingForm.name,
        symbol: holdingForm.symbol || undefined,
        quantity: Number(holdingForm.quantity),
        averageBuyPrice: Number(holdingForm.averageBuyPrice),
      };
    }

    const ok = await addHolding(payload);
    if (ok) {
      setHoldingForm({
        type: "STOCK",
        name: "",
        symbol: "",
        quantity: "",
        averageBuyPrice: "",
        principal: "",
        interestRate: "",
        startDate: "",
        maturityDate: "",
        maturityAmount: ""
      });
    }
    setSubmittingHolding(false);
  }

  const marketBadge = (() => {
    if (marketStatus.status.length === 0) return null;
    const anyLive = marketStatus.status.some((s) => s.status === "SUCCESS");
    const anyStale = marketStatus.status.some((s) => s.status === "STALE");
    if (anyLive) return { text: "● Live market data", cls: "text-signal-pos" };
    if (anyStale) return { text: "⚠ Using last known market price", cls: "text-horizon" };
    return { text: "○ Market data unavailable", cls: "text-ink-soft" };
  })();

  // Prepare allocation donut data
  const allocationData = portfolio?.summary?.allocation 
    ? Object.entries(portfolio.summary.allocation).map(([type, value], index) => {
        const pct = portfolio.summary.totalCurrent > 0 ? (Number(value) / Number(portfolio.summary.totalCurrent)) * 100 : 0;
        return {
          name: HOLDING_TYPES.find((t) => t.value === type)?.label || type,
          value: Number(value),
          percentage: pct,
          color: CHART_COLORS[index % CHART_COLORS.length],
        };
      })
    : [];

  const calculatedInvestedAmount = Number(holdingForm.quantity) && Number(holdingForm.averageBuyPrice)
    ? Number(holdingForm.quantity) * Number(holdingForm.averageBuyPrice)
    : 0;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <PageHeader
        title="Portfolio"
        description="Track your assets, allocation, performance, and deterministic portfolio insights."
      />
      <ErrorState message={error} onRetry={refetch} />

      {loading ? (
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-xl bg-ink/5" />
          <div className="h-24 animate-pulse rounded-xl bg-ink/5" />
          <div className="h-40 animate-pulse rounded-xl bg-ink/5" />
        </div>
      ) : !portfolio ? null : (
        <>
          <MarketTicker status={marketStatus.status} refreshSeconds={marketStatus.refreshSeconds} />
          {marketBadge && <p className={`mt-2 text-[11px] font-editorial font-semibold ${marketBadge.cls}`}>{marketBadge.text}</p>}

          {/* 4-card statistics header */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mt-6">
            <StatCard label="Total Invested" value={portfolio.summary.totalInvested} kind="currency" />
            <StatCard
              label="Current Value"
              value={portfolio.summary.totalCurrent}
              kind="currency"
              sub={portfolio.summary.unpricedCount > 0 ? "Includes unpriced holdings at invested value" : undefined}
            />
            <StatCard
              label="Total Profit/Loss"
              value={portfolio.summary.returns}
              kind="currency"
              valueClassName={portfolio.summary.returns >= 0 ? "text-signal-pos" : "text-signal-neg"}
            />
            <StatCard
              label="Overall Return"
              value={portfolio.summary.returnsPct}
              kind="percent"
              decimals={1}
              valueClassName={portfolio.summary.returnsPct >= 0 ? "text-signal-pos" : "text-signal-neg"}
            />
          </div>

          {portfolio.summary.unpricedCount > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-horizon/30 bg-horizon/8 px-4 py-3 font-editorial">
              <span className="mt-0.5 text-horizon text-sm font-bold">!</span>
              <p className="text-xs text-ink-soft">
                <span className="font-semibold text-ink">
                  {portfolio.summary.unpricedCount} holding{portfolio.summary.unpricedCount === 1 ? "" : "s"} worth{" "}
                  {fmt(portfolio.summary.unpricedInvested)} invested
                </span>{" "}
                has no current price available. They are shown at cost values and excluded from return totals.
              </p>
            </div>
          )}

          {/* Donut Chart and Insights Side-by-side Grid */}
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            {/* Allocation Donut Chart Card */}
            {allocationData.length > 0 ? (
              <Card className="flex flex-col sm:flex-row items-center justify-around gap-6">
                <div className="w-40 h-40 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => fmt(value)}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] uppercase text-ink-soft tracking-wider">Total Value</span>
                    <span className="font-figure text-xs font-semibold text-ink">{fmt(portfolio.summary.totalCurrent)}</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="flex-1 space-y-2.5 w-full">
                  <p className="text-[10px] uppercase tracking-wide text-ink-soft font-semibold">Asset Allocation</p>
                  <div className="space-y-1.5">
                    {allocationData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs font-editorial">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <div className="flex-grow flex justify-between">
                          <span className="text-ink-soft">{item.name}</span>
                          <span className="font-semibold text-ink font-figure">{item.percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="flex items-center justify-center h-48">
                <p className="text-xs text-ink-soft">No allocation data to display.</p>
              </Card>
            )}

            {/* Portfolio Insights Column */}
            {portfolio.insights && (
              <Card className="flex flex-col justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-soft mb-3.5 font-semibold">📊 Portfolio Insights</p>
                  <div className="space-y-3 text-xs leading-relaxed font-editorial">
                    {portfolio.insights.performance && (
                      <p className="text-ink">{portfolio.insights.performance}</p>
                    )}
                    {portfolio.insights.allocation && (
                      <p className="text-ink">{portfolio.insights.allocation}</p>
                    )}
                    {portfolio.insights.topProfit && (
                      <p className="text-ink">{portfolio.insights.topProfit}</p>
                    )}
                  </div>
                </div>
                {portfolio.insights.concentration && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-signal-neg/20 bg-signal-neg/5 px-3 py-2 text-xs text-signal-neg font-editorial">
                    <span className="font-bold text-xs mt-0.5">⚠️</span>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-[9px]">Concentration Warning</p>
                      <p className="text-ink-soft">{portfolio.insights.concentration}</p>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Area Performance Chart */}
          {portfolio.history && portfolio.history.length > 0 && (
            <Card className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold">Portfolio Value Over Time</p>
                  <p className="text-xl font-figure font-semibold text-ink mt-0.5">{fmt(portfolio.summary.totalCurrent)}</p>
                </div>
                <div className="text-right text-xs font-editorial">
                  <span className={`font-semibold ${portfolio.summary.returns >= 0 ? "text-signal-pos" : "text-signal-neg"}`}>
                    {portfolio.summary.returns >= 0 ? "+" : ""}{fmt(portfolio.summary.returns)} ({portfolio.summary.returnsPct.toFixed(2)}%)
                  </span>
                  <span className="block text-[10px] text-ink-soft">All-time performance</span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolio.history} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-horizon)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--color-horizon)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--color-ink-soft)" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="var(--color-ink-soft)" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                      dx={-10}
                    />
                    <Tooltip 
                      formatter={(value) => [fmt(value), "Value"]} 
                      contentStyle={tooltipStyle}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="var(--color-horizon)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Add Holding Form Card */}
          <Card className="mt-6">
            <p className="text-xs uppercase tracking-wide text-ink-soft mb-3 font-semibold">Add New Asset Holding</p>
            <form onSubmit={handleHoldingSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  id="holdingType"
                  label="Asset Type"
                  value={holdingForm.type}
                  onChange={(e) => setHoldingForm({ ...holdingForm, type: e.target.value })}
                >
                  {HOLDING_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                <Input
                  id="holdingName"
                  label="Asset Name"
                  placeholder="e.g. Reliance Industries, Bitcoin, Gold SBI, HDFC FD"
                  required
                  value={holdingForm.name}
                  onChange={(e) => setHoldingForm({ ...holdingForm, name: e.target.value })}
                />
              </div>

              {holdingForm.type !== "FIXED_DEPOSIT" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    id="holdingSymbol"
                    label="Symbol (optional for Gold/Mutual Funds)"
                    placeholder={holdingForm.type === "STOCK" ? "e.g. RELIANCE:NSE" : "e.g. BTC/USD"}
                    value={holdingForm.symbol}
                    onChange={(e) => setHoldingForm({ ...holdingForm, symbol: e.target.value })}
                  />
                  <Input
                    id="holdingQuantity"
                    label="Quantity / Units"
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    placeholder="e.g. 10 shares, 0.05 BTC"
                    required
                    value={holdingForm.quantity}
                    onChange={(e) => setHoldingForm({ ...holdingForm, quantity: e.target.value })}
                  />
                  <Input
                    id="holdingBuyPrice"
                    label="Average Buy Price (₹)"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. ₹2,450"
                    required
                    value={holdingForm.averageBuyPrice}
                    onChange={(e) => setHoldingForm({ ...holdingForm, averageBuyPrice: e.target.value })}
                  />
                  <div>
                    <span className="mb-1.5 block text-sm text-ink-soft">Invested Amount (Calculated)</span>
                    <div className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink-soft select-none font-figure">
                      {fmt(calculatedInvestedAmount)}
                    </div>
                  </div>
                </div>
              )}

              {holdingForm.type === "FIXED_DEPOSIT" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    id="fdPrincipal"
                    label="Principal (₹)"
                    type="number"
                    min="1"
                    required
                    value={holdingForm.principal}
                    onChange={(e) => setHoldingForm({ ...holdingForm, principal: e.target.value })}
                  />
                  <Input
                    id="fdRate"
                    label="Interest Rate (% p.a., optional)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={holdingForm.interestRate}
                    onChange={(e) => setHoldingForm({ ...holdingForm, interestRate: e.target.value })}
                  />
                  <Input
                    id="fdStart"
                    label="Start Date (optional)"
                    type="date"
                    value={holdingForm.startDate}
                    onChange={(e) => setHoldingForm({ ...holdingForm, startDate: e.target.value })}
                  />
                  <Input
                    id="fdMaturity"
                    label="Maturity Date (optional)"
                    type="date"
                    value={holdingForm.maturityDate}
                    onChange={(e) => setHoldingForm({ ...holdingForm, maturityDate: e.target.value })}
                  />
                  <Input
                    id="fdMaturityAmount"
                    label="Maturity Amount (₹, optional)"
                    type="number"
                    min="0"
                    value={holdingForm.maturityAmount}
                    onChange={(e) => setHoldingForm({ ...holdingForm, maturityAmount: e.target.value })}
                  />
                </div>
              )}

              <div className="pt-1">
                <Button
                  type="submit"
                  variant="accent"
                  disabled={submittingHolding}
                  className="w-full sm:w-auto font-screamer tracking-wide text-xs uppercase cursor-pointer"
                >
                  {submittingHolding ? "Adding…" : "Add Holding"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Holdings list */}
          {portfolio.holdings.length === 0 ? (
            <EmptyState className="mt-6" title="No holdings yet" description="Add your first investment using the form above." />
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {portfolio.holdings.map((h) => (
                <HoldingCard
                  key={h.id}
                  holding={h}
                  onAddTransaction={addPortfolioTransaction}
                  onUpdateManualPrice={updateManualPrice}
                  onDelete={deleteHolding}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
