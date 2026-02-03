import BN from "bn.js";

export function formatUnits(amount: BN, decimals: number): string {
  if (decimals <= 0) return amount.toString(10);
  const raw = amount.toString(10);
  const padded = raw.padStart(decimals + 1, "0");
  const split = padded.length - decimals;
  const whole = padded.slice(0, split);
  const fraction = padded.slice(split).replace(/0+$/, "");
  return fraction.length ? `${whole}.${fraction}` : whole;
}

export function divDecimalStrings(
  numerator: string,
  denominator: string,
  precision: number
): string {
  if (!denominator || denominator === "0") return "0";

  const { bn: num, scale: numScale } = parseDecimal(numerator);
  const { bn: den, scale: denScale } = parseDecimal(denominator);

  if (den.isZero()) return "0";

  const scaleFactor = new BN(10).pow(new BN(precision));
  const scaledNumerator = num.mul(new BN(10).pow(new BN(denScale))).mul(scaleFactor);
  const scaledDenominator = den.mul(new BN(10).pow(new BN(numScale)));

  const quotient = scaledNumerator.div(scaledDenominator);
  const quotientStr = quotient.toString(10).padStart(precision + 1, "0");
  const split = quotientStr.length - precision;
  const whole = quotientStr.slice(0, split);
  const fraction = quotientStr.slice(split).replace(/0+$/, "");
  return fraction.length ? `${whole}.${fraction}` : whole;
}

function parseDecimal(value: string): { bn: BN; scale: number } {
  const trimmed = value.trim();
  const [whole, fraction = ""] = trimmed.split(".");
  const scale = fraction.length;
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "");
  const bn = new BN(digits || "0", 10);
  return { bn, scale };
}
