export type PumpSwapPoolSnapshot = {
  found: true;
  inputMint: string;
  canonicalPool: {
    poolKey: string;
    baseMint: string;
    quoteMint: string;
    index: number;
    creator: string;
    lpMint: string;
    poolBaseVault: string;
    poolQuoteVault: string;
    coinCreator: string;
    isMayhemMode: boolean;
  };
  tokenPrograms: {
    baseTokenProgram: string;
    quoteTokenProgram: string;
  };
  reserves: {
    base: { amountRaw: string; decimals: number; amountUi: string };
    quote: { amountRaw: string; decimals: number; amountUi: string };
  };
  baseMintSupply: { supplyRaw: string; decimals: number; supplyUi: string };
  spotPrice: { quotePerBase: string };
  marketCap: { quoteLamports: string; quoteSol: string };
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
    source: "feeConfigTier" | "feeConfigFlat" | "globalConfig";
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
  derivedCanonicalPoolKey: string;
  reason: "POOL_ACCOUNT_NOT_FOUND";
};
