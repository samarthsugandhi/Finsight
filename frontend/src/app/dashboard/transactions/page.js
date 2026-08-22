"use client";

import { PageHeader } from "@/components/ui";
import TransactionsView from "@/components/TransactionsView";
import { useFinance } from "@/context/FinanceContext";

export default function TransactionsPage() {
  const store = useFinance();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <PageHeader title="All Transactions" description="Your full financial ledger — every income and expense entry." />
      <TransactionsView store={store} />
    </div>
  );
}
