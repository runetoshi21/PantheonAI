import type { MeteoraCluster } from "./config";

export type DlmmPairsResponse = {
  pairs?: DlmmPair[];
  total?: number;
};

export type DlmmPair = Record<string, unknown> & {
  address?: string;
  mint_x?: string;
  mint_y?: string;
};

export type DammV2PoolsResponse = {
  data?: DammV2Pool[];
  pools?: DammV2Pool[];
};

export type DammV2Pool = Record<string, unknown> & {
  pool_address?: string;
  token_a_mint?: string;
  token_b_mint?: string;
};

export type DammV1PoolsResponse = {
  data?: unknown;
  total_count?: number;
};

export type NormalizedPoolProtocol = "DLMM" | "DAMM_V2" | "DAMM_V1";

export type NormalizedPool = {
  protocol: NormalizedPoolProtocol;
  poolAddress: string;
  poolName: string | null;
  tokens: Array<{ mint: string; role: "X" | "Y" | "A" | "B" | "UNKNOWN"; isInputMint: boolean }>;
  metrics: {
    tvlUsd: number | null;
    volume24hUsd: number | null;
    fees24hUsd: number | null;
    apr24h: number | null;
    apy24h: number | null;
  };
  liquidity: {
    reserves: Array<{ mint: string; amount: string; amountUsd: string | null }>;
  };
  setup: {
    fee: { baseFee: string | null; maxFee: string | null; protocolFee: string | null };
    binStep: number | null;
    currentPrice: number | null;
    tags: string[];
  };
  locks: {
    dammV2?: {
      vesting?: {
        totalLockedLiquidity: string;
        totalReleasedLiquidity: string;
        positions: Array<{
          positionAddress: string;
          vestingEndTimestamp: number;
          cliffPoint: number;
          totalLockedLiquidity: string;
          totalReleasedLiquidity: string;
        }>;
      };
    };
    dlmm?: {
      positionLocks?: Array<{
        position: string;
        owner: string;
        lockReleasePoint: number;
        closed: boolean;
      }>;
    };
  };
  raw: {
    dlmm: Record<string, unknown>;
    dammV2: Record<string, unknown>;
    dammV1: Record<string, unknown>;
  };
};

export type MeteoraErrorEntry = {
  protocol: NormalizedPoolProtocol;
  message: string;
};

export type GetPoolsByMintParams = {
  mint: string;
  cluster: MeteoraCluster;
  includeUnknown: boolean;
  includeVesting: boolean;
  includeDlmmLocks: boolean;
  minTvlUsd?: number;
  limitPerProtocol: number;
  timeoutMs: number;
};

export type GetPoolsByMintResult = {
  mint: string;
  cluster: MeteoraCluster;
  fetchedAt: string;
  summary: {
    totalPools: number;
    byProtocol: {
      DLMM: number;
      DAMM_V2: number;
      DAMM_V1: number;
    };
    totalTvlUsd: number;
  };
  pools: NormalizedPool[];
  errors: MeteoraErrorEntry[];
};
