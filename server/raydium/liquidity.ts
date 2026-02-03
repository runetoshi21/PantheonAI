import type { RaydiumPoolDto } from "./dtos";

export function collectPriceMints(pools: RaydiumPoolDto[]): string[] {
  const mints = new Set<string>();

  for (const pool of pools) {
    if (hasPositive(pool.metrics.tvl)) {
      continue;
    }

    const needA = needsPrice(
      pool.metrics.mintAmountAUsd,
      pool.metrics.mintAmountA,
      pool.mintA.address
    );
    const needB = needsPrice(
      pool.metrics.mintAmountBUsd,
      pool.metrics.mintAmountB,
      pool.mintB.address
    );

    if (needA) mints.add(pool.mintA.address);
    if (needB) mints.add(pool.mintB.address);
  }

  return Array.from(mints);
}

export function getPoolUsdLiquidity(
  pool: RaydiumPoolDto,
  prices: Map<string, number>
): number {
  const tvl = parseNumber(pool.metrics.tvl);
  if (tvl != null && tvl > 0) {
    return tvl;
  }

  let sum = 0;
  let used = false;

  const aUsd = parseNumber(pool.metrics.mintAmountAUsd);
  if (aUsd != null && aUsd > 0) {
    sum += aUsd;
    used = true;
  }

  const bUsd = parseNumber(pool.metrics.mintAmountBUsd);
  if (bUsd != null && bUsd > 0) {
    sum += bUsd;
    used = true;
  }

  if (!used) {
    const aAmount = parseNumber(pool.metrics.mintAmountA);
    const bAmount = parseNumber(pool.metrics.mintAmountB);
    if (aAmount != null) {
      const price = prices.get(pool.mintA.address);
      if (price != null) {
        sum += aAmount * price;
        used = true;
      }
    }
    if (bAmount != null) {
      const price = prices.get(pool.mintB.address);
      if (price != null) {
        sum += bAmount * price;
        used = true;
      }
    }
  }

  return used ? sum : 0;
}

function needsPrice(
  usdValue: string | undefined,
  amountValue: string | undefined,
  mint: string
): boolean {
  if (!mint) return false;
  const amount = parseNumber(amountValue);
  if (!amount || amount <= 0) return false;
  const usd = parseNumber(usdValue);
  return usd == null || usd === 0;
}

function parseNumber(value: string | undefined): number | null {
  if (value == null) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

function hasPositive(value: string | undefined): boolean {
  const num = parseNumber(value);
  return num != null && num > 0;
}
