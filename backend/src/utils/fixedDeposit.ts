import { Prisma } from "@prisma/client";

const { Decimal } = Prisma;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Computes a Fixed Deposit's current accrued value. FD never has a market
 * price and never gets BUY/SELL transactions — this is deliberately a
 * completely different code path from the market-priced asset types.
 *
 * If maturityAmount is known (given directly, or derived from
 * interestRate via compound annual interest), value accrues linearly from
 * principal at startDate to maturityAmount at maturityDate, capped at
 * maturityAmount once matured. If neither maturityAmount nor interestRate
 * is available, the FD is shown at principal with no growth assumption —
 * we never invent a return that wasn't actually specified.
 */
export function computeFdCurrentValue(fd: {
  principal: Prisma.Decimal;
  interestRate: Prisma.Decimal | null;
  startDate: Date | null;
  maturityDate: Date | null;
  maturityAmount: Prisma.Decimal | null;
}): Prisma.Decimal {
  const { principal, interestRate, startDate, maturityDate, maturityAmount } = fd;

  if (!startDate || !maturityDate) return principal;

  const now = new Date();
  const totalTermMs = maturityDate.getTime() - startDate.getTime();
  if (totalTermMs <= 0) return principal;

  let resolvedMaturityAmount = maturityAmount;
  if (!resolvedMaturityAmount && interestRate) {
    const years = totalTermMs / MS_PER_YEAR;
    const rate = interestRate.div(100);
    // principal * (1 + rate) ^ years — Decimal.js supports fractional exponents via .pow()
    resolvedMaturityAmount = principal.times(new Decimal(1).plus(rate).pow(years));
  }

  if (!resolvedMaturityAmount) return principal; // no growth info available at all

  if (now.getTime() >= maturityDate.getTime()) return resolvedMaturityAmount;
  if (now.getTime() <= startDate.getTime()) return principal;

  const elapsedMs = now.getTime() - startDate.getTime();
  const progress = new Decimal(elapsedMs).div(totalTermMs); // 0..1
  return principal.plus(resolvedMaturityAmount.minus(principal).times(progress));
}
