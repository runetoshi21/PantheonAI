import { createLimiter, getJsonWithLimit, type Limiter } from "./http";
import { arrayOf, asRecord, toNumber, toStringAmount, toStringValue } from "./utils";
import type { DammV1PoolsResponse, NormalizedPool } from "./types";

export type DammV1FetchParams = {
  baseUrl: string;
  mint: string;
  includeUnknown: boolean;
  pageSize: number;
  limitPerProtocol: number;
  timeoutMs: number;
  limiter?: Limiter;
};

export function buildDammV1Url(baseUrl: string, params: { mint: string; page: number; size: number; includeUnknown: boolean }) {
  const url = new URL("/pools/search", baseUrl);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("size", String(params.size));
  url.searchParams.append("include_token_mints", params.mint);
  url.searchParams.set("unknown", params.includeUnknown ? "true" : "false");
  return url.toString();
}

export async function fetchDammV1PoolsByMint(
  params: DammV1FetchParams
): Promise<{ pools: NormalizedPool[]; raw: Record<string, unknown>[] }> {
  const limiter = params.limiter ?? createLimiter(3);
  const size = params.pageSize;

  let page = 0;
  const pools: Record<string, unknown>[] = [];
  let totalCount = 0;

  while (true) {
    const url = buildDammV1Url(params.baseUrl, {
      mint: params.mint,
      page,
      size,
      includeUnknown: params.includeUnknown
    });

    const response = await getJsonWithLimit<DammV1PoolsResponse>(limiter, url, {
      timeoutMs: params.timeoutMs
    });

    const data = response.data;
    let pageItems: Record<string, unknown>[] = [];

    if (Array.isArray(data)) {
      pageItems = data as Record<string, unknown>[];
    } else if (data && typeof data === "object") {
      pageItems = [data as Record<string, unknown>];
    }

    pools.push(...pageItems);
    totalCount = response.total_count ?? totalCount;

    if (pageItems.length < size) break;
    if (totalCount && pools.length >= totalCount) break;
    page += 1;
  }

  const normalized = pools.map((pool) => normalizeDammV1Pool(pool, params.mint));

  return { pools: normalized, raw: pools };
}

export function normalizeDammV1Pool(pool: Record<string, unknown>, inputMint: string): NormalizedPool {
  const record = asRecord(pool);
  const poolAddress = (record.pool_address as string) ?? (record.address as string) ?? "";

  const tokenMints = arrayOf<string>(record.pool_token_mints ?? record.token_mints);
  const tokenAmounts = arrayOf<unknown>(record.pool_token_amounts ?? record.token_amounts);

  const reserves = tokenMints.map((mint, idx) => ({
    mint,
    amount: toStringAmount(tokenAmounts[idx]),
    amountUsd: null
  }));

  const metrics = {
    tvlUsd: toNumber(record.pool_tvl ?? record.tvl ?? record.tvl_usd),
    volume24hUsd: toNumber(record.trading_volume ?? record.volume_24h ?? record.volume24h),
    fees24hUsd: toNumber(record.fee_volume ?? record.fees_24h ?? record.fees24h),
    apr24h: toNumber(record.apr ?? record.apr_24h),
    apy24h: toNumber(record.apy ?? record.apy_24h)
  };

  const setup = {
    fee: {
      baseFee: toStringValue(record.fee_bps ?? record.fee_basis_points),
      maxFee: null,
      protocolFee: toStringValue(record.protocol_fee_bps)
    },
    binStep: null,
    currentPrice: toNumber(record.current_price ?? record.price),
    tags: arrayOf<string>(record.tags)
  };

  return {
    protocol: "DAMM_V1",
    poolAddress,
    poolName: (record.pool_name as string) ?? (record.name as string) ?? null,
    tokens: tokenMints.map((mint) => ({
      mint,
      role: "UNKNOWN",
      isInputMint: mint === inputMint
    })),
    metrics,
    liquidity: { reserves },
    setup,
    locks: {},
    raw: {
      dlmm: {},
      dammV2: {},
      dammV1: record
    }
  };
}
