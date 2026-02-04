import { ComputeBudgetProgram, PublicKey, type TransactionInstruction } from "@solana/web3.js";

export type PumpSwapSharedError =
  | { code: "INVALID_PUBKEY"; message: string }
  | { code: "POOL_NOT_FOUND"; message: string; derivedPoolKey: string }
  | { code: "INVALID_SLIPPAGE"; message: string }
  | { code: "INVALID_AMOUNT"; message: string };

export type PumpSwapSharedErrorResponse = { ok: false; error: PumpSwapSharedError };

export function invalidPubkey(message: string): PumpSwapSharedErrorResponse {
  return { ok: false, error: { code: "INVALID_PUBKEY", message } };
}

export function invalidSlippage(message: string): PumpSwapSharedErrorResponse {
  return { ok: false, error: { code: "INVALID_SLIPPAGE", message } };
}

export function invalidAmount(message: string): PumpSwapSharedErrorResponse {
  return { ok: false, error: { code: "INVALID_AMOUNT", message } };
}

export function poolNotFound(poolKey: PublicKey): PumpSwapSharedErrorResponse {
  return {
    ok: false,
    error: {
      code: "POOL_NOT_FOUND",
      message: "Canonical pool account not found",
      derivedPoolKey: poolKey.toBase58()
    }
  };
}

export function validateSlippageBps(slippageBps: number):
  | { ok: true; slippagePct: number }
  | { ok: false; response: PumpSwapSharedErrorResponse } {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10000) {
    return {
      ok: false,
      response: invalidSlippage("Slippage must be an integer between 0 and 10000 bps")
    };
  }

  const slippagePct = slippageBps / 100;
  if (slippagePct < 0 || slippagePct > 100) {
    return {
      ok: false,
      response: invalidSlippage("Slippage must be between 0% and 100%")
    };
  }

  return { ok: true, slippagePct };
}

export function parseUserAndBaseMint(user: string, baseMint: string):
  | { ok: true; userPk: PublicKey; baseMintPk: PublicKey }
  | { ok: false; response: PumpSwapSharedErrorResponse } {
  try {
    const userPk = new PublicKey(user);
    const baseMintPk = new PublicKey(baseMint);
    return { ok: true, userPk, baseMintPk };
  } catch {
    return { ok: false, response: invalidPubkey("Invalid user or baseMint public key") };
  }
}

export function buildComputeBudgetIxs(computeBudget?: {
  unitLimit?: number;
  unitPriceMicroLamports?: number;
}): TransactionInstruction[] {
  const instructions: TransactionInstruction[] = [];
  if (computeBudget?.unitLimit) {
    instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: computeBudget.unitLimit }));
  }
  if (computeBudget?.unitPriceMicroLamports) {
    instructions.push(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: computeBudget.unitPriceMicroLamports
      })
    );
  }
  return instructions;
}

type CanonicalPoolInfo = {
  poolKey: string;
  quoteMint: string;
  lpMint: string;
  userLpAta: string;
  userBaseAta: string;
  userQuoteAta: string;
  poolBaseVault: string;
  poolQuoteVault: string;
};

type PoolInfoLike = {
  quoteMint: PublicKey;
  lpMint: PublicKey;
  poolBaseTokenAccount: PublicKey;
  poolQuoteTokenAccount: PublicKey;
};

type LiquidityStateLike = {
  userPoolTokenAccount: PublicKey;
  userBaseTokenAccount: PublicKey;
  userQuoteTokenAccount: PublicKey;
};

export function buildCanonicalPoolInfo(params: {
  poolKey: PublicKey;
  pool: PoolInfoLike;
  liquidityState: LiquidityStateLike;
}): CanonicalPoolInfo {
  const { poolKey, pool, liquidityState } = params;
  return {
    poolKey: poolKey.toBase58(),
    quoteMint: pool.quoteMint.toBase58(),
    lpMint: pool.lpMint.toBase58(),
    userLpAta: liquidityState.userPoolTokenAccount.toBase58(),
    userBaseAta: liquidityState.userBaseTokenAccount.toBase58(),
    userQuoteAta: liquidityState.userQuoteTokenAccount.toBase58(),
    poolBaseVault: pool.poolBaseTokenAccount.toBase58(),
    poolQuoteVault: pool.poolQuoteTokenAccount.toBase58()
  };
}
