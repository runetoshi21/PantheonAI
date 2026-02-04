export const toNumber = (value: unknown): number | null => {
  if (value == null) return null;
  const num = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(num) ? num : null;
};
