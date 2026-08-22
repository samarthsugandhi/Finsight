"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { PageHeader, Card, ErrorState, EmptyState } from "@/components/ui";
import PeriodSelector, { MONTH_OPTIONS } from "@/components/PeriodSelector";
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

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    categoryName: transaction.category?.name || transaction.Category?.name || "Uncategorized",
  };
}

export default function AnalyticsPage() {
  const { portfolio, loading: initialLoading, error, refetch } = useFinance();

  const now = new Date();
  const [periodMode, setPeriodMode] = useState("monthly"); // "monthly" | "yearly" | "all_time"
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [periodTransactions, setPeriodTransactions] = useState([]);
  const [periodBudgets, setPeriodBudgets] = useState([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState("");

  const [chartType, setChartType] = useState("pie");
  const [dataType, setDataType] = useState("EXPENSE");

  const fetchPeriodData = useCallback(async (mode, m, y) => {
    setPeriodLoading(true);
    setPeriodError("");
    let txQuery = "";
    let budgetQuery = "";
    if (mode === "monthly") {
      txQuery = `?period=monthly&month=${m}&year=${y}`;
      budgetQuery = `?period=monthly&month=${m}&year=${y}`;
    } else if (mode === "yearly") {
      txQuery = `?period=yearly&year=${y}`;
      budgetQuery = `?period=yearly&year=${y}`;
    } else {
      txQuery = `?period=all_time`;
      budgetQuery = `?period=yearly&year=${y}`;
    }

    try {
      const [txRes, budgetRes] = await Promise.all([
        api.transactions(txQuery),
        api.budgets(budgetQuery),
      ]);
      setPeriodTransactions((txRes.transactions || []).map(normalizeTransaction));
      setPeriodBudgets(budgetRes.budgets || []);
    } catch (err) {
      setPeriodError(err.message || "Failed to load analytics data for selected period.");
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      fetchPeriodData(periodMode, selectedMonth, selectedYear);
    }
  }, [initialLoading, periodMode, selectedMonth, selectedYear, fetchPeriodData]);

  if (initialLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <PageHeader title="Analytics" description="Income, expense, and savings trends; category breakdowns; cash flow." />
        <div className="space-y-4">
          <div className="h-80 animate-pulse rounded-xl bg-ink/5" />
          <div className="h-64 animate-pulse rounded-xl bg-ink/5" />
        </div>
      </div>
    );
  }

  // Category-wise spending/income for selected period
  const categoryMap = {};
  periodTransactions.forEach((tx) => {
    if (tx.type !== dataType) return;
    categoryMap[tx.categoryName] = (categoryMap[tx.categoryName] || 0) + Number(tx.amount);
  });
  const categoryChartData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  // Cash Flow trend
  const monthlyMap = {};
  periodTransactions.forEach((tx) => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, expense: 0 };
    if (tx.type === "INCOME") monthlyMap[key].income += Number(tx.amount);
    else monthlyMap[key].expense += Number(tx.amount);
  });
  const monthlyTrend = Object.values(monthlyMap)
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map((m) => ({
      ...m,
      label: new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      savings: m.income - m.expense,
    }));

  const allocationEntries = Object.entries(portfolio?.summary?.allocation || {});

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <PageHeader title="Analytics" description="Income, expense, and savings trends; category breakdowns; cash flow." />
      <ErrorState message={error} onRetry={refetch} />

      <PeriodSelector
        periodMode={periodMode}
        setPeriodMode={setPeriodMode}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        allowAllTime={true}
        loading={periodLoading}
      />

      {periodError && (
        <div className="mb-4">
          <ErrorState message={periodError} onRetry={() => fetchPeriodData(periodMode, selectedMonth, selectedYear)} />
        </div>
      )}

      {/* Category-wise spending */}
      <Card className={`bg-paper-raised/90 shadow-lg border border-line/60 overflow-hidden transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-line pb-4 mb-6">
          <div>
            <h2 className="font-screamer text-xl tracking-wider text-ink uppercase leading-none">Category Breakdown</h2>
            <p className="font-editorial text-xs text-ink-soft mt-1">
              Distribution for {periodMode === "monthly" ? `${MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label} ${selectedYear}` : periodMode === "yearly" ? `Year ${selectedYear}` : "All Time"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex rounded-lg bg-paper p-1 border border-line">
              {["EXPENSE", "INCOME"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDataType(type)}
                  className={`relative px-4 py-1.5 text-xs font-semibold uppercase rounded-md cursor-pointer transition-colors duration-200 ${
                    dataType === type ? "text-ink" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {type === "EXPENSE" ? "Expenses" : "Income"}
                </button>
              ))}
            </div>
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
                  {type === "pie" ? "Pie Chart" : "Bar Graph"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {categoryChartData.length === 0 ? (
          <EmptyState title={`No ${dataType === "EXPENSE" ? "expenses" : "income"} recorded for this period`} />
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "pie" ? (
                <PieChart>
                  <Pie data={categoryChartData} cx="50%" cy="45%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value" nameKey="name">
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={currencyFormatter} contentStyle={tooltipStyle} />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: "12px", fontFamily: "var(--font-body)", paddingTop: "10px" }} />
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

      {/* Cash Flow Trend */}
      <Card className={`mt-8 transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
        <h2 className="font-screamer text-xl tracking-wider text-ink uppercase leading-none mb-1">Cash Flow Trend</h2>
        <p className="font-editorial text-xs text-ink-soft mb-6">
          Income, expense, and savings trends for {periodMode === "monthly" ? `${MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label} ${selectedYear}` : periodMode === "yearly" ? `Year ${selectedYear}` : "All Time"}.
        </p>
        {monthlyTrend.length === 0 ? (
          <EmptyState
            title="No cash flow entries for this period"
            description="Add transactions or select a different period to see trends."
          />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" opacity={0.4} />
                <XAxis dataKey="label" stroke="var(--color-ink-soft)" fontSize={11} fontFamily="var(--font-body)" />
                <YAxis stroke="var(--color-ink-soft)" fontSize={11} fontFamily="var(--font-body)" tickFormatter={(value) => `₹${value}`} />
                <Tooltip formatter={currencyFormatter} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "var(--font-body)" }} />
                <Line type="monotone" dataKey="income" stroke="#10d98a" strokeWidth={2} dot={false} name="Income" />
                <Line type="monotone" dataKey="expense" stroke="#f87171" strokeWidth={2} dot={false} name="Expense" />
                <Line type="monotone" dataKey="savings" stroke="#d6ff62" strokeWidth={2} dot={false} name="Savings" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className={`mt-8 grid gap-8 lg:grid-cols-2 transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
        {/* Budget utilization */}
        <div>
          <h2 className="font-screamer text-xl tracking-wider text-ink uppercase leading-none mb-4">Budget Utilization</h2>
          {periodBudgets.length === 0 ? (
            <EmptyState title="No budgets for this period" description="Set budgets to see utilization here." />
          ) : (
            <Card className="space-y-4">
              {periodBudgets.map((b) => (
                <div key={b.id}>
                  <div className="flex justify-between text-xs font-editorial">
                    <span className="text-ink-soft">
                      {b.category?.name || "Category"}
                      {periodMode === "yearly" && (
                        <span className="ml-1 text-[10px] text-ink-soft/70">
                          ({MONTH_OPTIONS.find((m) => m.value === b.month)?.label})
                        </span>
                      )}
                    </span>
                    <span className="font-figure text-ink font-medium">{Math.round(b.percentUsed)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full ${b.status === "EXCEEDED" ? "bg-signal-neg" : "bg-signal-pos"}`}
                      style={{ width: `${Math.min(100, b.percentUsed)}%` }}
                    />
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Portfolio analytics */}
        <div>
          <h2 className="font-screamer text-xl tracking-wider text-ink uppercase leading-none mb-4">Portfolio Allocation</h2>
          {allocationEntries.length === 0 ? (
            <EmptyState title="No holdings yet" description="Add holdings on the Portfolio page to see allocation here." />
          ) : (
            <Card className="space-y-4">
              {allocationEntries.map(([type, value]) => {
                const pct =
                  Number(portfolio?.summary?.totalCurrent || 0) > 0 ? (Number(value) / Number(portfolio.summary.totalCurrent)) * 100 : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs font-editorial">
                      <span className="text-ink-soft">{type.replace(/_/g, " ")}</span>
                      <span className="font-figure text-ink font-medium">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-horizon" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
