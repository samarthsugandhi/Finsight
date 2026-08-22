import {
  PrismaClient,
  TransactionType,
  HoldingType,
  TransactionSide,
  MarketDataStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Finsight demo seed...\n");

  // ============================================================
  // 1. CATEGORIES
  // ============================================================

  const categories = [
    // EXPENSE
    { name: "Food", type: TransactionType.EXPENSE },
    { name: "Rent", type: TransactionType.EXPENSE },
    { name: "Transport", type: TransactionType.EXPENSE },
    { name: "Shopping", type: TransactionType.EXPENSE },
    { name: "Bills", type: TransactionType.EXPENSE },
    { name: "Entertainment", type: TransactionType.EXPENSE },
    { name: "Healthcare", type: TransactionType.EXPENSE },
    { name: "Education", type: TransactionType.EXPENSE },
    { name: "Travel", type: TransactionType.EXPENSE },
    { name: "Other Expense", type: TransactionType.EXPENSE },

    // INCOME
    { name: "Salary", type: TransactionType.INCOME },
    { name: "Freelance", type: TransactionType.INCOME },
    { name: "Business", type: TransactionType.INCOME },
    { name: "Investment", type: TransactionType.INCOME },
    { name: "Interest", type: TransactionType.INCOME },
    { name: "Bonus", type: TransactionType.INCOME },
    { name: "Gift", type: TransactionType.INCOME },
    { name: "Other Income", type: TransactionType.INCOME },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { type: category.type },
      create: category,
    });
  }

  console.log("✓ Categories created");

  // ============================================================
  // 2. DEMO USER
  // ============================================================

  const passwordHash = await bcrypt.hash("Demo@1234", 10);

  const user = await prisma.user.upsert({
    where: {
      email: "demo@finsight.com",
    },
    update: {
      name: "Demo User",
      passwordHash,
    },
    create: {
      name: "Demo User",
      email: "demo@finsight.com",
      passwordHash,
    },
  });

  console.log("✓ Demo user created");

  // ============================================================
  // 3. GET CATEGORY IDs
  // ============================================================

  const categoryMap = new Map<string, number>();

  const allCategories = await prisma.category.findMany();

  for (const category of allCategories) {
    categoryMap.set(category.name, category.id);
  }

  const categoryId = (name: string) => {
    const id = categoryMap.get(name);

    if (!id) {
      throw new Error(`Category not found: ${name}`);
    }

    return id;
  };

  // ============================================================
  // 4. CLEAR OLD DEMO DATA
  // ============================================================

  await prisma.portfolioTransaction.deleteMany({
    where: { userId: user.id },
  });

  await prisma.portfolioHolding.deleteMany({
    where: { userId: user.id },
  });

  await prisma.goalContribution.deleteMany({
    where: { userId: user.id },
  });

  await prisma.goal.deleteMany({
    where: { userId: user.id },
  });

  await prisma.budget.deleteMany({
    where: { userId: user.id },
  });

  await prisma.transaction.deleteMany({
    where: { userId: user.id },
  });

  console.log("✓ Previous demo data cleared");

  // ============================================================
  // 5. TRANSACTIONS
  // JUNE 2026
  // ============================================================

  const transactions = [
    // ---------------- JUNE INCOME ----------------

    {
      amount: 50000,
      type: TransactionType.INCOME,
      category: "Salary",
      description: "Monthly Salary",
      date: new Date("2026-06-01"),
    },
    {
      amount: 3000,
      type: TransactionType.INCOME,
      category: "Freelance",
      description: "Freelance Project",
      date: new Date("2026-06-10"),
    },

    // ---------------- JUNE EXPENSE ----------------

    {
      amount: 10000,
      type: TransactionType.EXPENSE,
      category: "Rent",
      description: "Monthly Rent",
      date: new Date("2026-06-02"),
    },
    {
      amount: 4800,
      type: TransactionType.EXPENSE,
      category: "Food",
      description: "Groceries and Food",
      date: new Date("2026-06-07"),
    },
    {
      amount: 2200,
      type: TransactionType.EXPENSE,
      category: "Transport",
      description: "Fuel and Transport",
      date: new Date("2026-06-12"),
    },
    {
      amount: 3500,
      type: TransactionType.EXPENSE,
      category: "Shopping",
      description: "Clothing and Shopping",
      date: new Date("2026-06-15"),
    },
    {
      amount: 2600,
      type: TransactionType.EXPENSE,
      category: "Bills",
      description: "Electricity and Internet",
      date: new Date("2026-06-18"),
    },
    {
      amount: 1800,
      type: TransactionType.EXPENSE,
      category: "Entertainment",
      description: "Movies and Entertainment",
      date: new Date("2026-06-21"),
    },
    {
      amount: 1400,
      type: TransactionType.EXPENSE,
      category: "Healthcare",
      description: "Medicine",
      date: new Date("2026-06-24"),
    },
    {
      amount: 1700,
      type: TransactionType.EXPENSE,
      category: "Education",
      description: "Online Course",
      date: new Date("2026-06-26"),
    },
    {
      amount: 1800,
      type: TransactionType.EXPENSE,
      category: "Travel",
      description: "Weekend Travel",
      date: new Date("2026-06-28"),
    },

    // ============================================================
    // JULY 2026
    // ============================================================

    {
      amount: 52000,
      type: TransactionType.INCOME,
      category: "Salary",
      description: "Monthly Salary",
      date: new Date("2026-07-01"),
    },
    {
      amount: 3000,
      type: TransactionType.INCOME,
      category: "Freelance",
      description: "Freelance Project",
      date: new Date("2026-07-08"),
    },

    {
      amount: 10000,
      type: TransactionType.EXPENSE,
      category: "Rent",
      description: "Monthly Rent",
      date: new Date("2026-07-02"),
    },
    {
      amount: 5200,
      type: TransactionType.EXPENSE,
      category: "Food",
      description: "Food and Groceries",
      date: new Date("2026-07-06"),
    },
    {
      amount: 2500,
      type: TransactionType.EXPENSE,
      category: "Transport",
      description: "Fuel and Transport",
      date: new Date("2026-07-11"),
    },
    {
      amount: 4200,
      type: TransactionType.EXPENSE,
      category: "Shopping",
      description: "Shopping",
      date: new Date("2026-07-14"),
    },
    {
      amount: 2700,
      type: TransactionType.EXPENSE,
      category: "Bills",
      description: "Utility Bills",
      date: new Date("2026-07-17"),
    },
    {
      amount: 2200,
      type: TransactionType.EXPENSE,
      category: "Entertainment",
      description: "Entertainment",
      date: new Date("2026-07-20"),
    },
    {
      amount: 1500,
      type: TransactionType.EXPENSE,
      category: "Healthcare",
      description: "Healthcare",
      date: new Date("2026-07-22"),
    },
    {
      amount: 2000,
      type: TransactionType.EXPENSE,
      category: "Education",
      description: "Learning Resources",
      date: new Date("2026-07-24"),
    },
    {
      amount: 2000,
      type: TransactionType.EXPENSE,
      category: "Travel",
      description: "Travel",
      date: new Date("2026-07-27"),
    },

    // ============================================================
    // AUGUST 2026
    // ============================================================

    {
      amount: 55000,
      type: TransactionType.INCOME,
      category: "Salary",
      description: "Monthly Salary",
      date: new Date("2026-08-01"),
    },
    {
      amount: 4000,
      type: TransactionType.INCOME,
      category: "Freelance",
      description: "Freelance Work",
      date: new Date("2026-08-05"),
    },
    {
      amount: 1500,
      type: TransactionType.INCOME,
      category: "Interest",
      description: "Savings Interest",
      date: new Date("2026-08-10"),
    },

    {
      amount: 10000,
      type: TransactionType.EXPENSE,
      category: "Rent",
      description: "Monthly Rent",
      date: new Date("2026-08-02"),
    },
    {
      amount: 5000,
      type: TransactionType.EXPENSE,
      category: "Food",
      description: "Food and Groceries",
      date: new Date("2026-08-06"),
    },
    {
      amount: 2300,
      type: TransactionType.EXPENSE,
      category: "Transport",
      description: "Fuel and Transport",
      date: new Date("2026-08-09"),
    },
    {
      amount: 3000,
      type: TransactionType.EXPENSE,
      category: "Shopping",
      description: "Shopping",
      date: new Date("2026-08-12"),
    },
    {
      amount: 2600,
      type: TransactionType.EXPENSE,
      category: "Bills",
      description: "Electricity and Internet",
      date: new Date("2026-08-15"),
    },
    {
      amount: 1800,
      type: TransactionType.EXPENSE,
      category: "Entertainment",
      description: "Entertainment",
      date: new Date("2026-08-16"),
    },
    {
      amount: 1200,
      type: TransactionType.EXPENSE,
      category: "Healthcare",
      description: "Medicine",
      date: new Date("2026-08-17"),
    },
    {
      amount: 1800,
      type: TransactionType.EXPENSE,
      category: "Education",
      description: "Learning Resources",
      date: new Date("2026-08-18"),
    },
  ];

  for (const t of transactions) {
    await prisma.transaction.create({
      data: {
        amount: t.amount,
        type: t.type,
        description: t.description,
        date: t.date,
        userId: user.id,
        categoryId: categoryId(t.category),
      },
    });
  }

  console.log(`✓ ${transactions.length} transactions created`);

  // ============================================================
  // 6. BUDGETS
  // ============================================================

  const budgets = [
    // June
    { category: "Food", limit: 5500, month: 6 },
    { category: "Transport", limit: 3000, month: 6 },
    { category: "Shopping", limit: 4000, month: 6 },
    { category: "Entertainment", limit: 2500, month: 6 },

    // July
    { category: "Food", limit: 5500, month: 7 },
    { category: "Transport", limit: 3000, month: 7 },
    { category: "Shopping", limit: 4000, month: 7 },
    { category: "Entertainment", limit: 2500, month: 7 },

    // August
    { category: "Food", limit: 5500, month: 8 },
    { category: "Transport", limit: 3000, month: 8 },
    { category: "Shopping", limit: 3500, month: 8 },
    { category: "Entertainment", limit: 2500, month: 8 },
  ];

  for (const budget of budgets) {
    await prisma.budget.create({
      data: {
        monthlyLimit: budget.limit,
        month: budget.month,
        year: 2026,
        userId: user.id,
        categoryId: categoryId(budget.category),
      },
    });
  }

  console.log(`✓ ${budgets.length} budgets created`);

  // ============================================================
  // 7. SAVINGS GOALS
  // ============================================================

  const emergencyGoal = await prisma.goal.create({
    data: {
      title: "Emergency Fund",
      targetAmount: 100000,
      targetDate: new Date("2027-03-31"),
      isEmergencyFund: true,
      userId: user.id,
    },
  });

  const laptopGoal = await prisma.goal.create({
    data: {
      title: "New Laptop",
      targetAmount: 90000,
      targetDate: new Date("2026-12-31"),
      isEmergencyFund: false,
      userId: user.id,
    },
  });

  const travelGoal = await prisma.goal.create({
    data: {
      title: "Vacation Fund",
      targetAmount: 50000,
      targetDate: new Date("2027-01-31"),
      isEmergencyFund: false,
      userId: user.id,
    },
  });

  // Contributions come from the user's savings allocation.
  await prisma.goalContribution.createMany({
    data: [
      {
        amount: 12000,
        date: new Date("2026-06-30"),
        note: "June savings allocation",
        goalId: emergencyGoal.id,
        userId: user.id,
      },
      {
        amount: 8000,
        date: new Date("2026-06-30"),
        note: "June savings allocation",
        goalId: laptopGoal.id,
        userId: user.id,
      },
      {
        amount: 5000,
        date: new Date("2026-07-31"),
        note: "July savings allocation",
        goalId: emergencyGoal.id,
        userId: user.id,
      },
      {
        amount: 10000,
        date: new Date("2026-07-31"),
        note: "July savings allocation",
        goalId: laptopGoal.id,
        userId: user.id,
      },
      {
        amount: 3000,
        date: new Date("2026-08-10"),
        note: "August savings allocation",
        goalId: emergencyGoal.id,
        userId: user.id,
      },
      {
        amount: 7000,
        date: new Date("2026-08-15"),
        note: "August savings allocation",
        goalId: travelGoal.id,
        userId: user.id,
      },
    ],
  });

  console.log("✓ Savings goals and contributions created");

  // ============================================================
  // 8. PORTFOLIO HOLDINGS
  // ============================================================

  // TCS
  const tcs = await prisma.portfolioHolding.create({
    data: {
      type: HoldingType.STOCK,
      name: "TCS",
      symbol: "TCS:NSE",
      userId: user.id,
    },
  });

  // Reliance
  const reliance = await prisma.portfolioHolding.create({
    data: {
      type: HoldingType.STOCK,
      name: "Reliance Industries",
      symbol: "RELIANCE:NSE",
      userId: user.id,
    },
  });

  // HDFC Bank
  const hdfc = await prisma.portfolioHolding.create({
    data: {
      type: HoldingType.STOCK,
      name: "HDFC Bank",
      symbol: "HDFCBANK:NSE",
      userId: user.id,
    },
  });

  // Bitcoin
  const bitcoin = await prisma.portfolioHolding.create({
    data: {
      type: HoldingType.CRYPTO,
      name: "Bitcoin",
      symbol: "BTC/USD",
      userId: user.id,
    },
  });

  // Mutual Fund - manually priced
  const mutualFund = await prisma.portfolioHolding.create({
    data: {
      type: HoldingType.MUTUAL_FUND,
      name: "SBI Nifty Index Fund",
      manualPrice: 215.45,
      userId: user.id,
    },
  });

  // Gold - manually priced
  const gold = await prisma.portfolioHolding.create({
    data: {
      type: HoldingType.GOLD,
      name: "Gold",
      manualPrice: 10550,
      userId: user.id,
    },
  });

  console.log("✓ Portfolio holdings created");

  // ============================================================
  // 9. PORTFOLIO BUY TRANSACTIONS
  // ============================================================

  await prisma.portfolioTransaction.createMany({
    data: [
      // TCS
      {
        side: TransactionSide.BUY,
        quantity: 5,
        price: 3450,
        date: new Date("2026-06-05"),
        holdingId: tcs.id,
        userId: user.id,
      },

      // Reliance
      {
        side: TransactionSide.BUY,
        quantity: 8,
        price: 1450,
        date: new Date("2026-06-12"),
        holdingId: reliance.id,
        userId: user.id,
      },

      // HDFC Bank
      {
        side: TransactionSide.BUY,
        quantity: 10,
        price: 1650,
        date: new Date("2026-07-05"),
        holdingId: hdfc.id,
        userId: user.id,
      },

      // Bitcoin
      {
        side: TransactionSide.BUY,
        quantity: 0.02,
        price: 105000,
        date: new Date("2026-07-15"),
        holdingId: bitcoin.id,
        userId: user.id,
      },

      // Mutual Fund
      {
        side: TransactionSide.BUY,
        quantity: 100,
        price: 180,
        date: new Date("2026-06-20"),
        holdingId: mutualFund.id,
        userId: user.id,
      },

      // Gold
      {
        side: TransactionSide.BUY,
        quantity: 10,
        price: 7200,
        date: new Date("2026-06-25"),
        holdingId: gold.id,
        userId: user.id,
      },
    ],
  });

  console.log("✓ Portfolio transactions created");

  // ============================================================
  // 10. MARKET PRICE CACHE
  // ============================================================

  // These are initial cached values only.
  // Your market-data service can overwrite them when live data arrives.

  const marketPrices = [
    {
      symbol: "TCS:NSE",
      assetType: HoldingType.STOCK,
      price: 3600,
      previousPrice: 3575,
      changePct: 0.6993,
      currency: "INR",
    },
    {
      symbol: "RELIANCE:NSE",
      assetType: HoldingType.STOCK,
      price: 1505,
      previousPrice: 1492,
      changePct: 0.8713,
      currency: "INR",
    },
    {
      symbol: "HDFCBANK:NSE",
      assetType: HoldingType.STOCK,
      price: 1705,
      previousPrice: 1690,
      changePct: 0.8876,
      currency: "INR",
    },
    {
      symbol: "BTC/USD",
      assetType: HoldingType.CRYPTO,
      price: 112000,
      previousPrice: 110500,
      changePct: 1.3575,
      currency: "USD",
    },
  ];

  for (const market of marketPrices) {
    await prisma.marketPriceCache.upsert({
      where: {
        symbol: market.symbol,
      },
      update: {
        price: market.price,
        previousPrice: market.previousPrice,
        changePct: market.changePct,
        currency: market.currency,
        lastSuccessfulFetch: new Date(),
        lastAttemptAt: new Date(),
        source: "DEMO_SEED",
        status: MarketDataStatus.SUCCESS,
      },
      create: {
        symbol: market.symbol,
        assetType: market.assetType,
        price: market.price,
        previousPrice: market.previousPrice,
        changePct: market.changePct,
        currency: market.currency,
        lastSuccessfulFetch: new Date(),
        lastAttemptAt: new Date(),
        source: "DEMO_SEED",
        status: MarketDataStatus.SUCCESS,
      },
    });
  }

  console.log("✓ Market price cache created");

  // ============================================================
  // SUMMARY
  // ============================================================

  console.log("\n======================================");
  console.log("      FINSIGHT DEMO DATA READY");
  console.log("======================================");
  console.log(`User: demo@gmail.com`);
  console.log(`Password: Demo@1234`);
  console.log("--------------------------------------");
  console.log("Transactions : 3 months");
  console.log("Budgets      : June / July / August");
  console.log("Goals        : 3");
  console.log("Portfolio    : 6 holdings");
  console.log("Market Cache : 4 live-price symbols");
  console.log("======================================\n");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });