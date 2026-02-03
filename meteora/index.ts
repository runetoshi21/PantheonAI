import { PublicKey } from "@solana/web3.js";
import { LRUCache } from "lru-cache";
import { BadRequestError } from "../src/core/errors";
import { getMeteoraApiConfig, type MeteoraCluster } from "./config";
import { createLimiter, MeteoraHttpError } from "./http";
import { fetchDlmmPairsByMint } from "./dlmm";
import { fetchDammV2PoolsByMint } from "./dammV2";
import { fetchDammV1PoolsByMint } from "./dammV1";
import type { GetPoolsByMintParams, GetPoolsByMintResult, NormalizedPool, NormalizedPoolProtocol } from "./types";

const poolsCache = new LRUCache<string, GetPoolsByMintResult>({
  max: 500,
  ttl: 30000
});

export async function getMeteoraPoolsByMint(input: GetPoolsByMintParams): Promise<GetPoolsByMintResult> {
  validateMint(input.mint);

  const cacheKey = buildCacheKey(input);
  const cached = poolsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const config = getMeteoraApiConfig(input.cluster);

  const dlmmLimiter = createLimiter(config.concurrency.dlmm);
  const dammV1Limiter = createLimiter(config.concurrency.dammV1);
  const dammV2Limiter = createLimiter(config.concurrency.dammV2);

  const errors: GetPoolsByMintResult["errors"] = [];

  const [dlmmResult, dammV2Result, dammV1Result] = await Promise.allSettled([
    fetchDlmmPairsByMint({
      baseUrl: config.dlmmBaseUrl,
      mint: input.mint,
      includeUnknown: input.includeUnknown,
      includeDlmmLocks: input.includeDlmmLocks,
      pageSize: config.defaults.pageSizeDlmm,
      limitPerProtocol: input.limitPerProtocol,
      timeoutMs: input.timeoutMs,
      limiter: dlmmLimiter
    }),
    fetchDammV2PoolsByMint({
      baseUrl: config.dammV2BaseUrl,
      mint: input.mint,
      includeVesting: input.includeVesting,
      limit: config.defaults.limitDammV2,
      limitPerProtocol: input.limitPerProtocol,
      timeoutMs: input.timeoutMs,
      limiter: dammV2Limiter,
      vestingLimiter: createLimiter(2)
    }),
    fetchDammV1PoolsByMint({
      baseUrl: config.dammV1BaseUrl,
      mint: input.mint,
      includeUnknown: input.includeUnknown,
      pageSize: config.defaults.pageSizeDammV1,
      limitPerProtocol: input.limitPerProtocol,
      timeoutMs: input.timeoutMs,
      limiter: dammV1Limiter
    })
  ]);

  const pools: NormalizedPool[] = [];

  if (dlmmResult.status === "fulfilled") {
    pools.push(...dlmmResult.value.pools);
  } else {
    errors.push({ protocol: "DLMM", message: formatError(dlmmResult.reason) });
  }

  if (dammV2Result.status === "fulfilled") {
    pools.push(...dammV2Result.value.pools);
  } else {
    errors.push({ protocol: "DAMM_V2", message: formatError(dammV2Result.reason) });
  }

  if (dammV1Result.status === "fulfilled") {
    pools.push(...dammV1Result.value.pools);
  } else {
    errors.push({ protocol: "DAMM_V1", message: formatError(dammV1Result.reason) });
  }

  const deduped = dedupePools(pools);
  const filtered = applyMinTvl(deduped, input.minTvlUsd);
  const sorted = sortPools(filtered);
  const limited = applyLimitPerProtocol(sorted, input.limitPerProtocol);

  const summary = summarize(limited);

  const result: GetPoolsByMintResult = {
    mint: input.mint,
    cluster: input.cluster,
    fetchedAt: new Date().toISOString(),
    summary,
    pools: limited,
    errors
  };

  poolsCache.set(cacheKey, result);
  return result;
}

export function resolveDefaults(params: Partial<GetPoolsByMintParams> & { mint: string; cluster?: MeteoraCluster }): GetPoolsByMintParams {
  const cluster = params.cluster ?? "mainnet-beta";
  const config = getMeteoraApiConfig(cluster);

  return {
    mint: params.mint,
    cluster,
    includeUnknown: params.includeUnknown ?? true,
    includeVesting: params.includeVesting ?? false,
    includeDlmmLocks: params.includeDlmmLocks ?? false,
    minTvlUsd: params.minTvlUsd,
    limitPerProtocol: params.limitPerProtocol ?? config.defaults.limitPerProtocol,
    timeoutMs: params.timeoutMs ?? config.defaults.timeoutMs
  };
}

function validateMint(mint: string): void {
  try {
    new PublicKey(mint);
  } catch {
    throw new BadRequestError(`Invalid mint: ${mint}`);
  }
}

function buildCacheKey(input: GetPoolsByMintParams): string {
  return [
    "meteora",
    input.cluster,
    input.mint,
    `unknown=${input.includeUnknown}`,
    `vesting=${input.includeVesting}`,
    `locks=${input.includeDlmmLocks}`,
    `minTvl=${input.minTvlUsd ?? ""}`,
    `limit=${input.limitPerProtocol}`,
    `timeout=${input.timeoutMs}`
  ].join(":");
}

function dedupePools(pools: NormalizedPool[]): NormalizedPool[] {
  const seen = new Set<string>();
  const result: NormalizedPool[] = [];

  for (const pool of pools) {
    const key = `${pool.protocol}:${pool.poolAddress}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(pool);
  }

  return result;
}

function applyMinTvl(pools: NormalizedPool[], minTvlUsd?: number): NormalizedPool[] {
  if (!minTvlUsd || minTvlUsd <= 0) return pools;
  return pools.filter((pool) => pool.metrics.tvlUsd != null && pool.metrics.tvlUsd >= minTvlUsd);
}

function sortPools(pools: NormalizedPool[]): NormalizedPool[] {
  return [...pools].sort((a, b) => {
    const tvlA = a.metrics.tvlUsd ?? -1;
    const tvlB = b.metrics.tvlUsd ?? -1;
    if (tvlA !== tvlB) return tvlB - tvlA;

    const volA = a.metrics.volume24hUsd ?? -1;
    const volB = b.metrics.volume24hUsd ?? -1;
    if (volA !== volB) return volB - volA;

    return a.poolAddress.localeCompare(b.poolAddress);
  });
}

function applyLimitPerProtocol(pools: NormalizedPool[], limit: number): NormalizedPool[] {
  const counts: Record<NormalizedPoolProtocol, number> = {
    DLMM: 0,
    DAMM_V2: 0,
    DAMM_V1: 0
  };

  const result: NormalizedPool[] = [];

  for (const pool of pools) {
    if (counts[pool.protocol] >= limit) continue;
    counts[pool.protocol] += 1;
    result.push(pool);
  }

  return result;
}

function summarize(pools: NormalizedPool[]): GetPoolsByMintResult["summary"] {
  const summary = {
    totalPools: pools.length,
    byProtocol: {
      DLMM: 0,
      DAMM_V2: 0,
      DAMM_V1: 0
    },
    totalTvlUsd: 0
  };

  for (const pool of pools) {
    summary.byProtocol[pool.protocol] += 1;
    if (pool.metrics.tvlUsd != null) {
      summary.totalTvlUsd += pool.metrics.tvlUsd;
    }
  }

  return summary;
}

function formatError(err: unknown): string {
  if (err instanceof MeteoraHttpError) {
    return `${err.status} ${err.bodySnippet}`.trim();
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Unknown error";
}
