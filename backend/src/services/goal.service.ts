import { Prisma } from "@prisma/client";
import { prisma } from "@/database/prisma";
import { AppError } from "@/middlewares/error.middleware";
import { transactionService } from "@/services/transaction.service";
import { CreateGoalInput } from "@/validators/goal.validator";

const { Decimal } = Prisma;
const ZERO = new Decimal(0);

/**
 * Savings & goal-allocation model
 * ---------------------------------
 * A goal's saved amount is NEVER stored directly — it is always
 * SUM(GoalContribution.amount) for that goal. This keeps the Transaction
 * table as the single source of truth for money in/out, and GoalContribution
 * as the single source of truth for how that money has been earmarked.
 *
 * Available (unallocated) savings = all-time (income - expense) minus
 * all-time SUM(GoalContribution.amount) across every goal the user has.
 * This is recomputed fresh on every read — nothing is reset monthly, and
 * unallocated savings naturally carries forward across months because it's
 * just a live difference of two running totals.
 *
 * All monetary math below is done with Prisma.Decimal (decimal.js under the
 * hood) rather than plain JS numbers, to avoid floating-point rounding
 * error accumulating across sums/divisions. Values are only converted to
 * Number at the very edge of each function, right before they're returned
 * to a controller/API response.
 *
 * Shortfall handling: if expenses recorded after money was already
 * allocated to goals eat into total savings, totalAllocated can end up
 * exceeding totalSavings. availableSavings is floored at 0 in that case
 * (never negative) and the shortfall is surfaced as a separate, explicit
 * warning — existing GoalContribution rows are never deleted, reduced, or
 * moved to "fix" this. That's a decision for the user, not the system.
 */

async function computeAvailableSavings(userId: number) {
  const [{ savings }, allocatedAgg] = await Promise.all([
    transactionService.totalSavings(userId),
    prisma.goalContribution.aggregate({ where: { userId }, _sum: { amount: true } }),
  ]);

  const totalSavings: Prisma.Decimal = savings;
  const totalAllocated: Prisma.Decimal = allocatedAgg._sum.amount ?? ZERO;

  // Not floored — this is the true, possibly-negative position, used to
  // detect a shortfall before we clamp it for display.
  const rawAvailable = totalSavings.minus(totalAllocated);
  const availableSavings = Decimal.max(ZERO, rawAvailable);
  const hasShortfall = rawAvailable.isNegative();
  const shortfallAmount = hasShortfall ? rawAvailable.abs() : ZERO;

  return {
    totalSavings: Number(totalSavings.toFixed(2)),
    totalAllocated: Number(totalAllocated.toFixed(2)),
    availableSavings: Number(availableSavings.toFixed(2)),
    hasShortfall,
    shortfallAmount: Number(shortfallAmount.toFixed(2)),
  };
}

/** Returns a Map<goalId, Decimal> of contributed totals — kept as Decimal
 * since callers combine this with other Decimal values before formatting. */
async function contributedTotalsByGoal(userId: number, goalIds?: number[]) {
  const rows = await prisma.goalContribution.groupBy({
    by: ["goalId"],
    where: { userId, ...(goalIds ? { goalId: { in: goalIds } } : {}) },
    _sum: { amount: true },
  });
  const map = new Map<number, Prisma.Decimal>();
  for (const row of rows) map.set(row.goalId, row._sum.amount ?? ZERO);
  return map;
}

export const goalService = {
  async create(userId: number, input: CreateGoalInput) {
    const goal = await prisma.goal.create({
      data: {
        title: input.title,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
        isEmergencyFund: input.isEmergencyFund ?? false,
        userId,
      },
    });
    return { ...goal, targetAmount: Number(goal.targetAmount), contributed: 0, remaining: Number(goal.targetAmount), progressPct: 0 };
  },

  async list(userId: number) {
    const goals = await prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    const contributedMap = await contributedTotalsByGoal(
      userId,
      goals.map((g) => g.id)
    );

    return goals.map((g) => {
      const target = g.targetAmount; // Prisma.Decimal
      const contributed = contributedMap.get(g.id) ?? ZERO;
      const remaining = Decimal.max(ZERO, target.minus(contributed));
      const progressPct = target.greaterThan(ZERO) ? Decimal.min(new Decimal(100), contributed.div(target).times(100)) : ZERO;

      return {
        ...g,
        targetAmount: Number(target.toFixed(2)),
        contributed: Number(contributed.toFixed(2)),
        remaining: Number(remaining.toFixed(2)),
        progressPct: Number(progressPct.toFixed(2)),
      };
    });
  },

  async update(userId: number, id: number, input: Partial<CreateGoalInput>) {
    const goal = await prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) throw new AppError("Goal not found", 404);

    return prisma.goal.update({
      where: { id },
      data: {
        title: input.title,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate === null ? null : input.targetDate ? new Date(input.targetDate) : undefined,
        isEmergencyFund: input.isEmergencyFund,
      },
    });
  },

  async remove(userId: number, id: number) {
    // GoalContribution rows for this goal cascade-delete automatically
    // (onDelete: Cascade in the schema), which correctly frees whatever
    // was allocated to this goal back into the user's available savings.
    const result = await prisma.goal.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new AppError("Goal not found", 404);
  },

  async getAvailableSavings(userId: number) {
    return computeAvailableSavings(userId);
  },

  async getContributions(userId: number, goalId: number) {
    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new AppError("Goal not found", 404);

    const contributions = await prisma.goalContribution.findMany({
      where: { goalId, userId },
      orderBy: { date: "desc" },
    });
    return contributions.map((c) => ({ ...c, amount: Number(c.amount) }));
  },

  /**
   * Allocates unallocated savings to one or more goals in a single atomic
   * operation. Uses SERIALIZABLE isolation so two concurrent allocation
   * requests can't both read the same "available savings" snapshot and
   * jointly over-allocate past what's actually available — one will be
   * forced to retry/fail rather than silently corrupt the total.
   *
   * If the account is already in a shortfall (totalAllocated > totalSavings,
   * see computeAvailableSavings above), availableSavings here is 0, so any
   * requested allocation greater than 0 is correctly rejected below —
   * no special-casing needed for that state.
   */
  async allocate(userId: number, allocations: Array<{ goalId: number; amount: number; note?: string }>) {
    if (allocations.length === 0) {
      throw new AppError("At least one allocation is required", 400);
    }

    const requestedTotal = allocations.reduce((sum, a) => sum.plus(new Decimal(a.amount)), ZERO);

    return prisma.$transaction(
      async (tx) => {
        // Re-validate everything from fresh, transaction-scoped reads —
        // never trust a snapshot computed before the transaction began.
        const [incomeAgg, expenseAgg, allocatedAgg] = await Promise.all([
          tx.transaction.aggregate({ where: { userId, type: "INCOME" }, _sum: { amount: true } }),
          tx.transaction.aggregate({ where: { userId, type: "EXPENSE" }, _sum: { amount: true } }),
          tx.goalContribution.aggregate({ where: { userId }, _sum: { amount: true } }),
        ]);
        const income = incomeAgg._sum.amount ?? ZERO;
        const expense = expenseAgg._sum.amount ?? ZERO;
        const totalSavings = income.minus(expense);
        const totalAllocated = allocatedAgg._sum.amount ?? ZERO;
        const availableSavings = Decimal.max(ZERO, totalSavings.minus(totalAllocated));

        if (requestedTotal.greaterThan(availableSavings)) {
          throw new AppError(
            `Cannot allocate ₹${requestedTotal.toFixed(2)} — only ₹${availableSavings.toFixed(2)} is available.`,
            400
          );
        }

        const goalIds = allocations.map((a) => a.goalId);
        const goals = await tx.goal.findMany({ where: { id: { in: goalIds }, userId } });
        const goalMap = new Map(goals.map((g) => [g.id, g]));

        // Ownership check: every goalId must belong to this user.
        for (const a of allocations) {
          if (!goalMap.has(a.goalId)) {
            throw new AppError(`Goal ${a.goalId} not found`, 404);
          }
          if (a.amount <= 0) {
            throw new AppError("Allocation amount must be greater than 0", 400);
          }
        }

        // Per-goal remaining-target check, using contribution totals read
        // inside this same transaction (not the pre-transaction snapshot).
        const contributedRows = await tx.goalContribution.groupBy({
          by: ["goalId"],
          where: { userId, goalId: { in: goalIds } },
          _sum: { amount: true },
        });
        const contributedMap = new Map<number, Prisma.Decimal>();
        for (const row of contributedRows) contributedMap.set(row.goalId, row._sum.amount ?? ZERO);

        // If a goal appears more than once in the request, its amounts
        // must be combined before checking against the remaining target.
        const requestedPerGoal = new Map<number, Prisma.Decimal>();
        for (const a of allocations) {
          const existing = requestedPerGoal.get(a.goalId) ?? ZERO;
          requestedPerGoal.set(a.goalId, existing.plus(new Decimal(a.amount)));
        }
        for (const [goalId, amount] of requestedPerGoal) {
          const goal = goalMap.get(goalId)!;
          const alreadyContributed = contributedMap.get(goalId) ?? ZERO;
          const remaining = goal.targetAmount.minus(alreadyContributed);
          if (amount.greaterThan(remaining)) {
            throw new AppError(
              `Allocating ₹${amount.toFixed(2)} to "${goal.title}" would exceed its remaining target of ₹${remaining.toFixed(2)}.`,
              400
            );
          }
        }

        await tx.goalContribution.createMany({
          data: allocations.map((a) => ({
            goalId: a.goalId,
            userId,
            amount: a.amount,
            note: a.note,
          })),
        });

        return { success: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  },
};
