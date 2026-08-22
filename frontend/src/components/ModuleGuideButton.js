"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { X, CheckCircle2, Sparkles, Lightbulb } from "lucide-react";
import { Button, Card } from "@/components/ui";

const MODULE_GUIDES = {
  "/dashboard": {
    title: "Dashboard Overview Guide",
    subtitle: "Your centralized financial command center.",
    overview: "The Dashboard provides a real-time summary of your finances, tracking income, expenses, savings rate, cash flow, and health score.",
    features: [
      "Period Selector (Monthly, Yearly, All Time) to filter all metrics dynamically.",
      "Top-line Stat Cards showing Total Income, Expenses, Savings, Net Worth, and Health Score.",
      "Spending by Category Pie & Bar charts for quick expense distribution.",
      "Recent Transactions list with inline PDF statement ingress.",
      "Portfolio summary and financial health breakdown overview.",
    ],
    tips: "Use the Period Selector at the top to toggle between specific months or full year totals.",
  },
  "/dashboard/transactions": {
    title: "All Transactions Guide",
    subtitle: "Your full financial ledger.",
    overview: "The Transactions page logs every single income and expense entry in your account.",
    features: [
      "Period Selector to inspect transactions for specific months, years, or all time.",
      "Live Search by description or category name.",
      "Filter by Type (Income vs Expense) and Category.",
      "Sort by Date (newest/oldest) or Amount (high/low).",
      "Add, edit, or remove entries directly.",
    ],
    tips: "You can edit description or amount anytime using the inline 'Edit' button on any row.",
  },
  "/dashboard/income": {
    title: "Income Ledger Guide",
    subtitle: "Track your incoming money streams.",
    overview: "Filtered view displaying only income transactions (Salary, Freelance, Investments, Gifts, Interest).",
    features: [
      "Period Selector to inspect income for specific months or years.",
      "Total Income stat card and category breakdown.",
      "Add new income entries directly using the top form.",
    ],
    tips: "Keep freelance and salary entries categorized accurately for clear analytics.",
  },
  "/dashboard/expenses": {
    title: "Expenses Ledger Guide",
    subtitle: "Track your outgoing expenditures.",
    overview: "Filtered view displaying only expense transactions (Rent, Food, Transport, Bills, Shopping, etc.).",
    features: [
      "Period Selector to monitor spend across months or full years.",
      "Total Expense stat card and top spending category breakdown.",
      "Add new expense entries directly.",
    ],
    tips: "Regularly check top expense categories to spot potential areas for budgeting.",
  },
  "/dashboard/budgets": {
    title: "Category Budgets Guide",
    subtitle: "Cap monthly spend and prevent budget overruns.",
    overview: "Set spending limits per category to maintain financial discipline.",
    features: [
      "Monthly Mode: inspect spend vs monthly limit for the selected month.",
      "Yearly Mode: aggregate annual limits vs total annual spend per category.",
      "Status Badges: WITHIN_BUDGET (green) or EXCEEDED (red).",
      "Direct form to allocate monthly limits per category.",
    ],
    tips: "Budgets feed directly into your Financial Health Score (20% weight for budget discipline).",
  },
  "/dashboard/goals": {
    title: "Savings Goals Guide",
    subtitle: "Plan and track progress toward major financial milestones.",
    overview: "Set target amounts and target dates for Emergency Funds, Vacations, Laptops, or House downpayments.",
    features: [
      "Visual progress percentage bars for each goal.",
      "Allocate available monthly savings across your goals.",
      "Mark a goal as your Emergency Fund to factor into your Health Score.",
    ],
    tips: "Creating an Emergency Fund goal automatically unlocks Emergency Fund Coverage scoring in your Financial Health score.",
  },
  "/dashboard/portfolio": {
    title: "Portfolio Asset Tracker Guide",
    subtitle: "Comprehensive multi-asset investment tracker.",
    overview: "Track Stocks, Crypto, Mutual Funds, Gold, and Fixed Deposits in one unified dashboard.",
    features: [
      "Asset Entry: enter Quantity, Average Buy Price, and optional Symbol.",
      "Value Derivation: Current Value = Quantity × Live/Cached Market Price.",
      "Recharts Donut Chart for asset allocation and Area Chart for historical performance value.",
      "Visual Horizontal Timelines comparing Avg Buy Price to Current Price.",
      "Deterministic portfolio text insights and concentration warnings.",
    ],
    tips: "For Stocks and Crypto with symbols (e.g. RELIANCE:NSE, BTC/USD), current price updates automatically.",
  },
  "/dashboard/financial-health": {
    title: "Financial Health Score Guide",
    subtitle: "100-point composite financial wellness score.",
    overview: "Weighted algorithm evaluating overall financial stability across 5 core pillars.",
    features: [
      "Savings Rate (30%): percentage of income saved.",
      "Budget Discipline (20%): adhering to set category limits.",
      "Diversification (20%): spread across different asset types.",
      "Emergency Fund Coverage (20%): months of expenses covered by emergency savings.",
      "Debt Ratio (10%): ratio of total debt to assets.",
      "Period Mode: calculate score for selected Month or Year.",
    ],
    tips: "Redistributes weight automatically if debt or emergency fund data is not configured yet.",
  },
  "/dashboard/analytics": {
    title: "Analytics & Trends Guide",
    subtitle: "Deep visual data trends and historical analysis.",
    overview: "Visual charts for spending distribution, cash flow trends, and budget utilization.",
    features: [
      "Category Breakdown: Pie chart and Bar graph views for Expenses and Income.",
      "Cash Flow Trend: Income vs Expense vs Savings trend lines.",
      "Budget Utilization & Portfolio Allocation summary cards.",
      "Period Selector (Monthly, Yearly, All Time) to filter all graphs.",
    ],
    tips: "Toggle between Pie and Bar graphs in the Category Breakdown card for alternative visual insights.",
  },
  "/dashboard/reports": {
    title: "On-Screen Reports Guide",
    subtitle: "Consolidated executive financial statement.",
    overview: "All-in-one report summarizing income, expenses, savings, health score, budgets, goals, and portfolio.",
    features: [
      "Period Selector to generate report summaries for specific Months, Years, or All Time.",
      "Executive Financial Summary block.",
      "Budget and Goals progress summaries.",
    ],
    tips: "Use this page for a quick end-of-month or end-of-year snapshot review.",
  },
  "/dashboard/settings": {
    title: "Account Settings Guide",
    subtitle: "Manage account and security preferences.",
    overview: "Update your profile name, view account details, or configure system settings.",
    features: [
      "Profile information management.",
      "Account security details.",
    ],
    tips: "Keep your profile name up to date for personalized reports.",
  },
};

export default function ModuleGuideButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentGuide = MODULE_GUIDES[pathname] || {
    title: "Module Guide",
    subtitle: "Instructions and features for this module.",
    overview: "Explore the features and capabilities of this section.",
    features: ["Track your financial progress", "Manage transactions and budgets"],
    tips: "Use the Period Selector at the top of the page to adjust data ranges.",
  };

  return (
    <>
      {/* Movable / Draggable Floating Guide Button with Question Mark */}
      <motion.div
        drag
        dragMomentum={false}
        onDoubleClick={() => setOpen(true)}
        title="Double-click to open Module Guide (Drag anywhere to move)"
        className="fixed bottom-6 right-24 z-40 h-12 w-12 rounded-full bg-paper-raised border-2 border-horizon text-horizon shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-grab active:cursor-grabbing select-none group"
      >
        <span className="font-screamer text-2xl font-bold tracking-tight pointer-events-none">?</span>
        <span className="absolute bottom-full mb-2 hidden group-hover:block whitespace-nowrap rounded bg-ink px-2 py-1 text-[10px] text-paper font-editorial shadow-md pointer-events-none">
          Double-click for {currentGuide.title.replace(" Guide", "")} Guide
        </span>
      </motion.div>

      {/* Guide Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-6 font-editorial">
          <div className="bg-paper-raised border border-line rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-paper">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-horizon/15 border border-horizon/30 flex items-center justify-center text-horizon font-screamer font-bold text-lg">
                  ?
                </div>
                <div>
                  <h2 className="font-screamer text-xl text-ink uppercase tracking-wide leading-none">{currentGuide.title}</h2>
                  <p className="text-xs text-ink-soft mt-0.5">{currentGuide.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-ink-soft hover:text-ink hover:bg-paper transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs leading-relaxed text-ink font-editorial">
              <Card className="bg-horizon/8 border-horizon/25 p-4">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-horizon shrink-0 mt-0.5" />
                  <p className="text-ink font-medium">{currentGuide.overview}</p>
                </div>
              </Card>

              <div>
                <p className="text-xs uppercase font-semibold text-ink-soft tracking-wider mb-2.5 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-horizon" /> Key Features & Controls
                </p>
                <ul className="space-y-2">
                  {currentGuide.features.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-ink-soft">
                      <span className="h-1.5 w-1.5 rounded-full bg-horizon shrink-0 mt-1.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {currentGuide.tips && (
                <Card className="bg-paper p-3.5 border-line/60">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-horizon shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-semibold uppercase text-[9px] text-horizon tracking-wider">Pro Tip</span>
                      <p className="text-ink-soft text-[11px] mt-0.5">{currentGuide.tips}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-line bg-paper flex items-center justify-end">
              <Button type="button" variant="accent" onClick={() => setOpen(false)} className="text-xs font-screamer uppercase cursor-pointer">
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
