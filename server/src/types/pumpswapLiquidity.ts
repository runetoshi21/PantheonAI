export type BuildPumpSwapDepositTxRequest = {
  user: string;
  baseMint: string;
  slippageBps: number;
  depositMode:
    | { kind: "baseIn"; baseAmountUi: string }
    | { kind: "quoteIn"; quoteAmountUi: string }
    | { kind: "lpOut"; lpAmountRaw: string };
  computeBudget?: {
    unitLimit?: number;
    unitPriceMicroLamports?: number;
  };
};

export type BuildPumpSwapDepositTxResponse =
  | {
      ok: true;
      user: string;
      baseMint: string;
      canonicalPool: {
        poolKey: string;
        quoteMint: string;
        lpMint: string;
        userLpAta: string;
        userBaseAta: string;
        userQuoteAta: string;
        poolBaseVault: string;
        poolQuoteVault: string;
      };
      quote: {
        baseDecimals: number;
        quoteDecimals: number;
        lpDecimals: number;
        lpOutRaw: string;
        estBaseInRaw: string;
        estQuoteInRaw: string;
        maxBaseInRaw: string;
        maxQuoteInRaw: string;
      };
      tx: {
        version: "v0";
        base64: string;
        blockhash: string;
        lastValidBlockHeight: number;
      };
    }
  | {
      ok: false;
      error:
        | { code: "INVALID_PUBKEY"; message: string }
        | { code: "POOL_NOT_FOUND"; message: string; derivedPoolKey: string }
        | { code: "INVALID_SLIPPAGE"; message: string }
        | { code: "INVALID_AMOUNT"; message: string };
    };

export type BuildPumpSwapWithdrawTxRequest = {
  user: string;
  baseMint: string;
  slippageBps: number;
  withdrawMode:
    | { kind: "lpInUi"; lpAmountUi: string }
    | { kind: "lpInRaw"; lpAmountRaw: string }
    | { kind: "percentBps"; percentBps: number }
    | { kind: "all" };
  computeBudget?: {
    unitLimit?: number;
    unitPriceMicroLamports?: number;
  };
  closeLpAtaIfAll?: boolean;
};

export type BuildPumpSwapWithdrawTxResponse =
  | {
      ok: true;
      user: string;
      baseMint: string;
      canonicalPool: {
        poolKey: string;
        quoteMint: string;
        lpMint: string;
        userLpAta: string;
        userBaseAta: string;
        userQuoteAta: string;
        poolBaseVault: string;
        poolQuoteVault: string;
      };
      position: {
        lpBalanceRaw: string;
        lpDecimals: number;
      };
      quote: {
        baseDecimals: number;
        quoteDecimals: number;
        lpDecimals: number;
        lpInRaw: string;
        estBaseOutRaw: string;
        estQuoteOutRaw: string;
        minBaseOutRaw: string;
        minQuoteOutRaw: string;
      };
      tx: {
        version: "v0";
        base64: string;
        blockhash: string;
        lastValidBlockHeight: number;
      };
    }
  | {
      ok: false;
      error:
        | { code: "INVALID_PUBKEY"; message: string }
        | { code: "POOL_NOT_FOUND"; message: string; derivedPoolKey: string }
        | { code: "NO_LP_POSITION"; message: string }
        | { code: "INVALID_SLIPPAGE"; message: string }
        | { code: "INVALID_AMOUNT"; message: string }
        | { code: "AMOUNT_EXCEEDS_BALANCE"; message: string };
    };
