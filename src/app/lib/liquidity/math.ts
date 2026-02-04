import type { DepthBand } from "./types";

export const toNumber = (value: unknown): number | null => {
  if (value == null) return null;
  const num = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(num) ? num : null;
};

export const computeDepthBand = (
  baseReserve: number | null,
  quoteReserve: number | null,
  impact = 0.02,
): DepthBand | null => {
  if (!baseReserve || !quoteReserve) return null;
  if (baseReserve <= 0 || quoteReserve <= 0) return null;
  const k = baseReserve * quoteReserve;
  const down = k / Math.pow(baseReserve * (1 + impact), 2);
  const up = Math.pow(quoteReserve * (1 + impact), 2) / k;
  return { min: down, max: up, impactPct: impact * 100 };
};
