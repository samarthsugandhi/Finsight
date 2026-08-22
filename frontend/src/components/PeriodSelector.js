"use client";

import { Card } from "@/components/ui";

export const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export const YEAR_OPTIONS = [2024, 2025, 2026, 2027];

export default function PeriodSelector({
  periodMode,
  setPeriodMode,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  allowAllTime = true,
  loading = false,
}) {
  const modes = [
    { id: "monthly", label: "Monthly" },
    { id: "yearly", label: "Yearly" },
  ];
  if (allowAllTime) {
    modes.push({ id: "all_time", label: "All Time" });
  }

  return (
    <Card className="mb-6 bg-paper-raised/90 border border-line/60">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Period:</span>
          <div className="flex items-center rounded-lg bg-paper p-1 border border-line">
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriodMode(item.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors duration-200 ${
                  periodMode === item.id
                    ? "bg-horizon text-[#0f1b33] shadow-sm font-bold"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {periodMode === "monthly" && (
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink font-editorial focus:outline-none focus:border-horizon cursor-pointer"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink font-editorial focus:outline-none focus:border-horizon cursor-pointer"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {periodMode === "yearly" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-soft font-editorial">Select Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink font-editorial focus:outline-none focus:border-horizon cursor-pointer"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {periodMode === "all_time" && (
          <span className="text-xs text-ink-soft font-editorial italic">
            Showing all historical data
          </span>
        )}

        {loading && (
          <span className="text-xs text-horizon font-editorial animate-pulse flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-horizon animate-ping" />
            Updating entries…
          </span>
        )}
      </div>
    </Card>
  );
}
