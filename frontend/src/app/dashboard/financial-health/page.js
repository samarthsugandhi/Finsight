"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card, ErrorState } from "@/components/ui";
import { HealthGauge, HealthBreakdown } from "@/components/HealthScoreDisplay";
import PeriodSelector from "@/components/PeriodSelector";
import { useFinance } from "@/context/FinanceContext";
import { api } from "@/lib/api";

export default function FinancialHealthPage() {
  const { loading: initialLoading, error, refetch } = useFinance();

  const now = new Date();
  const [periodMode, setPeriodMode] = useState("monthly"); // "monthly" | "yearly"
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [healthData, setHealthData] = useState(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState("");

  const fetchHealthScore = useCallback(async (mode, m, y) => {
    setPeriodLoading(true);
    setPeriodError("");
    const query = mode === "yearly" ? `?period=yearly&year=${y}` : `?period=monthly&month=${m}&year=${y}`;
    try {
      const res = await api.healthScore(query);
      setHealthData(res);
    } catch (err) {
      setPeriodError(err.message || "Failed to load health score for selected period.");
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      fetchHealthScore(periodMode, selectedMonth, selectedYear);
    }
  }, [initialLoading, periodMode, selectedMonth, selectedYear, fetchHealthScore]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <PageHeader
        title="Financial Health"
        description="Your composite score out of 100, calculated for the selected period."
      />
      <ErrorState message={error} onRetry={refetch} />

      <PeriodSelector
        periodMode={periodMode}
        setPeriodMode={setPeriodMode}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        allowAllTime={false}
        loading={periodLoading}
      />

      {periodError && (
        <div className="mb-4">
          <ErrorState message={periodError} onRetry={() => fetchHealthScore(periodMode, selectedMonth, selectedYear)} />
        </div>
      )}

      {initialLoading ? (
        <div className="h-96 animate-pulse rounded-xl bg-ink/5" />
      ) : !healthData ? null : (
        <div className={`grid gap-8 lg:grid-cols-[1fr_1.3fr] transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
          <div>
            <Card className="space-y-5">
              <HealthGauge score={healthData.score} />
              <p className="text-center font-editorial text-xs text-ink-soft">
                Financial Health Score: <span className="font-figure font-semibold text-ink">{Math.round(healthData.score)} / 100</span>
              </p>
            </Card>

            {healthData.recommendations?.length ? (
              <Card className="mt-4 space-y-2 text-xs text-ink-soft font-editorial">
                <p className="text-ink font-semibold text-sm mb-1">Recommendations</p>
                {healthData.recommendations.map((recommendation, idx) => (
                  <p key={idx}>• {recommendation}</p>
                ))}
              </Card>
            ) : null}
          </div>

          <div>
            <p className="font-editorial text-sm text-ink-soft mb-2">
              Each component below is weighted and summed into your overall score for the selected period. Where underlying data is unavailable, that component is shown as{" "}
              <span className="font-semibold text-ink">Insufficient Data</span> and its weight is redistributed across available metrics.
            </p>
            <HealthBreakdown health={healthData} showWeights />
          </div>
        </div>
      )}
    </div>
  );
}
