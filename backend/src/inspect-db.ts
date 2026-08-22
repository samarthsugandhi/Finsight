import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function inspect() {
  const [categories, transactions, budgets, goals, holdings] = await Promise.all([
    prisma.category.findMany(),
    prisma.transaction.findMany(),
    prisma.budget.findMany(),
    prisma.goal.findMany(),
    prisma.portfolioHolding.findMany(),
  ]);

  console.log("\n--- Categories ---");
  console.log(categories.map(c => ({ id: c.id, name: c.name })));

  console.log("\n--- Transactions ---");
  console.log(transactions.map(t => ({ id: t.id, description: t.description, amount: t.amount })));

  console.log("\n--- Budgets ---");
  console.log(budgets.map(b => ({ id: b.id, categoryId: b.categoryId, limit: b.monthlyLimit })));

  console.log("\n--- Goals ---");
  console.log(goals.map(g => ({ id: g.id, title: g.title })));

  console.log("\n--- Holdings ---");
  console.log(holdings.map(h => ({ id: h.id, name: h.name })));
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
