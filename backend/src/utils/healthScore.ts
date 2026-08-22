/**
 * Financial Health Score — weighted composite out of 100.
 *
 * Weights (as defined in the project synopsis):
 *   Savings Rate                30%
 *   Budget Discipline           20%
 *   Investment Diversification  20%
 *   Emergency Fund Coverage     20%
 *   Debt Ratio                  10%
 *
 * A transparent rule-based formula that handles missing/unavailable data
 * dynamically: any component whose underlying data isn't available is
 * dropped from the score and its weight is redistributed across the
 * remaining components, rather than being silently treated as 0.
 */

export interface HealthScoreInput {
  income: number;
  expense: number;
  budgetLimit: number;
  budgetSpent: number;
  holdingTypesCount: number;
  // Null/undefined indicates unavailable/insufficient data (e.g. user has
  // not designated an emergency-fund goal yet) — this is NOT the same as 0.
  emergencyFundAmount?: number | null;
  monthlyExpenseAvg: number;
  totalDebt?: number | null; // Null/undefined indicates unavailable/insufficient data
  totalAssets: number;
}

export interface HealthScoreResult {
  score: number;
  breakdown: {
    savingsRate: number;
    budgetDiscipline: number;
    diversification: number;
    emergencyFund: number | null; // Null indicates unavailable
    debtRatio: number | null; // Null indicates unavailable
  };
}

const WEIGHTS = {
  savingsRate: 0.3,
  budgetDiscipline: 0.2,
  diversification: 0.2,
  emergencyFund: 0.2,
  debtRatio: 0.1,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const {
    income,
    expense,
    budgetLimit,
    budgetSpent,
    holdingTypesCount,
    emergencyFundAmount,
    monthlyExpenseAvg,
    totalDebt,
    totalAssets,
  } = input;

  // 1. Savings Rate: (income - expense) / income, ideal >= 20%
  const savingsRateRaw = income > 0 ? (income - expense) / income : 0;
  const savingsRateScore = clamp01(savingsRateRaw / 0.2);

  // 2. Budget Discipline: how much of the budget limit was NOT overshot.
  // No budget set at all is treated as neutral (full score) rather than
  // penalized, since there's nothing to have exceeded.
  const budgetDisciplineScore =
    budgetLimit > 0 ? clamp01(1 - Math.max(0, budgetSpent - budgetLimit) / budgetLimit) : 1;

  // 3. Investment Diversification: number of distinct holding types out of 5 possible
  const diversificationScore = clamp01(holdingTypesCount / 5);

  // 4. Emergency Fund Coverage: months of expenses covered, ideal >= 6 months.
  // Unavailable (no emergency-fund goal set) is distinct from "$0 saved" —
  // both are handled, but only a genuine null/undefined drops the weight.
  const isEmergencyFundAvailable = emergencyFundAmount !== undefined && emergencyFundAmount !== null;
  const monthsCovered =
    isEmergencyFundAvailable && monthlyExpenseAvg > 0 ? emergencyFundAmount / monthlyExpenseAvg : 0;
  const emergencyFundScore = isEmergencyFundAvailable ? clamp01(monthsCovered / 6) : 0;

  // 5. Debt Ratio: unavailable unless the caller supplies real debt data.
  const isDebtAvailable = totalDebt !== undefined && totalDebt !== null;
  const debtRatioRaw = isDebtAvailable ? (totalAssets > 0 ? totalDebt / totalAssets : totalDebt > 0 ? 1 : 0) : 0;
  const debtRatioScore = isDebtAvailable ? clamp01(1 - debtRatioRaw) : 0;

  // Only sum the weights of components we actually have data for, then
  // rescale so the final score is still out of 100 — this is what lets us
  // avoid assuming missing data (debt, emergency fund) is 0.
  const totalWeight =
    WEIGHTS.savingsRate +
    WEIGHTS.budgetDiscipline +
    WEIGHTS.diversification +
    (isEmergencyFundAvailable ? WEIGHTS.emergencyFund : 0) +
    (isDebtAvailable ? WEIGHTS.debtRatio : 0);

  const weighted =
    savingsRateScore * WEIGHTS.savingsRate +
    budgetDisciplineScore * WEIGHTS.budgetDiscipline +
    diversificationScore * WEIGHTS.diversification +
    (isEmergencyFundAvailable ? emergencyFundScore * WEIGHTS.emergencyFund : 0) +
    (isDebtAvailable ? debtRatioScore * WEIGHTS.debtRatio : 0);

  const score = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0;

  return {
    score,
    breakdown: {
      savingsRate: Math.round(savingsRateRaw * 100), // Actual savings rate %, for display
      budgetDiscipline: Math.round(budgetDisciplineScore * 100),
      diversification: Math.round(diversificationScore * 100),
      emergencyFund: isEmergencyFundAvailable ? Math.round(emergencyFundScore * 100) : null,
      debtRatio: isDebtAvailable ? Math.round(debtRatioScore * 100) : null,
    },
  };
}
