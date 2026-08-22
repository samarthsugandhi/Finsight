import { computeHealthScore } from "../healthScore";
import { detectSpendingAnomalies } from "../spendingAnomaly";

let failures = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${name}${detail ? " — " + detail : ""}`);
  } else {
    console.log(`PASS: ${name}`);
  }
}

// --- healthScore.ts ---

// 1. Perfect score: everything maxed out, debt=0, full emergency fund
const perfect = computeHealthScore({
  income: 100000,
  expense: 70000, // savings rate 30% >= 20% ideal -> maxed
  budgetLimit: 50000,
  budgetSpent: 40000, // within budget
  holdingTypesCount: 5, // all 5 types
  emergencyFundAmount: 60000, // 6+ months at 10k/mo avg
  monthlyExpenseAvg: 10000,
  totalDebt: 0,
  totalAssets: 100000,
});
assert("perfect score is 100", perfect.score === 100, `got ${perfect.score}`);
assert("perfect debtRatio breakdown is 100", perfect.breakdown.debtRatio === 100);
assert("perfect emergencyFund breakdown is 100", perfect.breakdown.emergencyFund === 100);

// 2. Missing debt AND missing emergency fund -> both null, weight renormalized
// over savings(30) + budget(20) + diversification(20) = 70, all maxed -> should still be 100
const missingBoth = computeHealthScore({
  income: 100000,
  expense: 70000,
  budgetLimit: 50000,
  budgetSpent: 40000,
  holdingTypesCount: 5,
  emergencyFundAmount: null,
  monthlyExpenseAvg: 10000,
  totalDebt: null,
  totalAssets: 100000,
});
assert("missing debt+ef score still 100 when other components maxed", missingBoth.score === 100, `got ${missingBoth.score}`);
assert("missing debt -> debtRatio null", missingBoth.breakdown.debtRatio === null);
assert("missing ef -> emergencyFund null", missingBoth.breakdown.emergencyFund === null);

// 3. Missing debt/ef must NOT silently equal a 0-scored (very bad) case.
// Compare: someone with $0 emergency fund but savings/budget/diversification maxed
// should score LOWER than someone with an unset (unavailable) emergency fund.
const zeroEF = computeHealthScore({
  income: 100000,
  expense: 70000,
  budgetLimit: 50000,
  budgetSpent: 40000,
  holdingTypesCount: 5,
  emergencyFundAmount: 0, // explicitly has $0 saved -> real score of 0 for this component
  monthlyExpenseAvg: 10000,
  totalDebt: null,
  totalAssets: 100000,
});
assert(
  "explicit $0 emergency fund scores strictly lower than 'unavailable'",
  zeroEF.score < missingBoth.score,
  `zeroEF=${zeroEF.score} missingBoth=${missingBoth.score}`
);
assert("explicit $0 emergency fund breakdown is 0, not null", zeroEF.breakdown.emergencyFund === 0);

// 4. Zero income edge case should not throw / NaN
const zeroIncome = computeHealthScore({
  income: 0,
  expense: 0,
  budgetLimit: 0,
  budgetSpent: 0,
  holdingTypesCount: 0,
  emergencyFundAmount: null,
  monthlyExpenseAvg: 0,
  totalDebt: null,
  totalAssets: 0,
});
assert("zero-income edge case doesn't produce NaN", !Number.isNaN(zeroIncome.score), `got ${zeroIncome.score}`);
assert("zero-income edge case score is a finite number", Number.isFinite(zeroIncome.score));

// 5. Score is always within [0, 100]
for (const income of [0, 1000, 50000]) {
  for (const expense of [0, 500, 100000]) {
    const r = computeHealthScore({
      income, expense, budgetLimit: 1000, budgetSpent: expense,
      holdingTypesCount: 3, emergencyFundAmount: 500, monthlyExpenseAvg: 1000,
      totalDebt: 200, totalAssets: 5000,
    });
    assert(`score in range for income=${income} expense=${expense}`, r.score >= 0 && r.score <= 100, `got ${r.score}`);
  }
}

// --- spendingAnomaly.ts ---

const mkTx = (id: number, amount: number, categoryId: number, categoryName: string, date: Date) => ({
  id, amount, type: "EXPENSE" as const, date, category: { id: categoryId, name: categoryName },
});

// Category with a stable history of ~1000/month; one 5000 transaction this month should flag
const history = [1, 2, 3, 4, 5].map((i) => mkTx(i, 1000 + i * 10, 1, "Groceries", new Date(2026, i - 7, 1)));
const thisMonth = [mkTx(100, 5000, 1, "Groceries", new Date())];
const anomalies = detectSpendingAnomalies(thisMonth, history);
assert("large outlier transaction is flagged", anomalies.some((a) => a.transactionId === 100), JSON.stringify(anomalies));

// Normal transaction close to baseline should NOT be flagged
const normalTx = [mkTx(101, 1010, 1, "Groceries", new Date())];
const noAnomalies = detectSpendingAnomalies(normalTx, history);
assert("normal transaction near baseline is not flagged", noAnomalies.length === 0, JSON.stringify(noAnomalies));

// Small amounts below the $250 floor should never be flagged even if "unusual"
const tinyTx = [mkTx(102, 50, 2, "Misc", new Date())];
const tinyAnomalies = detectSpendingAnomalies(tinyTx, []);
assert("sub-$250 transaction with no history is not flagged", tinyAnomalies.length === 0, JSON.stringify(tinyAnomalies));

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
