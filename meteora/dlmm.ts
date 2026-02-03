import { LRUCache } from "lru-cache";
import { createLimiter, getJsonWithLimit, type Limiter } from "./http";
import { arrayOf, asRecord, toNumber, toStringAmount, toStringAmountOrNull, toStringValue } from "./utils";
import type { DlmmPair, DlmmPairsResponse, NormalizedPool } from "./types";

export type DlmmFetchParams = {
  baseUrl: string;
  mint: string;
  includeUnknown: boolean;
  includeDlmmLocks: boolean;
  pageSize: number;
  limitPerProtocol: number;
  timeoutMs: number;
  limiter?: Limiter;
};

const lockCache = new LRUCache<string, Array<Record<string, unknown>>>({
  max: 1000,
  ttl: 60000
});

export function buildDlmmUrl(baseUrl: string, params: { mint: string; includeUnknown: boolean; page: number; limit: number }) {
  const url = new URL("/pair/all_with_pagination", baseUrl);
  url.searchParams.append("include_token_mints", params.mint);
  url.searchParams.set("include_unknown", params.includeUnknown ? "true" : "false");
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("limit", String(params.limit));
  return url.toString();
}

export async function fetchDlmmPairsByMint(
  params: DlmmFetchParams
): Promise<{ pools: NormalizedPool[]; raw: DlmmPair[] }> {
  const limit = params.pageSize;
  const limiter = params.limiter ?? createLimiter(10);

  let page = 0;
  let total = 0;
  const pairs: DlmmPair[] = [];

  while (true) {
    const url = buildDlmmUrl(params.baseUrl, {
      mint: params.mint,
      includeUnknown: params.includeUnknown,
      page,
      limit
    });

    const response = await getJsonWithLimit<DlmmPairsResponse>(limiter, url, {
      timeoutMs: params.timeoutMs
    });

    const dataPairs = arrayOf<DlmmPair>(response.pairs);
    pairs.push(...dataPairs);
    total = response.total ?? total;

    if (dataPairs.length < limit) break;
    if (total && pairs.length >= total) break;
    page += 1;
  }

  const pools = pairs.map((pair) => normalizeDlmmPair(pair, params.mint));

  if (params.includeDlmmLocks) {
    await attachDlmmLocks(pools, params.baseUrl, params.timeoutMs, limiter);
  }

  return { pools: pools.slice(0, params.limitPerProtocol), raw: pairs };
}

export function normalizeDlmmPair(pair: DlmmPair, inputMint: string): NormalizedPool {
  const record = asRecord(pair);
  const mintX = (record.mint_x as string) ?? (record.mintX as string) ?? "";
  const mintY = (record.mint_y as string) ?? (record.mintY as string) ?? "";
  const poolAddress = (record.address as string) ?? (record.pair_address as string) ?? "";

  const reserveX = toStringAmount(record.reserve_x_amount ?? record.reserveXAmount);
  const reserveY = toStringAmount(record.reserve_y_amount ?? record.reserveYAmount);

  const metrics = {
    tvlUsd: toNumber(record.liquidity ?? record.tvl ?? record.tvl_usd),
    volume24hUsd: toNumber(record.trade_volume_24h ?? record.volume_24h ?? record.volume24h),
    fees24hUsd: toNumber(record.fees_24h ?? record.fees24h),
    apr24h: toNumber(record.apr ?? record.apr_24h),
    apy24h: toNumber(record.apy ?? record.apy_24h)
  };

  const setup = {
    fee: {
      baseFee: toStringValue(record.base_fee_percentage ?? record.baseFeePercentage),
      maxFee: toStringValue(record.max_fee_percentage ?? record.maxFeePercentage),
      protocolFee: toStringValue(record.protocol_fee_percentage ?? record.protocolFeePercentage)
    },
    binStep: toNumber(record.bin_step ?? record.binStep),
    currentPrice: toNumber(record.current_price ?? record.currentPrice),
    tags: arrayOf<string>(record.tags)
  };

  return {
    protocol: "DLMM",
    poolAddress,
    poolName: (record.name as string) ?? null,
    tokens: [
      { mint: mintX, role: "X", isInputMint: mintX === inputMint },
      { mint: mintY, role: "Y", isInputMint: mintY === inputMint }
    ],
    metrics,
    liquidity: {
      reserves: [
        { mint: mintX, amount: reserveX, amountUsd: toStringAmountOrNull(record.reserve_x_amount_usd) },
        { mint: mintY, amount: reserveY, amountUsd: toStringAmountOrNull(record.reserve_y_amount_usd) }
      ]
    },
    setup,
    locks: {},
    raw: {
      dlmm: record,
      dammV2: {},
      dammV1: {}
    }
  };
}

async function attachDlmmLocks(
  pools: NormalizedPool[],
  baseUrl: string,
  timeoutMs: number,
  limiter: Limiter
): Promise<void> {
  await Promise.all(
    pools.map(async (pool) => {
      if (!pool.poolAddress) return;
      const cached = lockCache.get(pool.poolAddress);
      if (cached) {
        pool.locks.dlmm = { positionLocks: mapLocks(cached) };
        return;
      }

      const url = new URL(`/pair/${pool.poolAddress}/positions_lock`, baseUrl).toString();
      const response = await getJsonWithLimit<Array<Record<string, unknown>>>(limiter, url, {
        timeoutMs
      });
      lockCache.set(pool.poolAddress, response);
      pool.locks.dlmm = { positionLocks: mapLocks(response) };
    })
  );
}

function mapLocks(items: Array<Record<string, unknown>>): Array<{
  position: string;
  owner: string;
  lockReleasePoint: number;
  closed: boolean;
}> {
  return items.map((item) => ({
    position: String(item.position ?? ""),
    owner: String(item.owner ?? ""),
    lockReleasePoint: Number(item.lock_release_point ?? item.lockReleasePoint ?? 0),
    closed: Boolean(item.closed)
  }));
}
