import BN from "bn.js";
import {
  canonicalPumpPoolPda,
  OnlinePumpAmmSdk,
  PUMP_AMM_SDK,
  depositLpToken
} from "@pump-fun/pump-swap-sdk";
import { MintLayout, NATIVE_MINT } from "@solana/spl-token";
import {
  TransactionMessage,
  VersionedTransaction,
  type TransactionInstruction
} from "@solana/web3.js";
import { getSolanaConnection } from "../../src/solana/connection";
import type {
  BuildPumpSwapDepositTxRequest,
  BuildPumpSwapDepositTxResponse
} from "../../src/types/pumpswapLiquidity";
import { parseUiToRaw } from "./amounts";
import {
  buildCanonicalPoolInfo,
  buildComputeBudgetIxs,
  invalidAmount,
  parseUserAndBaseMint,
  poolNotFound,
  validateSlippageBps
} from "./common";

export async function buildPumpSwapDepositTx(
  req: BuildPumpSwapDepositTxRequest
): Promise<BuildPumpSwapDepositTxResponse> {
  const slippageValidation = validateSlippageBps(req.slippageBps);
  if (!slippageValidation.ok) return slippageValidation.response;
  const slippagePct = slippageValidation.slippagePct;

  const parsedKeys = parseUserAndBaseMint(req.user, req.baseMint);
  if (!parsedKeys.ok) return parsedKeys.response;
  const { userPk, baseMintPk } = parsedKeys;

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
  } catch {
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

  const cbIxs: TransactionInstruction[] = buildComputeBudgetIxs(req.computeBudget);

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
    canonicalPool: buildCanonicalPoolInfo({ poolKey, pool, liquidityState }),
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
