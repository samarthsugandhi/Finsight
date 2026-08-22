import { healthScoreService } from "@/services/healthScore.service";
import { retrieverService } from "@/services/retriever.service";
import { askOllama } from "@/ai/ollama.service";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function compareMonth(current: number, previous: number) {
  const delta = current - previous;
  const pct = previous > 0 ? (delta / previous) * 100 : current > 0 ? 100 : 0;
  return { delta, pct };
}

function buildAnswer(question: string, context: Awaited<ReturnType<typeof retrieverService.retrieve>>, health: Awaited<ReturnType<typeof healthScoreService.compute>>) {
  const comparison = compareMonth(context.currentMonth.expense, context.previousMonth.expense);
  const topCategories = Object.entries(context.currentMonth.categoryTotals)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
  const topBudgetPressure = context.budgets
    .map((budget) => ({ ...budget, ratio: budget.monthlyLimit > 0 ? budget.spent / budget.monthlyLimit : 0 }))
    .sort((left, right) => right.ratio - left.ratio)
    .slice(0, 3);

  if (context.intent === "spending_increase") {
    return [
      `Your expenses are ${comparison.delta >= 0 ? "up" : "down"} ${formatMoney(Math.abs(comparison.delta))} (${comparison.pct.toFixed(1)}%) versus last month.`,
      topCategories.length > 0
        ? `The largest spend areas this month are ${topCategories.map(([name, amount]) => `${name} (${formatMoney(amount)})`).join(", ")}.`
        : "I could not identify a category breakdown for this month.",
      health.anomalies?.length
        ? `I also flagged ${health.anomalies.length} unusual spend pattern${health.anomalies.length > 1 ? "s" : ""} that may be inflating the month.`
        : "I did not find a strong anomaly spike in the current month.",
      "Best next action: reduce the top discretionary category first, then review recurring charges and subscriptions.",
    ].join("\n");
  }

  if (context.intent === "budget_overview") {
    return [
      `Your current monthly expense is ${formatMoney(context.currentMonth.expense)} against ${formatMoney(context.budgets.reduce((sum, budget) => sum + budget.monthlyLimit, 0))} of active budget limits.`,
      topBudgetPressure.length > 0
        ? `Highest budget pressure is in ${topBudgetPressure.map((budget) => `${budget.categoryName} (${(budget.ratio * 100).toFixed(0)}%)`).join(", ")}.`
        : "No active budget pressure was detected.",
      "Recommendation: keep the most overspent category under watch for the rest of the month and move unused budget into savings or debt reduction.",
    ].join("\n");
  }

  if (context.intent === "investment_overview") {
    return [
      `You currently hold ${context.portfolio.holdings} investment positions with a current value of ${formatMoney(context.portfolio.currentValue)} versus ${formatMoney(context.portfolio.invested)} invested.`,
      `Diversification spans ${context.portfolio.diversification} holding type${context.portfolio.diversification === 1 ? "" : "s"}.`,
      context.portfolio.currentValue >= context.portfolio.invested
        ? "Your portfolio is in profit overall; continue tracking allocation balance and rebalancing when one asset class dominates."
        : "Your portfolio is below cost basis; avoid panic selling and focus on diversification plus long-term allocation discipline.",
    ].join("\n");
  }

  if (context.intent === "health_review") {
    return [
      `Your current financial health score is ${health.score}/100.`,
      `Strongest areas: ${Object.entries(health.breakdown)
        .map(([label, val]) => [label, val ?? 0] as [string, number])
        .sort((left, right) => right[1] - left[1])
        .slice(0, 2)
        .map(([label, score]) => `${label} (${score}/100)`)
        .join(", ")}.`,
      health.recommendations?.length
        ? `Priority recommendations: ${health.recommendations.join(" ")}`
        : "Your score is stable, but keeping budget discipline high will lift it further.",
    ].join("\n");
  }

  if (context.intent === "goal_progress") {
    const bestGoal = context.goals[0];
    const lines = [
      context.goals.length > 0
        ? `Your leading goal is “${bestGoal.title}” at ${bestGoal.progressPct.toFixed(1)}% complete.`
        : "You do not have any active goals yet.",
      context.goals.length > 1
        ? `You have ${context.goals.length - 1} other active goal${context.goals.length - 1 === 1 ? "" : "s"} under tracking.`
        : "",
    ];

    if (context.availableSavings > 0 && context.goals.length > 0) {
      const underfunded = [...context.goals].sort((a, b) => a.progressPct - b.progressPct).slice(0, 2);
      const suggestion = underfunded
        .map((g) => `${formatMoney(Math.min(context.availableSavings / underfunded.length, g.targetAmount - g.savedAmount))} to “${g.title}”`)
        .join(" and ");
      lines.push(
        `You currently have ${formatMoney(context.availableSavings)} in unallocated savings. You could consider allocating ${suggestion} — but this is only a suggestion; nothing is allocated until you confirm it yourself on the Goals page.`
      );
    } else if (context.goals.length > 0) {
      lines.push("All of your current savings are already allocated to goals.");
    }

    lines.push("Best action: automate a direct transfer to savings on your salary day to maintain this goal trajectory.");
    return lines.filter(Boolean).join("\n");
  }

  return [
    `I retrieved your profile context. Active cash flow details: monthly income is ${formatMoney(context.currentMonth.income)} vs expenses of ${formatMoney(context.currentMonth.expense)}.`,
    `Emergency goals fund: ${context.currentMonth.savings >= 0 ? "retaining net savings" : "outrunning incoming streams"}.`,
    "Ask a more specific question like ‘why did my expenses increase?’ or ‘how healthy are my finances?’ for a sharper recommendation.",
  ].join("\n");
}

export const advisorService = {
  async answer(userId: number, question: string) {
    const [retrieval, health] = await Promise.all([
      retrieverService.retrieve(userId, question),
      healthScoreService.compute(userId),
    ]);

    const prompt = `
You are Finsight, a personal finance assistant.
You have access to the user's complete financial profile context, including health scores, spending anomalies, monthly budgets, goals, and portfolio holdings.

Financial Profile:
- Current Month Income: ₹${retrieval.currentMonth.income}
- Current Month Expense: ₹${retrieval.currentMonth.expense}
- Current Month Savings: ₹${retrieval.currentMonth.savings}
- Previous Month Income: ₹${retrieval.previousMonth.income}
- Previous Month Expense: ₹${retrieval.previousMonth.expense}
- Previous Month Savings: ₹${retrieval.previousMonth.savings}
- Available (Unallocated) Savings: ₹${retrieval.availableSavings}
- Budgets: ${JSON.stringify(retrieval.budgets)}
- Portfolio: ${JSON.stringify(retrieval.portfolio)}
- Goals: ${JSON.stringify(retrieval.goals)}
- Recent Transactions: ${JSON.stringify(retrieval.recentTransactions)}
- Health Score: ${health.score}/100
- Financial Anomalies: ${JSON.stringify(health.anomalies)}

User Question:
${question}

Answer the user's question accurately based on the profile data. Keep your explanation professional, direct, and actionable. Do not make up any numbers.

If relevant, you may SUGGEST how the user could allocate their Available (Unallocated) Savings across their goals — e.g. "You could consider allocating ₹X to Goal A and ₹Y to Goal B." You must NEVER claim to have performed, executed, or completed an allocation yourself — allocating savings to a goal always requires the user to explicitly confirm it themselves in the Goals page UI. Frame any allocation numbers strictly as a suggestion for the user to review and confirm.
`;

    let answer = "";
    try {
      answer = await askOllama(prompt);
    } catch (e) {
      // Fallback to rules-based template response if Ollama fails/is offline
      answer = buildAnswer(question, retrieval, health);
    }

    const confidence = retrieval.intent === "general_finance" ? 0.68 : 0.86;

    return {
      question,
      answer,
      confidence,
      intent: retrieval.intent,
      health,
      retrieval,
    };
  },
};