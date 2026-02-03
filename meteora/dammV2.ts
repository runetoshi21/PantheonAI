import { LRUCache } from "lru-cache";
import { createLimiter, getJsonWithLimit, type Limiter } from "./http";
import { arrayOf, asRecord, toNumber, toStringAmount, toStringAmountOrNull, toStringValue } from "./utils";
import type { DammV2Pool, DammV2PoolsResponse, NormalizedPool } from "./types";

export type DammV2FetchParams = {
  baseUrl: string;
  mint: string;
  includeVesting: boolean;
  limit: number;
  limitPerProtocol: number;
  timeoutMs: number;
  limiter?: Limiter;
  vestingLimiter?: Limiter;
};

const vestingCache = new LRUCache<string, Record<string, unknown>>({
  max: 2000,
  ttl: 60000
});

export function buildDammV2Url(baseUrl: string, params: { mint: string; limit: number; offset: number }) {
  const url = new URL("/pools", baseUrl);
  url.searchParams.set("token_a_mint", params.mint);
  url.searchParams.set("token_b_mint", params.mint);
  url.searchParams.set("any", "true");
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("offset", String(params.offset));
  url.searchParams.set("order_by", "tvl");
  url.searchParams.set("order", "desc");
  return url.toString();
}

export async function fetchDammV2PoolsByMint(
  params: DammV2FetchParams
): Promise<{ pools: NormalizedPool[]; raw: DammV2Pool[] }> {
  const limit = params.limit;
  const limiter = params.limiter ?? createLimiter(3);

  let offset = 0;
  const pools: DammV2Pool[] = [];

  while (true) {
    const url = buildDammV2Url(params.baseUrl, {
      mint: params.mint,
      limit,
      offset
    });

    const response = await getJsonWithLimit<DammV2PoolsResponse>(limiter, url, {
      timeoutMs: params.timeoutMs
    });

    const batch = arrayOf<DammV2Pool>(response.data ?? response.pools ?? response as unknown);
    pools.push(...batch);

    if (batch.length < limit) break;
    offset += limit;
  }

  const normalized = pools.map((pool) => normalizeDammV2Pool(pool, params.mint));

  if (params.includeVesting) {
    await attachVesting(normalized, params.baseUrl, params.timeoutMs, params.vestingLimiter ?? limiter);
  }

  return { pools: normalized, raw: pools };
}

export function normalizeDammV2Pool(pool: DammV2Pool, inputMint: string): NormalizedPool {
  const record = asRecord(pool);
  const poolAddress = (record.pool_address as string) ?? (record.address as string) ?? "";
  const mintA = (record.token_a_mint as string) ?? (record.mint_a as string) ?? "";
  const mintB = (record.token_b_mint as string) ?? (record.mint_b as string) ?? "";

  const metrics = {
    tvlUsd: toNumber(record.tvl ?? record.tvl_usd),
    volume24hUsd: toNumber(record.volume_24h ?? record.volume24h),
    fees24hUsd: toNumber(record.fees_24h ?? record.fees24h),
    apr24h: toNumber(record.apr ?? record.apr_24h),
    apy24h: toNumber(record.apy ?? record.apy_24h)
  };

  const setup = {
    fee: {
      baseFee: toStringValue(record.base_fee ?? record.base_fee_bps ?? record.trade_fee_bps),
      maxFee: toStringValue(record.max_fee ?? record.max_fee_bps),
      protocolFee: toStringValue(record.protocol_fee ?? record.protocol_fee_bps)
    },
    binStep: null,
    currentPrice: toNumber(record.current_price ?? record.price),
    tags: arrayOf<string>(record.tags)
  };

  return {
    protocol: "DAMM_V2",
    poolAddress,
    poolName: (record.name as string) ?? null,
    tokens: [
      { mint: mintA, role: "A", isInputMint: mintA === inputMint },
      { mint: mintB, role: "B", isInputMint: mintB === inputMint }
    ],
    metrics,
    liquidity: {
      reserves: [
        { mint: mintA, amount: toStringAmount(record.token_a_amount), amountUsd: toStringAmountOrNull(record.token_a_amount_usd) },
        { mint: mintB, amount: toStringAmount(record.token_b_amount), amountUsd: toStringAmountOrNull(record.token_b_amount_usd) }
      ]
    },
    setup,
    locks: {},
    raw: {
      dlmm: {},
      dammV2: record,
      dammV1: {}
    }
  };
}

export async function attachVesting(
  pools: NormalizedPool[],
  baseUrl: string,
  timeoutMs: number,
  limiter: Limiter
): Promise<void> {
  await Promise.all(
    pools.map(async (pool) => {
      if (!pool.poolAddress) return;
      const cached = vestingCache.get(pool.poolAddress);
      if (cached) {
        pool.locks.dammV2 = { vesting: mapVesting(cached) };
        return;
      }

      const url = new URL(`/pools/vesting/${pool.poolAddress}`, baseUrl).toString();
      const response = await getJsonWithLimit<Record<string, unknown>>(limiter, url, { timeoutMs });
      vestingCache.set(pool.poolAddress, response);
      pool.locks.dammV2 = { vesting: mapVesting(response) };
    })
  );
}

export function mapVesting(payload: Record<string, unknown>) {
  const positions = arrayOf<Record<string, unknown>>(payload.position_vesting ?? payload.positions ?? []);

  return {
    totalLockedLiquidity: String(payload.total_locked_liquidity_string ?? payload.total_locked_liquidity ?? "0"),
    totalReleasedLiquidity: String(payload.total_released_liquidity_string ?? payload.total_released_liquidity ?? "0"),
    positions: positions.map((pos) => ({
      positionAddress: String(pos.position_address ?? pos.position ?? ""),
      vestingEndTimestamp: Number(pos.vesting_end_timestamp ?? pos.vestingEndTimestamp ?? 0),
      cliffPoint: Number(pos.cliff_point ?? pos.cliffPoint ?? 0),
      totalLockedLiquidity: String(pos.total_locked_liquidity_string ?? pos.total_locked_liquidity ?? "0"),
      totalReleasedLiquidity: String(pos.total_released_liquidity_string ?? pos.total_released_liquidity ?? "0")
    }))
  };
}
