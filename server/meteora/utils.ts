export function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

export function toStringValue(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

export function toStringAmount(value: unknown): string {
  if (value == null) return "0";
  return String(value);
}

export function toStringAmountOrNull(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

export function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}
