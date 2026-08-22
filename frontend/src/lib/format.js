export function formatINR(amount) {
  const n = Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPct(fraction, digits = 0) {
  return `${(fraction * 100).toFixed(digits)}%`;
}
