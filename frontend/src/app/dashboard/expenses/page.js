"use client";

import { PageHeader } from "@/components/ui";
import TransactionsView from "@/components/TransactionsView";
import { useFinance } from "@/context/FinanceContext";

export default function ExpensesPage() {
  const store = useFinance();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <PageHeader title="Expenses" description="A filtered view of your transactions where type = EXPENSE." />
      <TransactionsView store={store} fixedType="EXPENSE" />
    </div>
  );
}
