"use client";

import { PageHeader } from "@/components/ui";
import TransactionsView from "@/components/TransactionsView";
import { useFinance } from "@/context/FinanceContext";

export default function IncomePage() {
  const store = useFinance();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <PageHeader title="Income" description="A filtered view of your transactions where type = INCOME." />
      <TransactionsView store={store} fixedType="INCOME" />
    </div>
  );
}
