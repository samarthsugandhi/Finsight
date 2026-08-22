"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function normalizeTransaction(transaction) {
  return {
    ...transaction,
    categoryName: transaction.category?.name || transaction.Category?.name || "Uncategorized",
  };
}

/**
 * Central data + mutation layer for the whole dashboard. Every dashboard
 * page calls this hook and only renders the slice of state it needs — the
 * fetching/mutation logic itself lives in exactly one place so behavior
 * (ownership, error handling, refetch-after-write) stays consistent across
 * Dashboard, Transactions, Income, Expenses, Budgets, Goals, Portfolio,
 * Financial Health, Analytics, and Reports.
 */
export function useFinanceStore() {
  const [summary, setSummary] = useState(null);
  const [health, setHealth] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [availableSavings, setAvailableSavings] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);

  const loadAll = useCallback(async () => {
    try {
      const [
        summaryData,
        healthData,
        transactionsData,
        categoriesData,
        goalsData,
        portfolioData,
        budgetsData,
        availableSavingsData,
      ] = await Promise.all([
        api.summary(),
        api.healthScore(),
        api.transactions(),
        api.categories(),
        api.goals(),
        api.portfolio(),
        api.budgets(),
        api.availableSavings(),
      ]);

      setSummary(summaryData);
      setHealth(healthData);
      setTransactions(transactionsData.transactions.map(normalizeTransaction));
      setCategories(categoriesData.categories);
      setGoals(goalsData.goals);
      setPortfolio(portfolioData);
      setBudgets(budgetsData.budgets);
      setAvailableSavings(availableSavingsData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (cancelled) return;
      await loadAll();
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  // --- Transactions ---
  async function addTransaction(payload) {
    setError("");
    try {
      await api.addTransaction(payload);
      await loadAll();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  async function updateTransaction(id, payload) {
    setError("");
    try {
      await api.updateTransaction(id, payload);
      await loadAll();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  async function deleteTransaction(id) {
    const snapshot = transactions;
    setPendingDeleteIds((current) => [...current, id]);
    setTransactions((current) => current.filter((item) => item.id !== id));
    try {
      await api.deleteTransaction(id);
      await loadAll();
    } catch (requestError) {
      setTransactions(snapshot);
      setError(requestError.message);
    } finally {
      setPendingDeleteIds((current) => current.filter((item) => item !== id));
    }
  }

  // --- Budgets ---
  async function addBudget(payload) {
    setError("");
    try {
      const now = new Date();
      await api.addBudget({ month: now.getMonth() + 1, year: now.getFullYear(), ...payload });
      await loadAll();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  async function deleteBudget(id) {
    setError("");
    try {
      await api.deleteBudget(id);
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  // --- Goals ---
  async function addGoal(payload) {
    setError("");
    try {
      await api.addGoal(payload);
      await loadAll();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  async function updateGoal(id, payload) {
    setError("");
    try {
      await api.updateGoal(id, payload);
      await loadAll();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  async function allocateSavings(allocations) {
    setError("");
    try {
      await api.allocateSavings(allocations);
      await loadAll();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  async function deleteGoal(id) {
    setError("");
    try {
      await api.deleteGoal(id);
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  // --- Portfolio ---
  async function addHolding(payload) {
    setError("");
    try {
      await api.addHolding(payload);
      await loadAll();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  async function addPortfolioTransaction(holdingId, payload) {
    setError("");
    try {
      await api.addPortfolioTransaction(holdingId, payload);
      await loadAll();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  async function updateManualPrice(holdingId, price) {
    setError("");
    try {
      await api.updateManualPrice(holdingId, price);
      await loadAll();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  async function deleteHolding(id) {
    setError("");
    try {
      await api.deleteHolding(id);
      await loadAll();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return {
    // data
    summary,
    health,
    transactions,
    categories,
    budgets,
    goals,
    portfolio,
    availableSavings,
    loading,
    error,
    setError,
    pendingDeleteIds,
    refetch: loadAll,
    // transactions
    addTransaction,
    updateTransaction,
    deleteTransaction,
    // budgets
    addBudget,
    deleteBudget,
    // goals
    addGoal,
    updateGoal,
    allocateSavings,
    deleteGoal,
    // portfolio
    addHolding,
    addPortfolioTransaction,
    updateManualPrice,
    deleteHolding,
  };
}
