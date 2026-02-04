export type Protocol = "raydium" | "meteora" | "pumpswap";

export type RaydiumPoolDto = {
  id: string;
  kind: string;
  mintA: { address: string; symbol?: string; name?: string };
  mintB: { address: string; symbol?: string; name?: string };
  metrics: {
    price?: string;
    tvl?: string;
    feeRate?: string;
    mintAmountA?: string;
    mintAmountB?: string;
    volume24h?: string;
    fee24h?: string;
    apr24h?: string;
  };
  vaultBalances?: {
    vaultA?: { amount: string };
    vaultB?: { amount: string };
  };
};

export type RaydiumPoolsByMintResponseDto = {
  inputMint: string;
  fetchedAtUnixMs: number;
  pools: RaydiumPoolDto[];
};

export type PumpSwapPoolSnapshot = {
  found: true;
  inputMint: string;
  canonicalPool: {
    poolKey: string;
    baseMint: string;
    quoteMint: string;
    index?: number;
    creator?: string;
    lpMint?: string;
    poolBaseVault?: string;
    poolQuoteVault?: string;
    coinCreator?: string;
    isMayhemMode?: boolean;
  };
  tokenPrograms?: {
    baseTokenProgram: string;
    quoteTokenProgram: string;
  };
  reserves: {
    base: { amountUi: string; amountRaw?: string; decimals?: number };
    quote: { amountUi: string; amountRaw?: string; decimals?: number };
  };
  baseMintSupply?: { supplyRaw: string; decimals: number; supplyUi: string };
  spotPrice: { quotePerBase: string };
  marketCap?: { quoteLamports: string; quoteSol: string };
  liquidityUsd?: {
    solPriceUsd: string;
    baseUsd: string;
    quoteUsd: string;
    totalUsd: string;
  };
  feesBps: {
    lpFeeBps: string;
    protocolFeeBps: string;
    creatorFeeBps: string;
    source?: "feeConfigTier" | "feeConfigFlat" | "globalConfig";
  };
  configs?: {
    globalConfig: {
      lpFeeBasisPoints: string;
      protocolFeeBasisPoints: string;
      coinCreatorFeeBasisPoints: string;
      disableFlags: number;
    };
    feeConfig: null | {
      flatFees: {
        lpFeeBps: string;
        protocolFeeBps: string;
        creatorFeeBps: string;
      };
      feeTiers: Array<{
        marketCapLamportsThreshold: string;
        fees: {
          lpFeeBps: string;
          protocolFeeBps: string;
          creatorFeeBps: string;
        };
      }>;
    };
  };
};

export type PumpSwapPoolNotFound = {
  found: false;
  inputMint: string;
  derivedCanonicalPoolKey?: string;
  reason: string;
};

export type MeteoraPool = {
  protocol: "DLMM" | "DAMM_V1" | "DAMM_V2";
  poolAddress: string;
  poolName: string | null;
  tokens: Array<{ mint: string; role: string; isInputMint: boolean }>;
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
};

export type MeteoraResult = {
  mint: string;
  cluster: string;
  fetchedAt: string;
  summary: {
    totalPools: number;
    byProtocol: { DLMM: number; DAMM_V2: number; DAMM_V1: number };
    totalTvlUsd: number;
  };
  pools: MeteoraPool[];
  errors: Array<{ protocol: string; message: string }>;
};

export type LiquidityProtocolResult =
  | { protocol: "raydium"; ok: true; data: RaydiumPoolsByMintResponseDto }
  | { protocol: "raydium"; ok: false; error: string }
  | { protocol: "pumpswap"; ok: true; data: PumpSwapPoolSnapshot | PumpSwapPoolNotFound }
  | { protocol: "pumpswap"; ok: false; error: string }
  | { protocol: "meteora"; ok: true; data: MeteoraResult }
  | { protocol: "meteora"; ok: false; error: string };

export type LiquidityOverviewResponse = {
  inputMint: string;
  fetchedAtUnixMs: number;
  results: LiquidityProtocolResult[];
};

export type SelectedPool = { protocol: Protocol; id: string };

export type DepthBand = {
  min: number;
  max: number;
  impactPct: number;
};

export type SelectedPoolDetail = {
  protocol: string;
  name: string;
  address: string;
  kind: string;
  price: number | null;
  band: DepthBand | null;
  baseLabel: string;
  quoteLabel: string;
  reserves: { base: number; quote: number } | null;
  tvl: number | null;
  volume: number | null;
  apr: number | null;
  fee: number | null;
  binStep?: number | null;
};

export type PoolTotals = {
  pools: number;
  tvl: number;
};
