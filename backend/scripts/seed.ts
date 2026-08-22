import "dotenv/config";
import { prisma } from "../src/database/prisma";

const EXPENSE_CATEGORIES = [
  "Food & Dining", "Rent & Housing", "Transportation", "Utilities", "Entertainment",
  "Shopping", "Healthcare", "Education", "EMI & Loans", "Miscellaneous",
];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Investment Returns", "Gifts", "Other Income"];

async function main() {
  for (const name of EXPENSE_CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name, type: "EXPENSE" } });
  }
  for (const name of INCOME_CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name, type: "INCOME" } });
  }
  console.log("Seeded default categories.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
