// Core Algorithm: Evaluates savings rate, budget adherence, and goal progress to derive a score out of 100.
import { prisma } from "@/database/prisma";
import { computeHealthScore } from "@/utils/healthScore";
import { detectSpendingAnomalies } from "@/utils/spendingAnomaly";
import { portfolioService } from "@/services/portfolio.service";

export const healthScoreService = {
  async compute(userId: number, filters: { period?: string; month?: number; year?: number } = {}) {
    const { period, month, year } = filters;
    const now = new Date();

    let targetStart: Date | null = null;
    let targetEnd: Date | null = null;

    if (period === "all_time") {
      targetStart = null;
      targetEnd = null;
    } else if (period === "yearly" && year) {
      targetStart = new Date(year, 0, 1);
      targetEnd = new Date(year + 1, 0, 1);
    } else {
      // Monthly mode
      const m = month || now.getMonth() + 1;
      const y = year || now.getFullYear();
      targetStart = new Date(y, m - 1, 1);
      targetEnd = new Date(y, m, 1);
    }

    const dateFilter = targetStart && targetEnd ? { gte: targetStart, lt: targetEnd } : undefined;
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const [thisMonthTx, last6MonthsTx, budgets, portfolioResult, goals] = await Promise.all([
      prisma.transaction.findMany({ where: { userId, ...(dateFilter ? { date: dateFilter } : {}) } }),
      prisma.transaction.findMany({ where: { userId, date: { gte: sixMonthsAgo } } }),
      prisma.budget.findMany({
        where: {
          userId,
          ...(period === "yearly" && year
            ? { year }
            : period === "all_time"
            ? {}
            : { month: month || now.getMonth() + 1, year: year || now.getFullYear() }),
        },
      }),
      portfolioService.list(userId),
      prisma.goal.findMany({ where: { userId } }),
    ]);

    const thisMonthDetailedTx = await prisma.transaction.findMany({
      where: { userId, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const last6MonthsDetailedTx = await prisma.transaction.findMany({
      where: { userId, date: { gte: sixMonthsAgo } },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const income = thisMonthTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const expense = thisMonthTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

    const budgetLimit = budgets.reduce((s, b) => s + Number(b.monthlyLimit), 0);
    const budgetSpent = expense;

    const holdingTypesCount = new Set(portfolioResult.holdings.map((h) => h.type)).size;

    const emergencyGoal = goals.find((g) => g.isEmergencyFund);
    let emergencyFundAmount: number | null = null;
    if (emergencyGoal) {
      const contributionAgg = await prisma.goalContribution.aggregate({
        where: { goalId: emergencyGoal.id },
        _sum: { amount: true },
      });
      emergencyFundAmount = Number(contributionAgg._sum.amount || 0);
    }

    let monthlyExpenseAvg = 0;
    if (period === "yearly") {
      monthlyExpenseAvg = expense / 12;
    } else if (period === "all_time") {
      monthlyExpenseAvg = expense / 12;
    } else {
      monthlyExpenseAvg =
        last6MonthsTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0) / 6;
    }

    // Same convention as the Portfolio summary total: a holding with no
    // available price contributes its invested amount rather than being
    // silently dropped from total assets.
    const totalAssets =
      portfolioResult.holdings.reduce((s, h) => s + (h.currentValue ?? h.investedAmount ?? 0), 0) + income;
    
    // Set totalDebt = null to indicate unavailable/insufficient data
    const totalDebt = null;
    
    const anomalies = detectSpendingAnomalies(thisMonthDetailedTx, last6MonthsDetailedTx);

    const recommendations: string[] = [];
    if (expense > income) {
      recommendations.push("Your spending is outrunning income this month — review recurring and discretionary expenses.");
    }
    if (budgetLimit > 0 && budgetSpent > budgetLimit) {
      recommendations.push("You are over budget this month; reduce the highest overspent categories first.");
    }
    if (anomalies.length > 0) {
      recommendations.push(`We flagged ${anomalies.length} unusual spend pattern${anomalies.length > 1 ? "s" : ""} to review.`);
    }
    
    // Suggestion explaining the missing debt data module
    recommendations.push(
      "Debt data is currently unavailable. Configure a Loan/Debt tracker module to include Debt Ratio metrics."
    );

    if (emergencyFundAmount === null) {
      recommendations.push(
        "No emergency fund goal is set. Mark a savings goal as your emergency fund to include Emergency Fund Coverage in your score."
      );
    }

    return {
      ...computeHealthScore({
        income,
        expense,
        budgetLimit,
        budgetSpent,
        holdingTypesCount,
        emergencyFundAmount,
        monthlyExpenseAvg,
        totalDebt,
        totalAssets,
      }),
      anomalies,
      recommendations,
    };
  },
};
