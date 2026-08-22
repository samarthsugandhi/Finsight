"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card, ErrorState, EmptyState } from "@/components/ui";
import PeriodSelector, { MONTH_OPTIONS } from "@/components/PeriodSelector";
import { useFinance } from "@/context/FinanceContext";
import { api } from "@/lib/api";

function fmt(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n) || 0);
}

export default function ReportsPage() {
  const { goals, portfolio, loading: initialLoading, error, refetch } = useFinance();

  const now = new Date();
  const [periodMode, setPeriodMode] = useState("monthly"); // "monthly" | "yearly" | "all_time"
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [periodSummary, setPeriodSummary] = useState(null);
  const [periodHealth, setPeriodHealth] = useState(null);
  const [periodBudgets, setPeriodBudgets] = useState([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState("");

  const fetchPeriodReport = useCallback(async (mode, m, y) => {
    setPeriodLoading(true);
    setPeriodError("");
    let query = "";
    let budgetQuery = "";
    if (mode === "monthly") {
      query = `?period=monthly&month=${m}&year=${y}`;
      budgetQuery = `?period=monthly&month=${m}&year=${y}`;
    } else if (mode === "yearly") {
      query = `?period=yearly&year=${y}`;
      budgetQuery = `?period=yearly&year=${y}`;
    } else {
      query = `?period=all_time`;
      budgetQuery = `?period=yearly&year=${y}`;
    }

    try {
      const [sumRes, healthRes, budgetRes] = await Promise.all([
        api.summary(query),
        api.healthScore(query),
        api.budgets(budgetQuery),
      ]);
      setPeriodSummary(sumRes);
      setPeriodHealth(healthRes);
      setPeriodBudgets(budgetRes.budgets || []);
    } catch (err) {
      setPeriodError(err.message || "Failed to load report data for selected period.");
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      fetchPeriodReport(periodMode, selectedMonth, selectedYear);
    }
  }, [initialLoading, periodMode, selectedMonth, selectedYear, fetchPeriodReport]);

  const periodLabel = periodMode === "monthly"
    ? `${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`
    : periodMode === "yearly"
    ? `Year ${selectedYear}`
    : "All Time";

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <PageHeader
        title="Reports"
        description={`On-screen summary for ${periodLabel}, across income, expenses, budgets, goals, and portfolio.`}
      />
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
          <ErrorState message={periodError} onRetry={() => fetchPeriodReport(periodMode, selectedMonth, selectedYear)} />
        </div>
      )}

      {initialLoading ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-xl bg-ink/5" />
          <div className="h-40 animate-pulse rounded-xl bg-ink/5" />
        </div>
      ) : !periodSummary || !periodHealth || !portfolio ? null : (
        <div className={`space-y-8 transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
          <Card>
            <h2 className="font-screamer text-lg uppercase tracking-wide text-ink mb-4">
              Financial Summary ({periodLabel})
            </h2>
            <div className="grid gap-4 sm:grid-cols-4 text-sm font-editorial">
              <div>
                <p className="text-xs uppercase text-ink-soft">Income</p>
                <p className="font-figure text-ink font-semibold mt-1">{fmt(periodSummary.income)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-soft">Expenses</p>
                <p className="font-figure text-ink font-semibold mt-1">{fmt(periodSummary.expense)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-soft">Savings</p>
                <p className="font-figure text-ink font-semibold mt-1">{fmt(periodSummary.savings)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-ink-soft">Financial Health</p>
                <p className="font-figure text-ink font-semibold mt-1">{Math.round(periodHealth.score)} / 100</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-screamer text-lg uppercase tracking-wide text-ink mb-4">
              Budget Summary ({periodLabel})
            </h2>
            {periodBudgets.length === 0 ? (
              <EmptyState title={`No budgets set for ${periodLabel}`} />
            ) : (
              <ul className="divide-y divide-line font-editorial text-sm">
                {periodBudgets.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="text-ink font-medium">{b.category?.name || "Category"}</span>
                      {periodMode === "yearly" && (
                        <span className="ml-2 text-xs text-ink-soft font-normal">
                          ({MONTH_OPTIONS.find((m) => m.value === b.month)?.label})
                        </span>
                      )}
                    </div>
                    <span className="text-ink-soft text-xs">
                      {fmt(b.spent)} / {fmt(b.monthlyLimit)} ·{" "}
                      <span className={b.status === "EXCEEDED" ? "text-signal-neg font-semibold" : "text-signal-pos font-semibold"}>
                        {b.status}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-screamer text-lg uppercase tracking-wide text-ink mb-4">Goals Progress</h2>
            {goals.length === 0 ? (
              <EmptyState title="No goals yet" />
            ) : (
              <ul className="divide-y divide-line font-editorial text-sm">
                {goals.map((g) => (
                  <li key={g.id} className="flex items-center justify-between py-2.5">
                    <span className="text-ink">{g.title}</span>
                    <span className="text-ink-soft text-xs">
                      {fmt(g.contributed)} / {fmt(g.targetAmount)} · {g.progressPct.toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-screamer text-lg uppercase tracking-wide text-ink mb-4">Portfolio Summary</h2>
            {portfolio.holdings.length === 0 ? (
              <EmptyState title="No holdings yet" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-3 text-sm font-editorial">
                <div>
                  <p className="text-xs uppercase text-ink-soft">Invested</p>
                  <p className="font-figure text-ink font-semibold mt-1">{fmt(portfolio.summary.totalInvested)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-ink-soft">Current Value</p>
                  <p className="font-figure text-ink font-semibold mt-1">{fmt(portfolio.summary.totalCurrent)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-ink-soft">Returns</p>
                  <p className={`font-figure font-semibold mt-1 ${portfolio.summary.returns >= 0 ? "text-signal-pos" : "text-signal-neg"}`}>
                    {fmt(portfolio.summary.returns)} ({portfolio.summary.returnsPct.toFixed(1)}%)
                  </p>
                </div>
              </div>
            )}
          </Card>

          <p className="text-xs text-ink-soft font-editorial italic">
            PDF export isn't implemented yet — this report is on-screen only for now.
          </p>
        </div>
      )}
    </div>
  );
}
