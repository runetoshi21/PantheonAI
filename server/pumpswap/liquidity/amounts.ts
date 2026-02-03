import BN from "bn.js";

export function parseUiToRaw(ui: string, decimals: number): BN {
  const value = ui.trim();
  if (!value) {
    throw new Error("INVALID_AMOUNT");
  }
  if (value.startsWith("-")) {
    throw new Error("INVALID_AMOUNT");
  }
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("INVALID_AMOUNT");
  }

  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) {
    throw new Error("INVALID_AMOUNT");
  }

  const paddedFraction = fraction.padEnd(decimals, "0");
  const rawStr = `${whole}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  const raw = new BN(rawStr || "0", 10);

  if (raw.lte(new BN(0))) {
    throw new Error("INVALID_AMOUNT");
  }

  return raw;
}

export function rawToUi(raw: BN, decimals: number): string {
  if (decimals <= 0) return raw.toString(10);
  const rawStr = raw.toString(10).padStart(decimals + 1, "0");
  const split = rawStr.length - decimals;
  const whole = rawStr.slice(0, split);
  const fraction = rawStr.slice(split).replace(/0+$/, "");
  return fraction.length ? `${whole}.${fraction}` : whole;
}
