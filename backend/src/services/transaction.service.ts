import { Prisma } from "@prisma/client";
import { prisma } from "@/database/prisma";
import { AppError } from "@/middlewares/error.middleware";
import { CreateTransactionInput } from "@/validators/transaction.validator";

function buildDateRange(filters: { period?: string; month?: number; year?: number }) {
  const { period, month, year } = filters;
  if (period === "all_time") return null;
  if (period === "yearly" && year) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { gte: start, lt: end };
  }
  if (period === "monthly" && month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return { gte: start, lt: end };
  }
  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return { gte: start, lt: end };
  }
  if (year && !month) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { gte: start, lt: end };
  }
  return null;
}

export const transactionService = {
  /** All-time income minus expense for a user, via DB-side aggregation rather than loading every row into memory. Returns Prisma.Decimal (not Number) since this feeds directly into further Decimal arithmetic in goal.service.ts's available-savings calculation — converting to Number here would reintroduce floating-point rounding error before that math even starts. */
  async totalSavings(userId: number) {
    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({ where: { userId, type: "INCOME" }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { userId, type: "EXPENSE" }, _sum: { amount: true } }),
    ]);
    const income = incomeAgg._sum.amount ?? new Prisma.Decimal(0);
    const expense = expenseAgg._sum.amount ?? new Prisma.Decimal(0);
    return { income, expense, savings: income.minus(expense) };
  },

  async create(userId: number, input: CreateTransactionInput) {
    const transaction = await prisma.transaction.create({
      data: {
        amount: input.amount,
        type: input.type,
        description: input.description,
        date: input.date ? new Date(input.date) : new Date(),
        userId,
        categoryId: input.categoryId,
      },
      include: { category: true },
    });
    return transaction;
  },

  async list(
    userId: number,
    filters: { period?: string; month?: number; year?: number; type?: "INCOME" | "EXPENSE"; categoryId?: number }
  ) {
    const dateRange = buildDateRange(filters);
    return prisma.transaction.findMany({
      where: {
        userId,
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(dateRange ? { date: dateRange } : {}),
      },
      include: { category: true },
      orderBy: { date: "desc" },
    });
  },

  async remove(userId: number, id: number) {
    const result = await prisma.transaction.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new AppError("Transaction not found", 404);
  },

  async summary(userId: number, filters: { period?: string; month?: number; year?: number }) {
    const dateRange = buildDateRange(filters);
    const transactions = await prisma.transaction.findMany({
      where: { userId, ...(dateRange ? { date: dateRange } : {}) },
      include: { category: true },
    });

    const totals = transactions.reduce(
      (acc: { income: number; expense: number }, t) => {
        const amt = Number(t.amount);
        if (t.type === "INCOME") acc.income += amt;
        else acc.expense += amt;
        return acc;
      },
      { income: 0, expense: 0 }
    );

    const byCategory: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type !== "EXPENSE") continue;
      const key = t.category.name;
      byCategory[key] = (byCategory[key] || 0) + Number(t.amount);
    }

    return {
      income: totals.income,
      expense: totals.expense,
      savings: totals.income - totals.expense,
      savingsRate: totals.income > 0 ? (totals.income - totals.expense) / totals.income : 0,
      byCategory,
    };
  },

  async update(userId: number, id: number, input: Partial<CreateTransactionInput>) {
    const tx = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!tx) throw new AppError("Transaction not found", 404);

    return prisma.transaction.update({
      where: { id },
      data: {
        amount: input.amount,
        type: input.type,
        description: input.description,
        date: input.date ? new Date(input.date) : undefined,
        categoryId: input.categoryId,
      },
      include: { category: true },
    });
  },
};

