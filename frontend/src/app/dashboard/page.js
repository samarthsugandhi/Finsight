"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { AnimatedLedgerValue, Button, Card, EmptyState, ErrorState, StatCard } from "@/components/ui";
import { HealthGauge, HealthBreakdown } from "@/components/HealthScoreDisplay";
import { useFinance } from "@/context/FinanceContext";
import { api } from "@/lib/api";
import { CHART_COLORS } from "@/lib/chartColors";

const currencyFormatter = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const tooltipStyle = {
  backgroundColor: "var(--color-paper-raised)",
  borderColor: "var(--color-line)",
  borderRadius: "8px",
  color: "var(--color-ink)",
  fontFamily: "var(--font-body)",
  fontSize: "12px",
};

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const YEAR_OPTIONS = [2024, 2025, 2026, 2027];

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    categoryName: transaction.category?.name || transaction.Category?.name || "Uncategorized",
  };
}

function ViewAllLink({ href }) {
  return (
    <Link href={href} className="text-xs text-horizon hover:underline font-editorial font-semibold shrink-0">
      View All →
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="h-14 animate-pulse rounded-xl bg-ink/8 mb-6" />
      <div className="grid gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Card key={index}>
            <div className="h-3 w-24 animate-pulse rounded-md bg-ink/8" />
            <div className="mt-4 h-8 w-32 animate-pulse rounded-md bg-ink/8" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded-md bg-ink/8" />
          </Card>
        ))}
      </div>
      <div className="horizon-rule my-10" />
      <div className="h-80 animate-pulse rounded-xl bg-ink/8" />
    </div>
  );
}

export default function DashboardPage() {
  const store = useFinance();
  const { summary, health, transactions, portfolio, loading, error, refetch } = store;

  const now = new Date();
  const [periodMode, setPeriodMode] = useState("monthly"); // "monthly" | "yearly" | "all_time"
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [periodSummary, setPeriodSummary] = useState(null);
  const [periodHealth, setPeriodHealth] = useState(null);
  const [periodTransactions, setPeriodTransactions] = useState([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState("");

  const [chartType, setChartType] = useState("pie");

  // PDF import — existing feature
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfPreviewTransactions, setPdfPreviewTransactions] = useState(null);

  const fetchPeriodData = useCallback(async (mode, m, y) => {
    setPeriodLoading(true);
    setPeriodError("");
    let query = "";
    if (mode === "monthly") {
      query = `?period=monthly&month=${m}&year=${y}`;
    } else if (mode === "yearly") {
      query = `?period=yearly&year=${y}`;
    } else if (mode === "all_time") {
      query = `?period=all_time`;
    }

    try {
      const [sumRes, healthRes, txRes] = await Promise.all([
        api.summary(query),
        api.healthScore(query),
        api.transactions(query),
      ]);
      setPeriodSummary(sumRes);
      setPeriodHealth(healthRes);
      setPeriodTransactions(txRes.transactions.map(normalizeTransaction));
    } catch (err) {
      setPeriodError(err.message || "Failed to load data for selected period.");
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && summary) {
      fetchPeriodData(periodMode, selectedMonth, selectedYear);
    }
  }, [loading, summary, periodMode, selectedMonth, selectedYear, fetchPeriodData]);

  if (loading) return <DashboardSkeleton />;

  if (!summary || !health || !portfolio) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <ErrorState
          message={error || "Couldn't load your dashboard data. This usually means the backend isn't reachable."}
          onRetry={refetch}
        />
      </div>
    );
  }

  const activeSummary = periodSummary || summary;
  const activeHealth = periodHealth || health;
  const activeTransactions = periodTransactions;

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.parseStatement(formData);
      setPdfPreviewTransactions(res.transactions.map((tx, idx) => ({ ...tx, id: idx, checked: true })));
    } catch (requestError) {
      store.setError(requestError.message);
    } finally {
      setPdfLoading(false);
    }
  }

  function handleTogglePreviewChecked(id) {
    setPdfPreviewTransactions((current) => current.map((tx) => (tx.id === id ? { ...tx, checked: !tx.checked } : tx)));
  }

  function handleUpdatePreviewCategory(id, newCat) {
    setPdfPreviewTransactions((current) => current.map((tx) => (tx.id === id ? { ...tx, category: newCat } : tx)));
  }

  async function handleImportStatement() {
    if (!pdfPreviewTransactions) return;
    const checkedTransactions = pdfPreviewTransactions
      .filter((tx) => tx.checked)
      .map((tx) => ({ date: tx.date, description: tx.description, type: tx.type, amount: Number(tx.amount), category: tx.category }));
    if (checkedTransactions.length === 0) return;
    setPdfLoading(true);
    try {
      await api.importStatement({ transactions: checkedTransactions });
      setPdfPreviewTransactions(null);
      setShowPdfUpload(false);
      await refetch();
      await fetchPeriodData(periodMode, selectedMonth, selectedYear);
    } catch (requestError) {
      store.setError(requestError.message);
    } finally {
      setPdfLoading(false);
    }
  }

  const netWorth = Number(activeSummary.savings) + Number(portfolio.summary.totalCurrent);

  const expenseByCategory = activeSummary.byCategory || {};
  const categoryChartData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value: Number(value) }));

  const recentTransactions = [...activeTransactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <ErrorState message={error} onRetry={refetch} />

      {/* Period Selector Header Controls */}
      <Card className="mb-6 bg-paper-raised/90 border border-line/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Period:</span>
            <div className="flex items-center rounded-lg bg-paper p-1 border border-line">
              {[
                { id: "monthly", label: "Monthly" },
                { id: "yearly", label: "Yearly" },
                { id: "all_time", label: "All Time" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriodMode(item.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors duration-200 ${
                    periodMode === item.id
                      ? "bg-horizon text-[#0f1b33] shadow-sm font-bold"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {periodMode === "monthly" && (
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink font-editorial focus:outline-none focus:border-horizon cursor-pointer"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink font-editorial focus:outline-none focus:border-horizon cursor-pointer"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodMode === "yearly" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-soft font-editorial">Select Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink font-editorial focus:outline-none focus:border-horizon cursor-pointer"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodMode === "all_time" && (
            <span className="text-xs text-ink-soft font-editorial italic">
              Showing all recorded transactions across all dates
            </span>
          )}

          {periodLoading && (
            <span className="text-xs text-horizon font-editorial animate-pulse flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-horizon animate-ping" />
              Updating data…
            </span>
          )}
        </div>
      </Card>

      {periodError && (
        <div className="mb-4">
          <ErrorState message={periodError} onRetry={() => fetchPeriodData(periodMode, selectedMonth, selectedYear)} />
        </div>
      )}

      {/* Top-line totals for selected period */}
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
        <StatCard label="Total Income" value={activeSummary.income} kind="currency" />
        <StatCard label="Total Expenses" value={activeSummary.expense} kind="currency" />
        <StatCard
          label="Total Savings"
          value={activeSummary.savings}
          kind="currency"
          subValue={activeSummary.savingsRate * 100}
          subKind="percent"
          subDecimals={1}
          subSuffix=" savings rate"
        />
        <StatCard label="Net Worth" value={netWorth} kind="currency" sub="Savings + portfolio current value" />
        <StatCard label="Financial Health" value={activeHealth.score} kind="score" suffix=" / 100" accent />
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink-soft">Cash Flow</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-figure text-sm text-signal-pos font-semibold">
              +<AnimatedLedgerValue value={Number(activeSummary.income)} kind="currency" />
            </span>
            <span className="text-ink-soft text-xs">−</span>
            <span className="font-figure text-sm text-signal-neg font-semibold">
              <AnimatedLedgerValue value={Number(activeSummary.expense)} kind="currency" />
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">Net: {currencyFormatter(activeSummary.savings)}</p>
        </Card>
      </div>

      {/* Spending by category */}
      <Card className={`mt-8 bg-paper-raised/90 shadow-lg border border-line/60 overflow-hidden transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-line pb-4 mb-6">
          <div>
            <h2 className="font-screamer text-xl tracking-wider text-ink uppercase leading-none">Spending by Category</h2>
            <p className="font-editorial text-xs text-ink-soft mt-1">
              Expense distribution for {periodMode === "monthly" ? `${MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label} ${selectedYear}` : periodMode === "yearly" ? `Year ${selectedYear}` : "All Time"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex rounded-lg bg-paper p-1 border border-line">
              {["pie", "bar"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChartType(type)}
                  className={`relative px-4 py-1.5 text-xs font-semibold uppercase rounded-md cursor-pointer transition-colors duration-200 ${
                    chartType === type ? "text-ink" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {type === "pie" ? "Pie" : "Bar"}
                </button>
              ))}
            </div>
            <ViewAllLink href="/dashboard/analytics" />
          </div>
        </div>

        {categoryChartData.length === 0 ? (
          <EmptyState title="No expenses recorded for this period" description="Try selecting a different period or month." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "pie" ? (
                <PieChart>
                  <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" nameKey="name">
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={currencyFormatter} contentStyle={tooltipStyle} />
                </PieChart>
              ) : (
                <BarChart data={categoryChartData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" opacity={0.4} />
                  <XAxis dataKey="name" stroke="var(--color-ink-soft)" fontSize={11} fontFamily="var(--font-body)" />
                  <YAxis stroke="var(--color-ink-soft)" fontSize={11} fontFamily="var(--font-body)" tickFormatter={(value) => `₹${value}`} />
                  <Tooltip formatter={currencyFormatter} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="horizon-rule my-10" />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-8">
          {/* Recent transactions */}
          <div>
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-screamer text-2xl tracking-wide uppercase text-ink">
                {periodMode === "monthly" ? "Period Transactions" : "Recent Transactions"}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPdfUpload(!showPdfUpload)}
                  className="text-xs text-horizon hover:underline font-editorial cursor-pointer"
                >
                  {showPdfUpload ? "Hide PDF Ingest" : "Import PDF Statement"}
                </button>
                <ViewAllLink href="/dashboard/transactions" />
              </div>
            </div>

            {showPdfUpload && (
              <Card className="mt-4 font-editorial">
                <p className="text-xs text-ink-soft mb-2">Upload a bank/credit card PDF statement to extract transactions.</p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  disabled={pdfLoading}
                  className="text-xs text-ink file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-horizon file:text-[#0f1b33] cursor-pointer"
                />
                {pdfLoading && <p className="text-xs text-horizon mt-2 animate-pulse">Extracting transactions with PDF parser…</p>}
              </Card>
            )}

            {recentTransactions.length === 0 ? (
              <EmptyState className="mt-4" title="No transactions found" description="No transactions recorded for the selected period." />
            ) : (
              <Card className="mt-4 p-0 divide-y divide-line/45 overflow-hidden font-editorial">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-paper/40 transition-colors">
                    <div>
                      <p className="font-semibold text-ink text-sm">{tx.description}</p>
                      <p className="text-[11px] text-ink-soft mt-0.5">
                        {tx.categoryName} · {new Date(tx.date).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <span className={`font-figure font-bold text-sm ${tx.type === "INCOME" ? "text-signal-pos" : "text-signal-neg"}`}>
                      {tx.type === "INCOME" ? "+" : "−"}{currencyFormatter(tx.amount)}
                    </span>
                  </div>
                ))}
              </Card>
            )}
          </div>

          {/* Financial Health Gauge and Breakdown */}
          <div>
            <h2 className="font-screamer text-2xl tracking-wide uppercase text-ink mb-4">Financial Health Score</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <HealthGauge score={activeHealth?.score || 0} />
              <HealthBreakdown health={activeHealth} />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Portfolio overview */}
          <div>
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-screamer text-2xl tracking-wide uppercase text-ink">Portfolio</h2>
              <ViewAllLink href="/dashboard/portfolio" />
            </div>
            {portfolio.holdings.length === 0 ? (
              <EmptyState className="mt-4" title="No holdings yet" description="Add one from the Portfolio page." />
            ) : (
              <Card className="mt-4 space-y-3 font-editorial">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft font-medium">Invested</span>
                  <span className="font-figure font-bold">₹{Number(portfolio.summary.totalInvested).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft font-medium">Current value</span>
                  <span className="font-figure font-bold">₹{Number(portfolio.summary.totalCurrent).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft font-medium">Returns</span>
                  <span className={`font-figure font-bold ${portfolio.summary.returns >= 0 ? "text-signal-pos" : "text-signal-neg"}`}>
                    {portfolio.summary.returns >= 0 ? "+" : ""}
                    ₹{Number(portfolio.summary.returns).toLocaleString("en-IN")} ({portfolio.summary.returnsPct.toFixed(1)}%)
                  </span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* PDF Statement Preview Confirm Modal */}
      {pdfPreviewTransactions && (
        <div className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-sm flex items-center justify-center p-6 font-editorial">
          <div className="bg-paper-raised border border-line rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-paper">
              <div>
                <h2 className="font-screamer text-2xl text-ink leading-none uppercase">Confirm Statement Transactions</h2>
                <p className="text-xs text-ink-soft mt-1">Review dates, adjust categories, and select items to import</p>
              </div>
              <button onClick={() => setPdfPreviewTransactions(null)} className="text-sm text-ink-soft hover:text-ink cursor-pointer">
                Cancel
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-paper-raised">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line text-ink-soft uppercase text-[9px] tracking-wider">
                    <th className="py-2.5 w-12 text-center">Import</th>
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Description</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/45">
                  {pdfPreviewTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-paper/10 transition-colors">
                      <td className="py-3 text-center">
                        <input type="checkbox" checked={tx.checked} onChange={() => handleTogglePreviewChecked(tx.id)} className="cursor-pointer" />
                      </td>
                      <td className="py-3 text-ink-soft">{new Date(tx.date).toLocaleDateString("en-IN")}</td>
                      <td className="py-3 font-semibold text-ink">{tx.description}</td>
                      <td className={`py-3 font-bold ${tx.type === "INCOME" ? "text-signal-pos" : "text-signal-neg"}`}>{tx.type}</td>
                      <td className="py-3">
                        <select
                          value={tx.category}
                          onChange={(e) => handleUpdatePreviewCategory(tx.id, e.target.value)}
                          className="bg-paper border border-line rounded px-2 py-1 text-ink text-[11px] focus-visible:outline-none"
                        >
                          {store.categories.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-right font-figure font-bold text-ink">₹{tx.amount.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-line bg-paper flex items-center justify-between">
              <p className="text-xs text-ink-soft">
                Selected: {pdfPreviewTransactions.filter((t) => t.checked).length} of {pdfPreviewTransactions.length} items
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setPdfPreviewTransactions(null)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="button" variant="accent" onClick={handleImportStatement} className="cursor-pointer">
                  Import Selected
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
