type TransactionWithCategory = {
  id: number;
  amount: unknown;
  type: "INCOME" | "EXPENSE";
  date: Date;
  category: { id: number; name: string };
};

export interface SpendingAnomaly {
  transactionId?: number;
  categoryId: number;
  categoryName: string;
  amount: number;
  baselineAmount: number;
  anomalyScore: number;
  reason: string;
  kind: "transaction" | "category";
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function scoreIsolationStyle(amount: number, baseline: number, spread: number) {
  if (baseline <= 0) return Math.min(100, amount > 0 ? 85 : 0);
  const distance = Math.max(0, amount - baseline);
  const normalized = distance / Math.max(baseline, spread || baseline);
  return Math.max(0, Math.min(100, Math.round(normalized * 55 + (amount > baseline ? 35 : 0))));
}

export function detectSpendingAnomalies(
  thisMonthTransactions: TransactionWithCategory[],
  historicalTransactions: TransactionWithCategory[]
): SpendingAnomaly[] {
  const currentExpenses = thisMonthTransactions.filter((transaction) => transaction.type === "EXPENSE");
  const historyExpenses = historicalTransactions.filter((transaction) => transaction.type === "EXPENSE");

  const historyByCategory = new Map<number, number[]>();
  const currentMonthByCategory = new Map<number, number[]>();

  for (const transaction of historyExpenses) {
    const amount = Number(transaction.amount);
    const historyList = historyByCategory.get(transaction.category.id) || [];
    historyList.push(amount);
    historyByCategory.set(transaction.category.id, historyList);
  }

  for (const transaction of currentExpenses) {
    const list = currentMonthByCategory.get(transaction.category.id) || [];
    list.push(Number(transaction.amount));
    currentMonthByCategory.set(transaction.category.id, list);
  }

  const anomalies: SpendingAnomaly[] = [];

  for (const transaction of currentExpenses) {
    const amount = Number(transaction.amount);
    const history = historyByCategory.get(transaction.category.id) || [];
    const baseline = mean(history);
    const spread = stdDev(history);
    const threshold = baseline > 0 ? Math.max(baseline * 2.2, baseline + spread * 2) : amount * 0.75;

    if (amount >= threshold && amount >= 250) {
      anomalies.push({
        transactionId: transaction.id,
        categoryId: transaction.category.id,
        categoryName: transaction.category.name,
        amount,
        baselineAmount: Math.round(baseline * 100) / 100,
        anomalyScore: scoreIsolationStyle(amount, baseline, spread),
        reason:
          baseline > 0
            ? `This transaction is significantly higher than the category’s historical average of ${baseline.toFixed(2)}.`
            : "This category has little or no prior spending history, so the transaction stands out as unusual.",
        kind: "transaction",
      });
    }
  }

  for (const [categoryId, currentTotals] of currentMonthByCategory.entries()) {
    const currentTotal = currentTotals.reduce((sum, value) => sum + value, 0);
    const history = historyByCategory.get(categoryId) || [];
    const baseline = mean(history);
    const spread = stdDev(history);
    const threshold = baseline > 0 ? Math.max(baseline * 1.8, baseline + spread * 1.5) : currentTotal * 0.8;

    if (currentTotal >= threshold && currentTotal >= 500) {
      anomalies.push({
        categoryId,
        categoryName: currentExpenses.find((transaction) => transaction.category.id === categoryId)?.category.name || "Unknown",
        amount: currentTotal,
        baselineAmount: Math.round(baseline * 100) / 100,
        anomalyScore: scoreIsolationStyle(currentTotal, baseline, spread),
        reason:
          baseline > 0
            ? "This category’s month-to-date total is materially above its prior spending pattern."
            : "This category has new or sparse history, so month-to-date spend is being highlighted for review.",
        kind: "category",
      });
    }
  }

  return anomalies.sort((left, right) => right.anomalyScore - left.anomalyScore).slice(0, 8);
}