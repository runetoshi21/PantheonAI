import { PoolFetchType, type PoolKeys } from "@raydium-io/raydium-sdk-v2";
import { AccountLayout } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { LRUCache } from "lru-cache";
import { raydiumConfig } from "../../config/raydium";
import { formatAmount } from "../../core/format";
import { InvalidMintError, RaydiumApiError } from "../../core/errors";
import {
  type RaydiumPoolDto,
  type RaydiumPoolKeysDto,
  type RaydiumPoolKind,
  type RaydiumPoolsByMintResponseDto,
  type RaydiumTokenDto,
  type RaydiumVaultBalanceDto
} from "./dtos";
import { getRaydiumClient, getRaydiumConnection } from "./raydiumClient";

export interface GetRaydiumPoolsByMintOptions {
  poolType?: "all" | "concentrated" | "standard";
  sort?:
    | "default"
    | "liquidity"
    | "volume24h"
    | "volume7d"
    | "volume30d"
    | "fee24h"
    | "fee7d"
    | "fee30d"
    | "apr24h"
    | "apr7d"
    | "apr30d";
  order?: "asc" | "desc";
  includeKeys?: boolean;
  includeVaultBalances?: boolean;
}

const poolsCache = new LRUCache<string, RaydiumPoolsByMintResponseDto>({
  max: 500,
  ttl: raydiumConfig.RAYDIUM_POOLS_CACHE_TTL_MS
});

const poolKeysCache = new LRUCache<string, PoolKeys>({
  max: 5000,
  ttl: raydiumConfig.RAYDIUM_POOL_KEYS_CACHE_TTL_MS
});

export async function getRaydiumPoolsByMint(
  mint: string,
  opts: GetRaydiumPoolsByMintOptions
): Promise<RaydiumPoolsByMintResponseDto> {
  try {
    new PublicKey(mint);
  } catch {
    throw new InvalidMintError(mint);
  }

  const poolType = opts.poolType ?? "all";
  const sort = opts.sort ?? "liquidity";
  const order = opts.order ?? "desc";
  const apiSort = sort === "default" ? undefined : sort;

  const cacheKey = `pools:${mint}:${poolType}:${sort}:${order}`;
  const cached = poolsCache.get(cacheKey);
  if (cached) {
    const clonedPools = cached.pools.map(clonePoolDto);
    return {
      inputMint: cached.inputMint,
      fetchedAtUnixMs: cached.fetchedAtUnixMs,
      pools: await attachKeysAndVaults(clonedPools, opts)
    };
  }

  const pools = await fetchPoolsByMint(mint, { poolType, sort: apiSort, order });
  const response: RaydiumPoolsByMintResponseDto = {
    inputMint: mint,
    fetchedAtUnixMs: Date.now(),
    pools
  };

  poolsCache.set(cacheKey, response);

  return {
    ...response,
    pools: await attachKeysAndVaults(response.pools.map(clonePoolDto), opts)
  };
}

type ApiSort = Exclude<GetRaydiumPoolsByMintOptions["sort"], "default">;

type FetchPoolsOptions = {
  poolType: "all" | "concentrated" | "standard";
  sort?: ApiSort;
  order: "asc" | "desc";
};

async function fetchPoolsByMint(
  mint: string,
  opts: FetchPoolsOptions
): Promise<RaydiumPoolDto[]> {
  const raydium = await getRaydiumClient();

  const type =
    opts.poolType === "concentrated"
      ? PoolFetchType.Concentrated
      : opts.poolType === "standard"
        ? PoolFetchType.Standard
        : PoolFetchType.All;

  const byId = new Map<string, RaydiumPoolDto>();

  for (let page = 1; page <= raydiumConfig.RAYDIUM_MAX_PAGES; page += 1) {
    let result: { data?: unknown[]; hasNextPage?: boolean };
    try {
      result = await raydium.api.fetchPoolByMints({
        mint1: mint,
        type,
        sort: opts.sort,
        order: opts.order,
        page
      });
    } catch (err) {
      throw new RaydiumApiError("Raydium API error while fetching pools", err);
    }

    const items = (result.data ?? []) as Array<Record<string, unknown>>;
    for (const pool of items) {
      const id = String(pool.id ?? "");
      if (!id || byId.has(id)) {
        continue;
      }
      byId.set(id, mapPoolInfoToDto(pool));
    }

    if (!result.hasNextPage) {
      break;
    }
  }

  return Array.from(byId.values());
}

async function attachKeysAndVaults(
  pools: RaydiumPoolDto[],
  opts: GetRaydiumPoolsByMintOptions
): Promise<RaydiumPoolDto[]> {
  const includeKeys = opts.includeKeys || opts.includeVaultBalances || false;
  let keysById: Map<string, PoolKeys> | null = null;

  if (includeKeys) {
    try {
      keysById = await fetchPoolKeys(pools.map((pool) => pool.id));
    } catch (err) {
      if (opts.includeKeys || opts.includeVaultBalances) {
        throw new RaydiumApiError("Raydium API error while fetching pool keys", err);
      }
      keysById = null;
    }
  }

  if (keysById) {
    for (const pool of pools) {
      const keys = keysById.get(pool.id);
      if (!keys) continue;
      const keysDto = mapPoolKeys(pool.id, keys);
      pool.keys = keysDto;
      if (pool.kind === "unknown" && keysDto.kind !== "unknown") {
        pool.kind = keysDto.kind;
      }
    }
  }

  if (opts.includeVaultBalances) {
    try {
      await attachVaultBalances(pools);
    } catch {
      // non-fatal
    }
  }

  return pools;
}

async function fetchPoolKeys(ids: string[]): Promise<Map<string, PoolKeys>> {
  const raydium = await getRaydiumClient();
  const result = new Map<string, PoolKeys>();
  const missing: string[] = [];

  for (const id of ids) {
    const cached = poolKeysCache.get(id);
    if (cached) {
      result.set(id, cached);
    } else {
      missing.push(id);
    }
  }

  const chunkSize = 50;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    const response = await raydium.api.fetchPoolKeysById({ idList: chunk });
    for (const key of response ?? []) {
      const id = String((key as { id?: string }).id ?? "");
      if (!id) continue;
      poolKeysCache.set(id, key as PoolKeys);
      result.set(id, key as PoolKeys);
    }
  }

  return result;
}

function mapPoolInfoToDto(pool: Record<string, unknown>): RaydiumPoolDto {
  const id = String(pool.id ?? "");
  const programId = pool.programId ? String(pool.programId) : undefined;

  const mintA = normalizeToken(pool.mintA, pool.baseMint);
  const mintB = normalizeToken(pool.mintB, pool.quoteMint);

  const kind = normalizeKindFromType(pool.type);

  const metrics = {
    price: toStringOrUndefined(pool.price),
    tvl: toStringOrUndefined(pool.tvl),
    feeRate: toStringOrUndefined(pool.feeRate),
    mintAmountA: toStringOrUndefined(pool.mintAmountA),
    mintAmountB: toStringOrUndefined(pool.mintAmountB),
    mintAmountAUsd: toStringOrUndefined(pool.mintAmountAUsd),
    mintAmountBUsd: toStringOrUndefined(pool.mintAmountBUsd),
    volume24h: toStringOrUndefined(pool.volume24h),
    fee24h: toStringOrUndefined(pool.fee24h),
    apr24h: toStringOrUndefined(pool.apr24h),
    volume7d: toStringOrUndefined(pool.volume7d),
    fee7d: toStringOrUndefined(pool.fee7d),
    apr7d: toStringOrUndefined(pool.apr7d),
    volume30d: toStringOrUndefined(pool.volume30d),
    fee30d: toStringOrUndefined(pool.fee30d),
    apr30d: toStringOrUndefined(pool.apr30d)
  };

  return {
    id,
    kind: kind ?? "unknown",
    programId,
    mintA,
    mintB,
    metrics
  };
}

function mapPoolKeys(id: string, keys: PoolKeys): RaydiumPoolKeysDto {
  const kind = deriveKindFromKeys(keys);
  const vaultA = extractVault(keys, "A");
  const vaultB = extractVault(keys, "B");

  return {
    id,
    kind,
    vaultA,
    vaultB,
    raw: keys
  };
}

function normalizeToken(token: unknown, fallback?: unknown): RaydiumTokenDto {
  const raw = token ?? fallback;
  if (!raw) {
    return { address: "" };
  }
  if (typeof raw === "string") {
    return { address: raw };
  }

  const obj = raw as Record<string, unknown>;
  const address =
    (obj.address as string) ||
    (obj.mint as string) ||
    (obj.id as string) ||
    (fallback as string) ||
    "";

  return {
    address,
    symbol: obj.symbol as string | undefined,
    name: obj.name as string | undefined,
    decimals: obj.decimals as number | undefined,
    logoURI: obj.logoURI as string | undefined
  };
}

function normalizeKindFromType(type: unknown): RaydiumPoolKind | undefined {
  if (!type) return undefined;
  const value = String(type).toLowerCase();
  if (value.includes("clmm") || value.includes("concentrated")) return "concentrated";
  if (value.includes("cpmm")) return "cpmm";
  if (value.includes("amm") || value.includes("standard")) return "standard";
  return undefined;
}

function deriveKindFromKeys(keys: PoolKeys): RaydiumPoolKind {
  const anyKeys = keys as unknown as Record<string, unknown>;
  if (anyKeys.baseVault && anyKeys.quoteVault) return "standard";
  if (anyKeys.vaultA && anyKeys.vaultB) return "cpmm";
  const vault = anyKeys.vault as Record<string, unknown> | undefined;
  if (vault?.A && vault?.B) return "concentrated";
  return "unknown";
}

function extractVault(keys: PoolKeys, side: "A" | "B"): string | undefined {
  const anyKeys = keys as unknown as Record<string, unknown>;
  if (anyKeys.baseVault && anyKeys.quoteVault) {
    return String(side === "A" ? anyKeys.baseVault : anyKeys.quoteVault);
  }
  if (anyKeys.vaultA && anyKeys.vaultB) {
    return String(side === "A" ? anyKeys.vaultA : anyKeys.vaultB);
  }
  const vault = anyKeys.vault as Record<string, unknown> | undefined;
  if (vault?.A && vault?.B) {
    return String(side === "A" ? vault.A : vault.B);
  }
  return undefined;
}

async function attachVaultBalances(pools: RaydiumPoolDto[]): Promise<void> {
  const connection = getRaydiumConnection();
  const vaultDecimals = new Map<string, number>();

  for (const pool of pools) {
    if (!pool.keys) continue;
    if (pool.keys.vaultA && pool.mintA.decimals != null) {
      vaultDecimals.set(pool.keys.vaultA, pool.mintA.decimals);
    }
    if (pool.keys.vaultB && pool.mintB.decimals != null) {
      vaultDecimals.set(pool.keys.vaultB, pool.mintB.decimals);
    }
  }

  const vaultAddresses = Array.from(vaultDecimals.keys());
  const balances = await fetchVaultBalances(vaultAddresses, vaultDecimals, connection);
  const fetchedAtUnixMs = Date.now();

  for (const pool of pools) {
    if (!pool.keys) continue;
    const vaultA = pool.keys.vaultA ? balances.get(pool.keys.vaultA) : undefined;
    const vaultB = pool.keys.vaultB ? balances.get(pool.keys.vaultB) : undefined;
    pool.vaultBalances = {
      vaultA,
      vaultB,
      fetchedAtUnixMs
    };
  }
}

async function fetchVaultBalances(
  addresses: string[],
  decimals: Map<string, number>,
  connection: ReturnType<typeof getRaydiumConnection>
): Promise<Map<string, RaydiumVaultBalanceDto>> {
  const balances = new Map<string, RaydiumVaultBalanceDto>();
  const chunkSize = 100;

  for (let i = 0; i < addresses.length; i += chunkSize) {
    const chunk = addresses.slice(i, i + chunkSize);
    const pubkeys = chunk.map((address) => new PublicKey(address));
    const infos = await connection.getMultipleAccountsInfo(pubkeys);

    for (let idx = 0; idx < infos.length; idx += 1) {
      const info = infos[idx];
      if (!info) continue;
      const address = chunk[idx];
      const decoded = AccountLayout.decode(info.data);
      const amountRaw = decoded.amount.toString();
      const decimalsForVault = decimals.get(address) ?? 0;
      balances.set(address, {
        address,
        amountRaw,
        amount: formatAmount(amountRaw, decimalsForVault)
      });
    }
  }

  return balances;
}

function toStringOrUndefined(value: unknown): string | undefined {
  return value == null ? undefined : String(value);
}

function clonePoolDto(pool: RaydiumPoolDto): RaydiumPoolDto {
  return {
    ...pool,
    mintA: { ...pool.mintA },
    mintB: { ...pool.mintB },
    metrics: { ...pool.metrics },
    keys: pool.keys ? { ...pool.keys } : undefined,
    vaultBalances: pool.vaultBalances
      ? {
          fetchedAtUnixMs: pool.vaultBalances.fetchedAtUnixMs,
          vaultA: pool.vaultBalances.vaultA ? { ...pool.vaultBalances.vaultA } : undefined,
          vaultB: pool.vaultBalances.vaultB ? { ...pool.vaultBalances.vaultB } : undefined
        }
      : undefined
  };
}
