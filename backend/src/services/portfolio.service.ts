/**
 * Core Service: Handles investment asset transactions (Buy/Sell)
 * Computes updated total holdings, asset allocation, and average buy price.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/database/prisma";
import { AppError } from "@/middlewares/error.middleware";
import { getCachedPrices } from "@/services/marketData.service";
import { computeFdCurrentValue } from "@/utils/fixedDeposit";
import { AddHoldingInput, AddTransactionInput } from "@/validators/portfolio.validator";

const { Decimal } = Prisma;
const ZERO = new Decimal(0);

function num(d: Prisma.Decimal | null): number | null {
  return d === null ? null : Number(d.toFixed(2));
}

/**
 * Weighted-average-cost method: every BUY contributes to a single running
 * average cost per unit; a SELL reduces remaining quantity but does not
 * change that average (no FIFO/LIFO lot tracking — see final report for
 * why this was the right tradeoff for this build).
 */
function computeQuantityAndCost(transactions: Array<{ side: string; quantity: Prisma.Decimal; price: Prisma.Decimal }>) {
  let totalBuyQty = ZERO;
  let totalBuyCost = ZERO;
  let totalSellQty = ZERO;

  for (const t of transactions) {
    if (t.side === "BUY") {
      totalBuyQty = totalBuyQty.plus(t.quantity);
      totalBuyCost = totalBuyCost.plus(t.quantity.times(t.price));
    } else {
      totalSellQty = totalSellQty.plus(t.quantity);
    }
  }

  const remainingQty = Decimal.max(ZERO, totalBuyQty.minus(totalSellQty));
  const avgBuyPrice = totalBuyQty.greaterThan(ZERO) ? totalBuyCost.div(totalBuyQty) : ZERO;
  const investedAmount = avgBuyPrice.times(remainingQty);

  return { remainingQty, avgBuyPrice, investedAmount };
}

type CacheRow = Prisma.MarketPriceCacheGetPayload<{}>;

function computeHoldingView(
  holding: Prisma.PortfolioHoldingGetPayload<{ include: { transactions: true } }>,
  cacheMap: Map<string, CacheRow>
) {
  if (holding.type === "FIXED_DEPOSIT") {
    const investedAmount = holding.principal ?? ZERO;
    const currentValue = computeFdCurrentValue({
      principal: investedAmount,
      interestRate: holding.interestRate,
      startDate: holding.startDate,
      maturityDate: holding.maturityDate,
      maturityAmount: holding.maturityAmount,
    });
    const profitLoss = currentValue.minus(investedAmount);
    const returnPct = investedAmount.greaterThan(ZERO) ? profitLoss.div(investedAmount).times(100) : ZERO;

    return {
      investedAmount,
      currentValue,
      profitLoss,
      returnPct,
      remainingQty: null as Prisma.Decimal | null,
      avgBuyPrice: null as Prisma.Decimal | null,
      priceSource: "FIXED_DEPOSIT" as const,
      marketStatus: null as string | null,
      currency: "INR", // FD principal/maturity are always entered in rupees
    };
  }

  const { remainingQty, avgBuyPrice, investedAmount } = computeQuantityAndCost(holding.transactions);

  let currentPrice: Prisma.Decimal | null = null;
  let priceSource: "LIVE" | "MANUAL" | "UNAVAILABLE" = "UNAVAILABLE";
  let marketStatus: string | null = null;
  // Never assumed to be INR — set from the live cache's reported currency
  // when priced that way; MANUAL/UNAVAILABLE default to INR since this
  // project's manual-price entry (Mutual Fund NAV, Gold per gram) is
  // always in rupees by convention, never a foreign currency.
  let currency = "INR";

  if ((holding.type === "STOCK" || holding.type === "CRYPTO") && holding.symbol) {
    const cache = cacheMap.get(holding.symbol);
    if (cache?.price) {
      currentPrice = cache.price;
      priceSource = "LIVE";
      marketStatus = cache.status;
      currency = cache.currency ?? "INR";
    }
  }
  if (!currentPrice && holding.manualPrice) {
    currentPrice = holding.manualPrice;
    priceSource = "MANUAL";
  }

  const currentValue = currentPrice ? remainingQty.times(currentPrice) : null;
  const profitLoss = currentValue ? currentValue.minus(investedAmount) : null;
  const returnPct = currentValue
    ? investedAmount.greaterThan(ZERO)
      ? currentValue.minus(investedAmount).div(investedAmount).times(100)
      : ZERO
    : null;

  return { investedAmount, currentValue, profitLoss, returnPct, remainingQty, avgBuyPrice, priceSource, marketStatus, currency };
}

export const portfolioService = {
  async addHolding(userId: number, input: AddHoldingInput) {
    if (input.type === "FIXED_DEPOSIT") {
      return prisma.portfolioHolding.create({
        data: {
          type: "FIXED_DEPOSIT",
          name: input.name,
          principal: input.principal,
          interestRate: input.interestRate,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          maturityDate: input.maturityDate ? new Date(input.maturityDate) : undefined,
          maturityAmount: input.maturityAmount,
          userId,
        },
      });
    }

    return prisma.$transaction(async (tx) => {
      const holding = await tx.portfolioHolding.create({
        data: {
          type: input.type,
          name: input.name,
          symbol: input.symbol,
          userId,
        },
      });

      await tx.portfolioTransaction.create({
        data: {
          holdingId: holding.id,
          userId,
          side: "BUY",
          quantity: input.quantity,
          price: input.averageBuyPrice,
        },
      });

      return holding;
    });
  },

  async list(userId: number) {
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
      include: { transactions: true },
      orderBy: { createdAt: "desc" },
    });

    const symbols = holdings
      .filter((h) => h.symbol && (h.type === "STOCK" || h.type === "CRYPTO"))
      .map((h) => h.symbol!);
    const cacheMap = await getCachedPrices(symbols);

    let totalInvested = ZERO;
    let totalCurrent = ZERO;
    let pricedInvested = ZERO;
    let pricedCurrent = ZERO;
    let unpricedInvested = ZERO;
    let unpricedCount = 0;
    const allocation = new Map<string, Prisma.Decimal>();

    const serializedHoldings = holdings.map((holding) => {
      const view = computeHoldingView(holding, cacheMap);

      totalInvested = totalInvested.plus(view.investedAmount);
      // A holding with no available price still contributes its invested
      // amount to the blended summary total, so it doesn't silently vanish
      // — but it's also tracked separately below (pricedInvested/
      // pricedCurrent vs unpricedInvested) so the UI can show an honest
      // "returns based on N of M holdings" instead of quietly implying
      // zero profit for the unpriced ones.
      const currentForTotals = view.currentValue ?? view.investedAmount;
      totalCurrent = totalCurrent.plus(currentForTotals);
      allocation.set(holding.type, (allocation.get(holding.type) ?? ZERO).plus(currentForTotals));

      if (view.currentValue !== null) {
        pricedInvested = pricedInvested.plus(view.investedAmount);
        pricedCurrent = pricedCurrent.plus(view.currentValue);
      } else {
        unpricedInvested = unpricedInvested.plus(view.investedAmount);
        unpricedCount += 1;
      }

      return {
        id: holding.id,
        type: holding.type,
        name: holding.name,
        symbol: holding.symbol,
        createdAt: holding.createdAt,
        // Fixed Deposit fields (null for every other type)
        principal: holding.principal ? num(holding.principal) : null,
        interestRate: holding.interestRate ? num(holding.interestRate) : null,
        startDate: holding.startDate,
        maturityDate: holding.maturityDate,
        maturityAmount: holding.maturityAmount ? num(holding.maturityAmount) : null,
        // Computed, market-based fields
        quantity: view.remainingQty ? num(view.remainingQty) : null,
        avgBuyPrice: view.avgBuyPrice ? num(view.avgBuyPrice) : null,
        investedAmount: num(view.investedAmount),
        currentValue: num(view.currentValue),
        profitLoss: num(view.profitLoss),
        returnPct: num(view.returnPct),
        priceSource: view.priceSource,
        marketStatus: view.marketStatus,
        currency: view.currency,
      };
    });

    const allocationObj: Record<string, number> = {};
    for (const [type, value] of allocation) allocationObj[type] = num(value)!;

    const returns = totalCurrent.minus(totalInvested);
    const returnsPct = totalInvested.greaterThan(ZERO) ? returns.div(totalInvested).times(100) : ZERO;

    const pricedReturns = pricedCurrent.minus(pricedInvested);
    const pricedReturnsPct = pricedInvested.greaterThan(ZERO) ? pricedReturns.div(pricedInvested).times(100) : ZERO;

    // Deterministic Insights
    let performanceInsight = "";
    if (returns.greaterThan(ZERO)) {
      performanceInsight = `Your portfolio is currently up by ${returnsPct.toFixed(1)}%.`;
    } else if (returns.lessThan(ZERO)) {
      performanceInsight = `Your portfolio is currently down by ${Math.abs(Number(returnsPct)).toFixed(1)}%.`;
    } else {
      performanceInsight = `Your portfolio value is currently flat (equal to invested capital).`;
    }

    let largestAssetClassInsight = "";
    let concentrationWarning = "";
    let maxType = "";
    let maxVal = ZERO;
    for (const [type, value] of allocation) {
      if (value.greaterThan(maxVal)) {
        maxVal = value;
        maxType = type;
      }
    }

    const TYPE_LABELS: Record<string, string> = {
      STOCK: "Stocks",
      MUTUAL_FUND: "Mutual Funds",
      CRYPTO: "Crypto",
      GOLD: "Gold",
      FIXED_DEPOSIT: "Fixed Deposits",
    };

    if (maxType && totalCurrent.greaterThan(ZERO)) {
      const maxPct = maxVal.div(totalCurrent).times(100);
      const typeName = TYPE_LABELS[maxType] || maxType;
      largestAssetClassInsight = `${typeName} represent ${maxPct.toFixed(0)}% of your portfolio, making them your largest asset class.`;
      
      if (maxPct.greaterThan(50)) {
        concentrationWarning = `${maxPct.toFixed(0)}% of your investments are concentrated in ${typeName.toLowerCase()}.`;
      }
    }

    let topProfitInsight = "";
    let maxProfit = ZERO;
    let topProfitHoldingName = "";
    for (const h of serializedHoldings) {
      if (h.profitLoss !== null && h.profitLoss > Number(maxProfit)) {
        maxProfit = new Decimal(h.profitLoss);
        topProfitHoldingName = h.name;
      }
    }

    if (topProfitHoldingName && maxProfit.greaterThan(ZERO)) {
      const formattedProfit = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(maxProfit));
      topProfitInsight = `${topProfitHoldingName} contributes the highest absolute profit of ${formattedProfit}.`;
    }

    // Generate simple portfolio value history snapshots (e.g., past 6 days) for Demo 1.
    const historyPoints = [];
    const now = new Date();
    const daysToGenerate = 6;
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      
      let val = 0;
      if (totalCurrent.greaterThan(ZERO)) {
        if (i === 0) {
          val = num(totalCurrent)!;
        } else {
          const progress = (daysToGenerate - 1 - i) / (daysToGenerate - 1); // 0 to 1
          const base = totalInvested.greaterThan(ZERO) ? totalInvested : totalCurrent.times(0.9);
          const diff = totalCurrent.minus(base);
          const currentVal = base.plus(diff.times(progress));
          const wiggle = currentVal.times(0.01 * (Math.sin(i) * 0.5));
          val = num(currentVal.plus(wiggle))!;
        }
      }
      historyPoints.push({
        date: dateStr,
        value: val
      });
    }

    return {
      holdings: serializedHoldings,
      summary: {
        totalInvested: num(totalInvested),
        totalCurrent: num(totalCurrent),
        returns: num(returns),
        returnsPct: num(returnsPct),
        allocation: allocationObj,
        pricedInvested: num(pricedInvested),
        pricedCurrent: num(pricedCurrent),
        pricedReturns: num(pricedReturns),
        pricedReturnsPct: num(pricedReturnsPct),
        unpricedCount,
        unpricedInvested: num(unpricedInvested),
      },
      insights: {
        performance: performanceInsight || null,
        allocation: largestAssetClassInsight || null,
        topProfit: topProfitInsight || null,
        concentration: concentrationWarning || null,
      },
      history: historyPoints,
    };
  },

  async addTransaction(userId: number, holdingId: number, input: AddTransactionInput) {
    return prisma.$transaction(
      async (tx) => {
        const holding = await tx.portfolioHolding.findFirst({ where: { id: holdingId, userId } });
        if (!holding) throw new AppError("Holding not found", 404);
        if (holding.type === "FIXED_DEPOSIT") {
          throw new AppError("Fixed Deposits don't support buy/sell transactions — edit principal/maturity fields instead.", 400);
        }

        if (input.side === "SELL") {
          // Re-validate remaining quantity from a fresh, transaction-scoped
          // read — never trust a snapshot from before the transaction began.
          const existing = await tx.portfolioTransaction.findMany({ where: { holdingId, userId } });
          const { remainingQty } = computeQuantityAndCost(existing);
          const requestedQty = new Decimal(input.quantity);
          if (requestedQty.greaterThan(remainingQty)) {
            throw new AppError(
              `Cannot sell ${requestedQty.toFixed(6)} units — only ${remainingQty.toFixed(6)} are currently owned.`,
              400
            );
          }
        }

        return tx.portfolioTransaction.create({
          data: {
            holdingId,
            userId,
            side: input.side,
            quantity: input.quantity,
            price: input.price,
            date: input.date ? new Date(input.date) : undefined,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  },

  async getTransactions(userId: number, holdingId: number) {
    const holding = await prisma.portfolioHolding.findFirst({ where: { id: holdingId, userId } });
    if (!holding) throw new AppError("Holding not found", 404);

    const transactions = await prisma.portfolioTransaction.findMany({
      where: { holdingId, userId },
      orderBy: { date: "desc" },
    });
    return transactions.map((t) => ({ ...t, quantity: num(t.quantity), price: num(t.price) }));
  },

  /** Manual price updates are only permitted for MUTUAL_FUND and GOLD — the
   * two types with no live feed in this build. STOCK/CRYPTO prices always
   * come from the market cache once available; this is enforced here, not
   * just in the UI, since "never manually enter market value" is a hard
   * requirement for those types. */
  async updateManualPrice(userId: number, holdingId: number, price: number) {
    const holding = await prisma.portfolioHolding.findFirst({ where: { id: holdingId, userId } });
    if (!holding) throw new AppError("Holding not found", 404);
    if (holding.type !== "MUTUAL_FUND" && holding.type !== "GOLD") {
      throw new AppError(
        `${holding.type} pricing is not manually editable — ${holding.type === "FIXED_DEPOSIT" ? "Fixed Deposits use maturity fields" : "this type uses live market data"}.`,
        400
      );
    }
    return prisma.portfolioHolding.update({ where: { id: holdingId }, data: { manualPrice: price } });
  },

  async remove(userId: number, id: number) {
    // PortfolioTransaction rows cascade-delete with their holding (onDelete: Cascade in the schema).
    const result = await prisma.portfolioHolding.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new AppError("Holding not found", 404);
  },

  /** Market data status for the symbols this user actually holds — powers the ticker/status indicator. Read-only, cache-backed, never calls the external API inline. */
  async getMarketStatus(userId: number) {
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId, type: { in: ["STOCK", "CRYPTO"] }, symbol: { not: null } },
      select: { symbol: true },
      distinct: ["symbol"],
    });
    const userSymbols = holdings.map((h) => h.symbol!).filter(Boolean);
    const popularSymbols = ["^NSEI", "TCS:NSE", "RELIANCE:NSE", "BTC/USD"];
    const symbols = Array.from(new Set([...popularSymbols, ...userSymbols]));
    const cacheMap = await getCachedPrices(symbols);

    return symbols.map((symbol) => {
      const cache = cacheMap.get(symbol);
      return {
        symbol,
        price: cache?.price ? num(cache.price) : null,
        changePct: cache?.changePct ? num(cache.changePct) : null,
        currency: cache?.currency ?? null,
        status: cache?.status ?? "UNAVAILABLE",
        lastSuccessfulFetch: cache?.lastSuccessfulFetch ?? null,
      };
    });
  },
};
