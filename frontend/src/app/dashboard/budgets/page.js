"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card, Button, Input, Select, EmptyState, ErrorState, StatCard } from "@/components/ui";
import PeriodSelector from "@/components/PeriodSelector";
import { useFinance } from "@/context/FinanceContext";
import { api } from "@/lib/api";

export default function BudgetsPage() {
  const { categories, loading, error, refetch, addBudget, deleteBudget } = useFinance();

  const now = new Date();
  const [periodMode, setPeriodMode] = useState("monthly"); // "monthly" | "yearly"
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [periodBudgets, setPeriodBudgets] = useState([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState("");

  const [budgetForm, setBudgetForm] = useState({ categoryId: "", monthlyLimit: "" });
  const [submittingBudget, setSubmittingBudget] = useState(false);

  const fetchPeriodBudgets = useCallback(async (mode, m, y) => {
    setPeriodLoading(true);
    setPeriodError("");
    const query = mode === "yearly" ? `?period=yearly&year=${y}` : `?period=monthly&month=${m}&year=${y}`;
    try {
      const res = await api.budgets(query);
      setPeriodBudgets(res.budgets || []);
    } catch (err) {
      setPeriodError(err.message || "Failed to load budgets for selected period.");
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchPeriodBudgets(periodMode, selectedMonth, selectedYear);
    }
  }, [loading, periodMode, selectedMonth, selectedYear, fetchPeriodBudgets]);

  const expenseCategoriesOnly = categories.filter((category) => category.type === "EXPENSE");

  async function handleBudgetSubmit(e) {
    e.preventDefault();
    setSubmittingBudget(true);
    const ok = await addBudget({
      categoryId: Number(budgetForm.categoryId),
      monthlyLimit: Number(budgetForm.monthlyLimit),
      month: selectedMonth,
      year: selectedYear,
    });
    if (ok) {
      setBudgetForm({ categoryId: "", monthlyLimit: "" });
      await fetchPeriodBudgets(periodMode, selectedMonth, selectedYear);
    }
    setSubmittingBudget(false);
  }

  async function handleDeleteBudget(id) {
    await deleteBudget(id);
    await fetchPeriodBudgets(periodMode, selectedMonth, selectedYear);
  }

  // Yearly aggregation stats
  const totalAnnualBudgeted = periodBudgets.reduce((s, b) => s + Number(b.monthlyLimit), 0);
  const totalAnnualSpent = periodBudgets.reduce((s, b) => s + Number(b.spent), 0);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <PageHeader title="Budgets" description="Monthly limits, actual spend, and aggregate budget status per category." />
      <ErrorState message={error} onRetry={refetch} />

      <PeriodSelector
        periodMode={periodMode}
        setPeriodMode={setPeriodMode}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        allowAllTime={false}
        loading={periodLoading}
      />

      {periodError && (
        <div className="mb-4">
          <ErrorState message={periodError} onRetry={() => fetchPeriodBudgets(periodMode, selectedMonth, selectedYear)} />
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-xl bg-ink/5" />
          <div className="h-24 animate-pulse rounded-xl bg-ink/5" />
        </div>
      ) : (
        <>
          {/* Yearly summary cards */}
          {periodMode === "yearly" && (
            <div className="grid gap-4 sm:grid-cols-3 mb-6 font-editorial">
              <StatCard label="Total Budgeted (Year)" value={totalAnnualBudgeted} kind="currency" />
              <StatCard label="Total Spent (Year)" value={totalAnnualSpent} kind="currency" />
              <StatCard
                label="Overall Budget Status"
                value={totalAnnualBudgeted > 0 ? (totalAnnualSpent / totalAnnualBudgeted) * 100 : 0}
                kind="percent"
                decimals={1}
                valueClassName={totalAnnualSpent > totalAnnualBudgeted ? "text-signal-neg" : "text-signal-pos"}
              />
            </div>
          )}

          {/* Add budget form (for monthly allocation) */}
          <Card>
            <form onSubmit={handleBudgetSubmit} className="grid gap-3 sm:grid-cols-2">
              <Select
                id="budgetCategory"
                label="Category"
                required
                value={budgetForm.categoryId}
                onChange={(e) => setBudgetForm({ ...budgetForm, categoryId: e.target.value })}
              >
                <option value="" disabled>
                  Select category
                </option>
                {expenseCategoriesOnly.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>

              <Input
                id="budgetLimit"
                label={`Monthly Limit (₹) — ${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`}
                type="number"
                min="1"
                required
                value={budgetForm.monthlyLimit}
                onChange={(e) => setBudgetForm({ ...budgetForm, monthlyLimit: e.target.value })}
              />

              <div className="sm:col-span-2 pt-1">
                <Button
                  type="submit"
                  variant="accent"
                  disabled={submittingBudget}
                  className="w-full sm:w-auto font-screamer tracking-wide text-sm uppercase cursor-pointer"
                >
                  {submittingBudget ? "Allocating…" : `Set Budget Limit for ${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`}
                </Button>
              </div>
            </form>
          </Card>

          {/* Budget List */}
          <div className={`mt-6 space-y-4 transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
            {periodBudgets.length === 0 ? (
              <EmptyState
                title={periodMode === "yearly" ? `No budgets set for ${selectedYear}` : `No budgets set for ${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`}
                description="Use the form above to cap spend for a category."
              />
            ) : (
              periodBudgets.map((b) => (
                <Card key={b.id} className="relative overflow-hidden">
                  <div className="flex justify-between items-center text-sm font-editorial">
                    <div>
                      <span className="font-semibold text-ink">{b.category?.name || "Category"}</span>
                      {periodMode === "yearly" && (
                        <span className="ml-2 text-xs text-ink-soft font-normal">
                          ({MONTH_OPTIONS.find((m) => m.value === b.month)?.label} {b.year})
                        </span>
                      )}
                      <span
                        className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          b.status === "EXCEEDED" ? "bg-signal-neg/15 text-signal-neg" : "bg-signal-pos/15 text-signal-pos"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-figure text-ink-soft text-xs">
                        ₹{Math.round(b.spent)} / ₹{Math.round(b.monthlyLimit)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteBudget(b.id)}
                        className="text-xs text-signal-neg hover:underline font-editorial cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] font-editorial text-ink-soft">
                    <span>Remaining: ₹{Math.round(b.monthlyLimit - b.spent).toLocaleString("en-IN")}</span>
                    <span>{Math.round(b.percentUsed)}% used</span>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full ${b.status === "EXCEEDED" ? "bg-signal-neg" : "bg-signal-pos"}`}
                      style={{ width: `${Math.min(100, b.percentUsed)}%`, transition: "width 0.4s ease" }}
                    />
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
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
