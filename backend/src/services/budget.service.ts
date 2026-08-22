import { prisma } from "@/database/prisma";
import { AppError } from "@/middlewares/error.middleware";
import { UpsertBudgetInput } from "@/validators/budget.validator";

export const budgetService = {
  async upsert(userId: number, input: UpsertBudgetInput) {
    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId,
          categoryId: input.categoryId,
          month: input.month,
          year: input.year,
        },
      },
      update: { monthlyLimit: input.monthlyLimit },
      create: { userId, ...input },
      include: { category: true },
    });
    return budget;
  },

  async list(userId: number, filters: { month?: number; year?: number; period?: string }) {
    const isYearly = filters.period === "yearly";
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        ...(isYearly
          ? { year: filters.year || new Date().getFullYear() }
          : {
              ...(filters.month ? { month: filters.month } : {}),
              ...(filters.year ? { year: filters.year } : {}),
            }),
      },
      include: { category: true },
      orderBy: [{ year: "desc" }, { month: "asc" }],
    });

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const start = new Date(budget.year, budget.month - 1, 1);
        const end = new Date(budget.year, budget.month, 1);

        // Sum up transactions under matching category and date range for this user
        const txSum = await prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            date: { gte: start, lt: end },
            type: "EXPENSE", // budget applies to expenses
          },
          _sum: { amount: true },
        });

        const spent = Number(txSum._sum.amount) || 0;
        const limit = Number(budget.monthlyLimit);
        const remaining = limit - spent;
        const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;

        return {
          ...budget,
          spent,
          remaining,
          percentUsed,
          status: spent > limit ? "EXCEEDED" : "WITHIN_BUDGET",
        };
      })
    );

    return budgetsWithSpent;
  },

  async remove(userId: number, id: number) {
    const result = await prisma.budget.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      throw new AppError("Budget not found", 404);
    }
  },
};
