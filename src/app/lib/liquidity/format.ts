const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export const formatUsd = (value: number | null) =>
  value == null ? "—" : `$${compactFormatter.format(value)}`;

export const formatNumber = (value: number | null, digits = 4) =>
  value == null ? "—" : value.toFixed(value < 1 ? digits : 2);

export const formatPercent = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(2)}%`;

export const shortMint = (mint: string) =>
  mint.length <= 10 ? mint : `${mint.slice(0, 4)}…${mint.slice(mint.length - 4)}`;

export const formatCompact = (value: number) => compactFormatter.format(value);
