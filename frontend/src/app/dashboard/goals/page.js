"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Input, EmptyState, ErrorState } from "@/components/ui";
import { useFinance } from "@/context/FinanceContext";
import { api } from "@/lib/api";

function fmt(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function ContributionHistory({ goalId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contributions, setContributions] = useState(null);

  async function handleToggle() {
    if (!open && contributions === null) {
      setLoading(true);
      try {
        const res = await api.goalContributions(goalId);
        setContributions(res.contributions);
      } finally {
        setLoading(false);
      }
    }
    setOpen(!open);
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={handleToggle} className="text-[11px] text-ink-soft hover:text-horizon underline cursor-pointer font-editorial">
        {open ? "Hide history" : "View allocation history"}
      </button>
      {open && (
        <div className="mt-2 rounded-md border border-line/60 bg-paper p-2.5">
          {loading ? (
            <p className="text-[11px] text-ink-soft font-editorial">Loading…</p>
          ) : contributions.length === 0 ? (
            <p className="text-[11px] text-ink-soft font-editorial">No allocations yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {contributions.map((c) => (
                <li key={c.id} className="flex justify-between text-[11px] font-editorial">
                  <span className="text-ink-soft">
                    {new Date(c.date).toLocaleDateString("en-IN")}
                    {c.note ? ` · ${c.note}` : ""}
                  </span>
                  <span className="font-figure text-ink font-medium">{fmt(c.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const { goals, availableSavings, loading, error, refetch, addGoal, updateGoal, allocateSavings, deleteGoal } =
    useFinance();

  const [goalForm, setGoalForm] = useState({ title: "", targetAmount: "", targetDate: "", isEmergencyFund: false });
  const [editingGoal, setEditingGoal] = useState(null);
  const [submittingGoal, setSubmittingGoal] = useState(false);

  const [allocating, setAllocating] = useState(false);
  const [allocationInputs, setAllocationInputs] = useState({});
  const [submittingAllocation, setSubmittingAllocation] = useState(false);

  function resetGoalForm() {
    setEditingGoal(null);
    setGoalForm({ title: "", targetAmount: "", targetDate: "", isEmergencyFund: false });
  }

  async function handleGoalSubmit(e) {
    e.preventDefault();
    setSubmittingGoal(true);
    const datePayload = goalForm.targetDate ? new Date(goalForm.targetDate).toISOString() : null;
    const payload = {
      title: goalForm.title,
      targetAmount: Number(goalForm.targetAmount),
      targetDate: editingGoal ? datePayload : datePayload || undefined,
      isEmergencyFund: goalForm.isEmergencyFund,
    };
    const ok = editingGoal ? await updateGoal(editingGoal.id, payload) : await addGoal(payload);
    if (ok) resetGoalForm();
    setSubmittingGoal(false);
  }

  function handleStartEditGoal(g) {
    setEditingGoal(g);
    setGoalForm({
      title: g.title,
      targetAmount: String(g.targetAmount),
      targetDate: g.targetDate ? g.targetDate.split("T")[0] : "",
      isEmergencyFund: Boolean(g.isEmergencyFund),
    });
  }

  // --- Allocation panel ---
  const totalAllocating = Object.values(allocationInputs).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const availableNum = availableSavings ? Number(availableSavings.availableSavings) : 0;
  const remainingAfterAllocation = availableNum - totalAllocating;
  const overAllocated = totalAllocating > availableNum;

  function handleOpenAllocate() {
    setAllocationInputs({});
    setAllocating(true);
  }

  async function handleConfirmAllocation() {
    const allocations = Object.entries(allocationInputs)
      .map(([goalId, amount]) => ({ goalId: Number(goalId), amount: Number(amount) }))
      .filter((a) => a.amount > 0);
    if (allocations.length === 0 || overAllocated) return;

    setSubmittingAllocation(true);
    const ok = await allocateSavings(allocations);
    if (ok) {
      setAllocating(false);
      setAllocationInputs({});
    }
    setSubmittingAllocation(false);
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <PageHeader
        title="Savings Goals"
        description="Savings come from your actual transactions (income − expenses). Allocate what's unallocated to whichever goal needs it."
      />
      <ErrorState message={error} onRetry={refetch} />

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-ink/5" />
          <div className="h-40 animate-pulse rounded-xl bg-ink/5" />
          <div className="h-24 animate-pulse rounded-xl bg-ink/5" />
        </div>
      ) : !availableSavings ? null : (
        <>
          {availableSavings.hasShortfall && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-signal-neg/30 bg-signal-neg/8 px-4 py-3 font-editorial">
              <span className="mt-0.5 text-signal-neg text-sm font-bold">!</span>
              <div>
                <p className="text-sm font-semibold text-signal-neg">
                  Your current savings are {fmt(availableSavings.shortfallAmount)} below your goal allocations.
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  This usually happens when an expense is added after money was already allocated to a goal. Your
                  goal contributions haven't been changed — nothing was reversed or moved automatically. Review your
                  goals below and decide whether to adjust anything yourself.
                </p>
              </div>
            </div>
          )}

          {/* Available Savings */}
          <Card className="bg-horizon/8 border-horizon/25">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-soft font-editorial">Available Savings</p>
                <p className="font-figure text-3xl font-bold text-ink mt-1">{fmt(availableSavings.availableSavings)}</p>
                <p className="mt-1 text-[11px] text-ink-soft font-editorial">
                  {fmt(availableSavings.totalSavings)} total savings − {fmt(availableSavings.totalAllocated)} already allocated
                </p>
              </div>
              <Button
                variant="accent"
                onClick={handleOpenAllocate}
                disabled={availableNum <= 0 || goals.length === 0}
                className="font-screamer tracking-wide text-xs uppercase cursor-pointer"
              >
                Allocate Savings
              </Button>
            </div>
          </Card>

          {/* Allocation panel */}
          {allocating && (
            <Card className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-screamer text-lg uppercase tracking-wide text-ink">Allocate Savings</h3>
                <p className="text-xs font-editorial text-ink-soft">
                  Available: <span className="font-figure font-semibold text-ink">{fmt(availableNum)}</span>
                </p>
              </div>

              <div className="space-y-3">
                {goals.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-editorial font-semibold text-ink truncate">{goal.title}</p>
                      <p className="text-[11px] font-editorial text-ink-soft">{fmt(goal.remaining)} remaining of {fmt(goal.targetAmount)}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="₹0"
                      value={allocationInputs[goal.id] || ""}
                      onChange={(e) => setAllocationInputs({ ...allocationInputs, [goal.id]: e.target.value })}
                      className="w-28 shrink-0 px-2.5 py-1.5 bg-paper border border-line rounded text-ink text-sm text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line/50 pt-3 text-sm font-editorial">
                <span className="text-ink-soft">Total Allocation: <span className="font-figure font-semibold text-ink">{fmt(totalAllocating)}</span></span>
                <span className={overAllocated ? "text-signal-neg font-semibold" : "text-ink-soft"}>
                  Remaining: <span className="font-figure font-semibold">{fmt(Math.max(0, remainingAfterAllocation))}</span>
                  {overAllocated && " (exceeds available)"}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="accent"
                  onClick={handleConfirmAllocation}
                  disabled={submittingAllocation || totalAllocating <= 0 || overAllocated}
                  className="font-screamer tracking-wide text-xs uppercase cursor-pointer"
                >
                  {submittingAllocation ? "Allocating…" : "Confirm Allocation"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setAllocating(false)}
                  className="font-screamer tracking-wide text-xs uppercase cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <Card>
              <h3 className="font-screamer text-lg uppercase tracking-wide text-ink mb-4">
                {editingGoal ? "Edit Goal" : "New Goal"}
              </h3>
              <form onSubmit={handleGoalSubmit} className="space-y-3">
                <Input
                  id="goalTitle"
                  label="Goal Title"
                  required
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    id="goalTarget"
                    label="Target (₹)"
                    type="number"
                    min="1"
                    required
                    value={goalForm.targetAmount}
                    onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                  />
                  <Input
                    id="goalDate"
                    label="Date"
                    type="date"
                    value={goalForm.targetDate}
                    onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-editorial text-ink-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={goalForm.isEmergencyFund}
                    onChange={(e) => setGoalForm({ ...goalForm, isEmergencyFund: e.target.checked })}
                    className="cursor-pointer"
                  />
                  This is my emergency fund
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <Button
                    type="submit"
                    variant="accent"
                    disabled={submittingGoal}
                    className="w-full sm:w-auto font-screamer tracking-wide text-xs uppercase cursor-pointer"
                  >
                    {submittingGoal ? "Saving…" : editingGoal ? "Update Goal" : "Create Goal"}
                  </Button>
                  {editingGoal && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetGoalForm}
                      className="w-full sm:w-auto font-screamer tracking-wide text-xs uppercase cursor-pointer"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Card>

            <div>
              {goals.length === 0 ? (
                <EmptyState title="No goals yet" description="Create your first savings goal using the form." />
              ) : (
                <Card className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="border-b border-line/40 pb-3 last:border-none last:pb-0">
                      <div className="flex justify-between text-sm font-editorial">
                        <span className="font-semibold text-ink flex items-center gap-2">
                          {goal.title}
                          {goal.isEmergencyFund && (
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-horizon/20 text-horizon font-semibold">
                              Emergency Fund
                            </span>
                          )}
                        </span>
                        <span className="font-figure text-ink-soft text-xs">
                          {fmt(goal.contributed)} / {fmt(goal.targetAmount)}
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full bg-signal-pos"
                          style={{ width: `${goal.progressPct}%`, transition: "width 0.4s ease" }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] font-editorial text-ink-soft">
                        {fmt(goal.remaining)} remaining · {goal.progressPct.toFixed(0)}%
                        {goal.targetDate && <> · Target: {new Date(goal.targetDate).toLocaleDateString("en-IN")}</>}
                      </p>

                      <ContributionHistory goalId={goal.id} />

                      <div className="mt-3 flex items-center justify-end gap-3 text-xs font-editorial">
                        <button
                          type="button"
                          onClick={() => handleStartEditGoal(goal)}
                          className="text-ink-soft hover:text-horizon underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteGoal(goal.id)}
                          className="text-signal-neg hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
