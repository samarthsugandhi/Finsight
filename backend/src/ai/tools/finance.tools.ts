import { prisma } from "@/database/prisma";
import { transactionService } from "@/services/transaction.service";
import { budgetService } from "@/services/budget.service";
import { goalService } from "@/services/goal.service";
import { portfolioService } from "@/services/portfolio.service";

export async function getRecentTransactions(userId: number, limit: number = 5) {
  const txList = await transactionService.list(userId, {});
  return txList.slice(0, limit).map((t) => ({
    id: t.id,
    date: t.date,
    amount: Number(t.amount),
    type: t.type,
    description: t.description,
    category: t.category.name,
  }));
}

export async function getMonthlySummary(userId: number, month?: number, year?: number) {
  const now = new Date();
  const summary = await transactionService.summary(userId, {
    month: month || now.getMonth() + 1,
    year: year || now.getFullYear(),
  });
  return summary;
}

export async function getCategoryExpenses(userId: number, month?: number, year?: number) {
  const summary = await getMonthlySummary(userId, month, year);
  return summary.byCategory;
}

export async function getBudgets(userId: number, month?: number, year?: number) {
  const now = new Date();
  const budgets = await budgetService.list(userId, {
    month: month || now.getMonth() + 1,
    year: year || now.getFullYear(),
  });
  return budgets.map((b) => ({
    id: b.id,
    category: b.category.name,
    monthlyLimit: Number(b.monthlyLimit),
    spent: Number(b.spent),
    remaining: Number(b.remaining),
    percentUsed: Number(b.percentUsed),
    status: b.status,
  }));
}

export async function getGoals(userId: number) {
  const goals = await goalService.list(userId);
  return goals.map((g) => ({
    id: g.id,
    title: g.title,
    targetAmount: Number(g.targetAmount),
    savedAmount: g.contributed,
    remaining: g.remaining,
    progressPct: g.progressPct,
    isEmergencyFund: g.isEmergencyFund,
  }));
}

export async function getAvailableSavings(userId: number) {
  // Read-only: surfaces unallocated savings so the AI can suggest an
  // allocation. It must never call goalService.allocate itself — only the
  // user can confirm an allocation through the UI.
  return goalService.getAvailableSavings(userId);
}

export async function getPortfolio(userId: number) {
  // portfolioService.list() has already computed everything — quantity,
  // invested amount, current value, profit/loss, return % — using real
  // cached market prices and Decimal-safe math. This tool only reshapes
  // that output for the AI; it never computes or invents anything itself.
  // currentValue/profitLoss/returnPct are passed through as null (not 0)
  // when no price is available yet, so the AI can't mistake "unpriced" for
  // "zero return".
  const portfolio = await portfolioService.list(userId);
  return {
    holdings: portfolio.holdings.map((h) => ({
      id: h.id,
      name: h.name,
      type: h.type,
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      investedAmount: h.investedAmount,
      currentValue: h.currentValue,
      profitLoss: h.profitLoss,
      returnPercentage: h.returnPct,
      currency: h.currency, // never assume INR — AI should mention currency when relevant (e.g. USD-priced crypto)
      priceSource: h.priceSource, // "LIVE" | "MANUAL" | "FIXED_DEPOSIT" | "UNAVAILABLE"
    })),
    summary: {
      totalInvested: portfolio.summary.totalInvested,
      totalCurrent: portfolio.summary.totalCurrent,
      returns: portfolio.summary.returns,
      returnsPct: portfolio.summary.returnsPct,
      allocation: portfolio.summary.allocation,
      // pricedReturnsPct is the trustworthy return figure — it excludes
      // holdings with no current price. unpricedCount tells the AI when it
      // should caveat its answer instead of stating returns as a single
      // clean number.
      pricedReturns: portfolio.summary.pricedReturns,
      pricedReturnsPct: portfolio.summary.pricedReturnsPct,
      unpricedCount: portfolio.summary.unpricedCount,
      unpricedInvested: portfolio.summary.unpricedInvested,
    },
  };
}

export async function getCategories() {
  // Global, not user-scoped — needed so the AI can resolve a category name
  // (e.g. "food") to a categoryId before proposing a create_transaction
  // action, since categoryId is a required field on Transaction.
  const categories = await prisma.category.findMany();
  return categories.map((c) => ({ id: c.id, name: c.name, type: c.type }));
}
