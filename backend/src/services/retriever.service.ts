import { prisma } from "@/database/prisma";
import { goalService } from "@/services/goal.service";
import { portfolioService } from "@/services/portfolio.service";

export type RetrievalIntent =
  | "spending_increase"
  | "budget_overview"
  | "investment_overview"
  | "health_review"
  | "goal_progress"
  | "general_finance";

export interface RetrievalContext {
  intent: RetrievalIntent;
  question: string;
  currentMonth: {
    income: number;
    expense: number;
    savings: number;
    categoryTotals: Record<string, number>;
    transactions: Array<{
      id: number;
      amount: number;
      type: "INCOME" | "EXPENSE";
      description: string | null;
      date: Date;
      categoryName: string;
    }>;
  };
  previousMonth: {
    income: number;
    expense: number;
    savings: number;
    categoryTotals: Record<string, number>;
  };
  budgets: Array<{
    id: number;
    categoryName: string;
    monthlyLimit: number;
    spent: number;
  }>;
  portfolio: {
    holdings: number;
    invested: number;
    currentValue: number;
    diversification: number;
  };
  goals: Array<{
    id: number;
    title: string;
    targetAmount: number;
    savedAmount: number;
    progressPct: number;
  }>;
  availableSavings: number;
  focusCategories: string[];
  recentTransactions: Array<{
    id: number;
    amount: number;
    type: "INCOME" | "EXPENSE";
    description: string | null;
    date: Date;
    categoryName: string;
  }>;
}

function monthRange(monthOffset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 1);
  return { start, end };
}

function getIntent(question: string): RetrievalIntent {
  const lowered = question.toLowerCase();
  if (/expense|spend|spent|increase|why/.test(lowered)) return "spending_increase";
  if (/budget|limit|overspend/.test(lowered)) return "budget_overview";
  if (/invest|portfolio|holding|stocks?|mutual fund|crypto|gold/.test(lowered)) return "investment_overview";
  if (/health|score|overall/.test(lowered)) return "health_review";
  if (/goal|target|savings?/.test(lowered)) return "goal_progress";
  return "general_finance";
}

function inferFocusCategories(question: string, categoryNames: string[]) {
  const lowered = question.toLowerCase();
  return categoryNames.filter((name) => lowered.includes(name.toLowerCase())).slice(0, 3);
}

function summarizeTransactions(transactions: Array<{ amount: number; type: "INCOME" | "EXPENSE"; categoryName: string }>) {
  return transactions.reduce(
    (acc, transaction) => {
      const amount = transaction.amount;
      if (transaction.type === "INCOME") acc.income += amount;
      else {
        acc.expense += amount;
        acc.categoryTotals[transaction.categoryName] = (acc.categoryTotals[transaction.categoryName] || 0) + amount;
      }
      return acc;
    },
    { income: 0, expense: 0, categoryTotals: {} as Record<string, number> }
  );
}

export const retrieverService = {
  async retrieve(userId: number, question: string): Promise<RetrievalContext> {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
    const intent = getIntent(question);
    const focusCategories = inferFocusCategories(question, categories.map((category) => category.name));

    const current = monthRange(0);
    const previous = monthRange(1);
    const recentWindowStart = new Date(current.start.getFullYear(), current.start.getMonth() - 5, 1);

    const [currentMonthTransactions, previousMonthTransactions, recentTransactions, budgets, portfolioResult, goalsWithProgress, availableSavingsResult] =
      await Promise.all([
        prisma.transaction.findMany({
          where: { userId, date: { gte: current.start, lt: current.end } },
          include: { category: true },
          orderBy: { date: "desc" },
        }),
        prisma.transaction.findMany({
          where: { userId, date: { gte: previous.start, lt: previous.end } },
          include: { category: true },
          orderBy: { date: "desc" },
        }),
        prisma.transaction.findMany({
          where: { userId, date: { gte: recentWindowStart } },
          include: { category: true },
          orderBy: { date: "desc" },
          take: 80,
        }),
        prisma.budget.findMany({
          where: { userId },
          include: { category: true },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        }),
        portfolioService.list(userId),
        goalService.list(userId),
        goalService.getAvailableSavings(userId),
      ]);

    const currentSummary = summarizeTransactions(
      currentMonthTransactions.map((transaction) => ({
        amount: Number(transaction.amount),
        type: transaction.type,
        categoryName: transaction.category.name,
      }))
    );

    const previousSummary = summarizeTransactions(
      previousMonthTransactions.map((transaction) => ({
        amount: Number(transaction.amount),
        type: transaction.type,
        categoryName: transaction.category.name,
      }))
    );

    const budgetsWithSpend = budgets.map((budget) => ({
      id: budget.id,
      categoryName: budget.category.name,
      monthlyLimit: Number(budget.monthlyLimit),
      spent: currentMonthTransactions
        .filter((transaction) => transaction.categoryId === budget.categoryId && transaction.type === "EXPENSE")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    }));

    const totalInvested = portfolioResult.summary.totalInvested ?? 0;
    const totalCurrent = portfolioResult.summary.totalCurrent ?? 0;
    const diversification = new Set(portfolioResult.holdings.map((holding) => holding.type)).size;

    const goalsForContext = goalsWithProgress.map((goal) => ({
      id: goal.id,
      title: goal.title,
      targetAmount: Number(goal.targetAmount),
      savedAmount: goal.contributed,
      progressPct: goal.progressPct,
    }));

    return {
      intent,
      question,
      currentMonth: {
        income: currentSummary.income,
        expense: currentSummary.expense,
        savings: currentSummary.income - currentSummary.expense,
        categoryTotals: currentSummary.categoryTotals,
        transactions: currentMonthTransactions.map((transaction) => ({
          id: transaction.id,
          amount: Number(transaction.amount),
          type: transaction.type,
          description: transaction.description,
          date: transaction.date,
          categoryName: categoryMap.get(transaction.categoryId) || transaction.category.name,
        })),
      },
      previousMonth: {
        income: previousSummary.income,
        expense: previousSummary.expense,
        savings: previousSummary.income - previousSummary.expense,
        categoryTotals: previousSummary.categoryTotals,
      },
      budgets: budgetsWithSpend,
      portfolio: {
        holdings: portfolioResult.holdings.length,
        invested: totalInvested,
        currentValue: totalCurrent,
        diversification,
      },
      goals: goalsForContext,
      availableSavings: availableSavingsResult.availableSavings,
      focusCategories,
      recentTransactions: recentTransactions.slice(0, 15).map((transaction) => ({
        id: transaction.id,
        amount: Number(transaction.amount),
        type: transaction.type,
        description: transaction.description,
        date: transaction.date,
        categoryName: categoryMap.get(transaction.categoryId) || transaction.category.name,
      })),
    };
  },
};