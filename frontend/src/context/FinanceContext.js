"use client";

import { createContext, useContext } from "react";
import { useFinanceStore } from "@/lib/useFinanceStore";

const FinanceContext = createContext(null);

/** Wraps the dashboard layout so every page — and the global FinAI widget —
 * reads and mutates the exact same live data. Previously each page called
 * useFinanceStore() independently, so an action taken in FinAI (or on one
 * page) wouldn't be reflected on whatever page you were actually looking
 * at until a manual reload. One shared instance fixes that. */
export function FinanceProvider({ children }) {
  const store = useFinanceStore();
  return <FinanceContext.Provider value={store}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within a FinanceProvider (dashboard/layout.js)");
  return ctx;
}
