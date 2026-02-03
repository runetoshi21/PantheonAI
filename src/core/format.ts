export function formatAmount(amountRaw: string, decimals: number): string {
  if (decimals <= 0) return amountRaw;
  const raw = BigInt(amountRaw);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fractionStr.length ? `${whole.toString()}.${fractionStr}` : whole.toString();
}
