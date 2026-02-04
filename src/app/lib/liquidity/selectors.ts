import { shortMint } from "./format";
import { computeDepthBand, toNumber } from "./math";
import type {
  LiquidityOverviewResponse,
  LiquidityProtocolResult,
  MeteoraPool,
  PoolTotals,
  Protocol,
  PumpSwapPoolSnapshot,
  RaydiumPoolDto,
  SelectedPool,
  SelectedPoolDetail,
} from "./types";

export const getActiveProtocols = (
  protocols: Record<Protocol, boolean>,
): Protocol[] => (Object.keys(protocols) as Protocol[]).filter((key) => protocols[key]);

export const getProtocolResult = (
  overview: LiquidityOverviewResponse | null,
  protocol: Protocol,
): LiquidityProtocolResult | null =>
  overview?.results.find((res) => res.protocol === protocol) ?? null;

export const getProtocolError = (result: LiquidityProtocolResult | null): string | null =>
  result && !result.ok ? result.error : null;

export const getRaydiumPools = (result: LiquidityProtocolResult | null): RaydiumPoolDto[] => {
  if (result && result.ok && result.protocol === "raydium") {
    return result.data.pools;
  }
  return [];
};

export const getMeteoraPools = (result: LiquidityProtocolResult | null): MeteoraPool[] => {
  if (result && result.ok && result.protocol === "meteora") {
    return result.data.pools;
  }
  return [];
};

export const getPumpswapPool = (
  result: LiquidityProtocolResult | null,
): PumpSwapPoolSnapshot | null => {
  if (result && result.ok && result.protocol === "pumpswap" && result.data.found) {
    return result.data;
  }
  return null;
};

export const isPumpswapNotFound = (result: LiquidityProtocolResult | null): boolean =>
  Boolean(result && result.ok && result.protocol === "pumpswap" && !result.data.found);

export const getTotals = (
  raydiumPools: RaydiumPoolDto[],
  meteoraResult: LiquidityProtocolResult | null,
  pumpswapPool: PumpSwapPoolSnapshot | null,
): PoolTotals => {
  const raydiumTvl = raydiumPools.reduce((sum, pool) => {
    const tvl = toNumber(pool.metrics.tvl);
    return sum + (tvl ?? 0);
  }, 0);

  const meteoraTvl =
    meteoraResult && meteoraResult.ok && meteoraResult.protocol === "meteora"
      ? meteoraResult.data.summary.totalTvlUsd
      : 0;

  const pumpswapTvl = pumpswapPool
    ? (() => {
        const liquidityUsd = toNumber(pumpswapPool.liquidityUsd?.totalUsd);
        if (liquidityUsd != null) return liquidityUsd;
        const base = toNumber(pumpswapPool.reserves.base.amountUi) ?? 0;
        const quote = toNumber(pumpswapPool.reserves.quote.amountUi) ?? 0;
        const price = toNumber(pumpswapPool.spotPrice.quotePerBase) ?? 0;
        return quote + base * price;
      })()
    : 0;

  const meteoraPoolsCount =
    meteoraResult && meteoraResult.ok && meteoraResult.protocol === "meteora"
      ? meteoraResult.data.pools.length
      : 0;

  return {
    pools: raydiumPools.length + meteoraPoolsCount + (pumpswapPool ? 1 : 0),
    tvl: raydiumTvl + meteoraTvl + pumpswapTvl,
  };
};

export const getPumpswapTvl = (pumpswapPool: PumpSwapPoolSnapshot | null): number | null => {
  if (!pumpswapPool) return null;
  const liquidityUsd = toNumber(pumpswapPool.liquidityUsd?.totalUsd);
  if (liquidityUsd != null) return liquidityUsd;
  const base = toNumber(pumpswapPool.reserves.base.amountUi) ?? 0;
  const quote = toNumber(pumpswapPool.reserves.quote.amountUi) ?? 0;
  const price = toNumber(pumpswapPool.spotPrice.quotePerBase) ?? 0;
  return quote + base * price;
};

export const getDefaultSelection = (
  raydiumPools: RaydiumPoolDto[],
  meteoraPools: MeteoraPool[],
  pumpswapPool: PumpSwapPoolSnapshot | null,
): SelectedPool | null => {
  if (raydiumPools.length) {
    return { protocol: "raydium", id: raydiumPools[0].id };
  }
  if (meteoraPools.length) {
    return { protocol: "meteora", id: meteoraPools[0].poolAddress };
  }
  if (pumpswapPool) {
    return { protocol: "pumpswap", id: pumpswapPool.canonicalPool.poolKey };
  }
  return null;
};

export const buildSelectedDetail = (
  selected: SelectedPool | null,
  raydiumPools: RaydiumPoolDto[],
  meteoraPools: MeteoraPool[],
  pumpswapPool: PumpSwapPoolSnapshot | null,
): SelectedPoolDetail | null => {
  if (!selected) return null;

  if (selected.protocol === "raydium") {
    const pool = raydiumPools.find((item) => item.id === selected.id);
    if (!pool) return null;
    const baseReserve =
      toNumber(pool.vaultBalances?.vaultA?.amount) ?? toNumber(pool.metrics.mintAmountA);
    const quoteReserve =
      toNumber(pool.vaultBalances?.vaultB?.amount) ?? toNumber(pool.metrics.mintAmountB);
    const price =
      toNumber(pool.metrics.price) ??
      (baseReserve != null && quoteReserve != null ? quoteReserve / baseReserve : null);
    const band = computeDepthBand(baseReserve, quoteReserve);
    const feeRate = toNumber(pool.metrics.feeRate);
    return {
      protocol: "Raydium",
      name: `${pool.mintA.symbol ?? shortMint(pool.mintA.address)} / ${
        pool.mintB.symbol ?? shortMint(pool.mintB.address)
      }`,
      address: pool.id,
      kind: pool.kind,
      price,
      band,
      baseLabel: pool.mintA.symbol ?? shortMint(pool.mintA.address),
      quoteLabel: pool.mintB.symbol ?? shortMint(pool.mintB.address),
      reserves:
        baseReserve != null && quoteReserve != null
          ? { base: baseReserve, quote: quoteReserve }
          : null,
      tvl: toNumber(pool.metrics.tvl),
      volume: toNumber(pool.metrics.volume24h),
      apr: toNumber(pool.metrics.apr24h),
      fee: feeRate != null ? feeRate * 100 : null,
    };
  }

  if (selected.protocol === "meteora") {
    const pool = meteoraPools.find((item) => item.poolAddress === selected.id);
    if (!pool) return null;
    const baseReserve = toNumber(pool.liquidity.reserves[0]?.amount);
    const quoteReserve = toNumber(pool.liquidity.reserves[1]?.amount);
    const band = computeDepthBand(baseReserve, quoteReserve);
    const price = pool.setup.currentPrice ?? null;
    const baseLabel = shortMint(pool.liquidity.reserves[0]?.mint ?? "");
    const quoteLabel = shortMint(pool.liquidity.reserves[1]?.mint ?? "");
    return {
      protocol: `Meteora ${pool.protocol}`,
      name: pool.poolName ?? `${baseLabel} / ${quoteLabel}`,
      address: pool.poolAddress,
      kind: pool.protocol,
      price,
      band,
      baseLabel,
      quoteLabel,
      reserves:
        baseReserve != null && quoteReserve != null
          ? { base: baseReserve, quote: quoteReserve }
          : null,
      tvl: pool.metrics.tvlUsd,
      volume: pool.metrics.volume24hUsd,
      apr: pool.metrics.apr24h,
      fee: pool.setup.fee.baseFee ? toNumber(pool.setup.fee.baseFee) : null,
      binStep: pool.setup.binStep,
    };
  }

  if (selected.protocol === "pumpswap" && pumpswapPool) {
    const baseReserve = toNumber(pumpswapPool.reserves.base.amountUi);
    const quoteReserve = toNumber(pumpswapPool.reserves.quote.amountUi);
    const price = toNumber(pumpswapPool.spotPrice.quotePerBase);
    const band = computeDepthBand(baseReserve, quoteReserve);
    const lpFeeBps = toNumber(pumpswapPool.feesBps.lpFeeBps);
    return {
      protocol: "PumpSwap",
      name: `${shortMint(pumpswapPool.canonicalPool.baseMint)} / ${shortMint(
        pumpswapPool.canonicalPool.quoteMint,
      )}`,
      address: pumpswapPool.canonicalPool.poolKey,
      kind: "CPMM",
      price,
      band,
      baseLabel: shortMint(pumpswapPool.canonicalPool.baseMint),
      quoteLabel: shortMint(pumpswapPool.canonicalPool.quoteMint),
      reserves:
        baseReserve != null && quoteReserve != null
          ? { base: baseReserve, quote: quoteReserve }
          : null,
      tvl: null,
      volume: null,
      apr: null,
      fee: lpFeeBps != null ? lpFeeBps / 100 : null,
    };
  }

  return null;
};

export const getBandPosition = (detail: SelectedPoolDetail | null): number | null => {
  if (!detail?.band || detail.price == null) return null;
  const span = detail.band.max - detail.band.min;
  if (!Number.isFinite(span) || span <= 0) return 50;
  const raw = ((detail.price - detail.band.min) / span) * 100;
  return Math.min(95, Math.max(5, raw));
};

export const getReserveSplit = (
  detail: SelectedPoolDetail | null,
): { basePct: number; quotePct: number } | null => {
  if (!detail?.reserves) return null;
  const total = detail.reserves.base + detail.reserves.quote;
  if (!Number.isFinite(total) || total <= 0) {
    return { basePct: 0, quotePct: 0 };
  }
  return {
    basePct: (detail.reserves.base / total) * 100,
    quotePct: (detail.reserves.quote / total) * 100,
  };
};
