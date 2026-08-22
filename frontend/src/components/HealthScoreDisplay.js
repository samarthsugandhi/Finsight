"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui";

export const BREAKDOWN_ORDER = ["savingsRate", "budgetDiscipline", "diversification", "emergencyFund", "debtRatio"];

export const BREAKDOWN_LABELS = {
  savingsRate: "Savings Rate",
  budgetDiscipline: "Budget Discipline",
  diversification: "Investment Diversification",
  emergencyFund: "Emergency Fund Coverage",
  debtRatio: "Debt Ratio",
};

export const BREAKDOWN_WEIGHTS = {
  savingsRate: "30%",
  budgetDiscipline: "20%",
  diversification: "20%",
  emergencyFund: "20%",
  debtRatio: "10%",
};

export function HealthGauge({ score = 0 }) {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  const validScore = typeof score === "number" && !isNaN(score) ? score : 0;

  return (
    <div className="relative mx-auto grid h-44 w-44 place-items-center">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="var(--color-horizon)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (Math.max(0, Math.min(100, validScore)) / 100) * circumference}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-figure text-4xl text-ink font-bold">{Math.round(validScore)}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-soft font-editorial font-semibold">Overall score</p>
        </div>
      </div>
    </div>
  );
}

/** `showWeights` adds the fixed spec weight (e.g. "30%") next to each label — used on the dedicated Financial Health page. */
export function HealthBreakdown({ health, showWeights = false }) {
  const breakdown = health?.breakdown || {};
  return (
    <Card className="mt-4 space-y-4">
      {BREAKDOWN_ORDER.map((key, index) => {
        const value = breakdown[key];
        const isNull = value === null || value === undefined;
        return (
          <div key={key}>
            <div className="flex justify-between text-xs font-editorial">
              <span className="text-ink-soft">
                {BREAKDOWN_LABELS[key]}
                {showWeights && <span className="ml-1 text-ink-soft/60">({BREAKDOWN_WEIGHTS[key]})</span>}
              </span>
              <span className="font-figure text-ink font-semibold">{isNull ? "Insufficient Data" : `${value}/100`}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full bg-horizon"
                initial={false}
                animate={{ width: isNull ? "0%" : `${Math.max(0, Math.min(100, value))}%` }}
                transition={{ type: "spring", stiffness: 180, damping: 24, delay: index * 0.08 }}
              />
            </div>
          </div>
        );
      })}
    </Card>
  );
}
