import BN from "bn.js";
import {
  canonicalPumpPoolPda,
  OnlinePumpAmmSdk,
  PUMP_AMM_SDK,
  depositLpToken
} from "@pump-fun/pump-swap-sdk";
import { MintLayout, NATIVE_MINT } from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  PublicKey,
  TransactionMessage,
  VersionedTransaction
} from "@solana/web3.js";
import { getSolanaConnection } from "../../src/solana/connection";
import type {
  BuildPumpSwapDepositTxRequest,
  BuildPumpSwapDepositTxResponse
} from "../../src/types/pumpswapLiquidity";
import { parseUiToRaw } from "./amounts";

export async function buildPumpSwapDepositTx(
  req: BuildPumpSwapDepositTxRequest
): Promise<BuildPumpSwapDepositTxResponse> {
  const slippageValidation = validateSlippage(req.slippageBps);
  if (!slippageValidation.ok) return slippageValidation.error;
  const slippagePct = slippageValidation.slippagePct;

  let userPk: PublicKey;
  let baseMintPk: PublicKey;
  try {
    userPk = new PublicKey(req.user);
    baseMintPk = new PublicKey(req.baseMint);
  } catch {
    return invalidPubkey("Invalid user or baseMint public key");
  }

  const poolKey = canonicalPumpPoolPda(baseMintPk);

  const connection = getSolanaConnection();
  const online = new OnlinePumpAmmSdk(connection);

  let liquidityState;
  try {
    liquidityState = await online.liquiditySolanaState(poolKey, userPk);
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes("pool account not found")) {
      return poolNotFound(poolKey);
    }
    throw err;
  }

  const { pool } = liquidityState;

  const [baseMintAi, lpMintAi] = await connection.getMultipleAccountsInfo([
    pool.baseMint,
    pool.lpMint
  ]);

  if (!baseMintAi || !lpMintAi) {
    throw new Error("mint account missing");
  }

  const baseDecimals = MintLayout.decode(baseMintAi.data).decimals;
  const lpDecimals = MintLayout.decode(lpMintAi.data).decimals;
  const quoteDecimals = pool.quoteMint.equals(NATIVE_MINT) ? 9 : 9;

  const baseReserve = new BN(liquidityState.poolBaseTokenAccount.amount.toString());
  const quoteReserve = new BN(liquidityState.poolQuoteTokenAccount.amount.toString());

  let lpOutRaw: BN;

  try {
    const mode = req.depositMode;
    if (mode.kind === "baseIn") {
      const baseInRaw = parseUiToRaw(mode.baseAmountUi, baseDecimals);
      const { lpToken } = PUMP_AMM_SDK.depositBaseInput(liquidityState, baseInRaw, slippagePct);
      lpOutRaw = lpToken;
    } else if (mode.kind === "quoteIn") {
      const quoteInRaw = parseUiToRaw(mode.quoteAmountUi, quoteDecimals);
      const { lpToken } = PUMP_AMM_SDK.depositQuoteInput(liquidityState, quoteInRaw, slippagePct);
      lpOutRaw = lpToken;
    } else if (mode.kind === "lpOut") {
      lpOutRaw = new BN(mode.lpAmountRaw);
      if (lpOutRaw.lte(new BN(0))) {
        return invalidAmount("LP amount must be greater than zero");
      }
    } else {
      return invalidAmount("Invalid deposit mode");
    }
  } catch (err) {
    return invalidAmount("Invalid deposit amount");
  }

  if (lpOutRaw.isZero()) {
    return invalidAmount("LP amount resolves to zero");
  }

  const est = depositLpToken(lpOutRaw, 0, baseReserve, quoteReserve, pool.lpSupply);
  const max = depositLpToken(
    lpOutRaw,
    slippagePct,
    baseReserve,
    quoteReserve,
    pool.lpSupply
  );

  const ixs = await PUMP_AMM_SDK.depositInstructions(
    liquidityState,
    lpOutRaw,
    slippagePct
  );

  const cbIxs: import("@solana/web3.js").TransactionInstruction[] = [];
  if (req.computeBudget?.unitLimit) {
    cbIxs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: req.computeBudget.unitLimit }));
  }
  if (req.computeBudget?.unitPriceMicroLamports) {
    cbIxs.push(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: req.computeBudget.unitPriceMicroLamports
      })
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
    "confirmed"
  );

  const msg = new TransactionMessage({
    payerKey: userPk,
    recentBlockhash: blockhash,
    instructions: [...cbIxs, ...ixs]
  }).compileToV0Message();

  const tx = new VersionedTransaction(msg);
  const base64 = Buffer.from(tx.serialize()).toString("base64");

  return {
    ok: true,
    user: userPk.toBase58(),
    baseMint: baseMintPk.toBase58(),
    canonicalPool: {
      poolKey: poolKey.toBase58(),
      quoteMint: pool.quoteMint.toBase58(),
      lpMint: pool.lpMint.toBase58(),
      userLpAta: liquidityState.userPoolTokenAccount.toBase58(),
      userBaseAta: liquidityState.userBaseTokenAccount.toBase58(),
      userQuoteAta: liquidityState.userQuoteTokenAccount.toBase58(),
      poolBaseVault: pool.poolBaseTokenAccount.toBase58(),
      poolQuoteVault: pool.poolQuoteTokenAccount.toBase58()
    },
    quote: {
      baseDecimals,
      quoteDecimals,
      lpDecimals,
      lpOutRaw: lpOutRaw.toString(10),
      estBaseInRaw: est.maxBase.toString(10),
      estQuoteInRaw: est.maxQuote.toString(10),
      maxBaseInRaw: max.maxBase.toString(10),
      maxQuoteInRaw: max.maxQuote.toString(10)
    },
    tx: {
      version: "v0",
      base64,
      blockhash,
      lastValidBlockHeight
    }
  };
}

function validateSlippage(slippageBps: number):
  | { ok: true; slippagePct: number }
  | { ok: false; error: BuildPumpSwapDepositTxResponse } {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10000) {
    return {
      ok: false,
      error: invalidSlippage("Slippage must be an integer between 0 and 10000 bps")
    };
  }

  const slippagePct = slippageBps / 100;
  if (slippagePct < 0 || slippagePct > 100) {
    return {
      ok: false,
      error: invalidSlippage("Slippage must be between 0% and 100%")
    };
  }

  return { ok: true, slippagePct };
}

function invalidPubkey(message: string): BuildPumpSwapDepositTxResponse {
  return { ok: false, error: { code: "INVALID_PUBKEY", message } };
}

function invalidSlippage(message: string): BuildPumpSwapDepositTxResponse {
  return { ok: false, error: { code: "INVALID_SLIPPAGE", message } };
}

function invalidAmount(message: string): BuildPumpSwapDepositTxResponse {
  return { ok: false, error: { code: "INVALID_AMOUNT", message } };
}

function poolNotFound(poolKey: PublicKey): BuildPumpSwapDepositTxResponse {
  return {
    ok: false,
    error: {
      code: "POOL_NOT_FOUND",
      message: "Canonical pool account not found",
      derivedPoolKey: poolKey.toBase58()
    }
  };
}
