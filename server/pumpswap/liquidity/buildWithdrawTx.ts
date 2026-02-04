import BN from "bn.js";
import {
  canonicalPumpPoolPda,
  OnlinePumpAmmSdk,
  PUMP_AMM_SDK
} from "@pump-fun/pump-swap-sdk";
import {
  AccountLayout,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  MintLayout,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";
import {
  TransactionMessage,
  VersionedTransaction,
  type TransactionInstruction
} from "@solana/web3.js";
import { getSolanaConnection } from "../../src/solana/connection";
import type {
  BuildPumpSwapWithdrawTxRequest,
  BuildPumpSwapWithdrawTxResponse
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

export async function buildPumpSwapWithdrawTx(
  req: BuildPumpSwapWithdrawTxRequest
): Promise<BuildPumpSwapWithdrawTxResponse> {
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
  } catch {
    return poolNotFound(poolKey);
  }

  if (!liquidityState.userPoolAccountInfo) {
    return noLpPosition("User has no LP position");
  }

  const decodedUserPool = AccountLayout.decode(
    liquidityState.userPoolAccountInfo.data.slice(0, AccountLayout.span)
  );
  const lpBalanceRaw = new BN(decodedUserPool.amount.toString());

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

  const resolvedLp = resolveWithdrawLpInRaw(req.withdrawMode, lpBalanceRaw, lpDecimals);
  if (!resolvedLp.ok) return resolvedLp.response;
  const lpInRaw = resolvedLp.lpInRaw;

  const wr = PUMP_AMM_SDK.withdrawInputs(liquidityState, lpInRaw, slippagePct);

  const cbIxs: TransactionInstruction[] = buildComputeBudgetIxs(req.computeBudget);

  const preIxs: TransactionInstruction[] = [];
  if (!liquidityState.userBaseAccountInfo) {
    preIxs.push(
      createAssociatedTokenAccountIdempotentInstruction(
        userPk,
        liquidityState.userBaseTokenAccount,
        userPk,
        pool.baseMint,
        liquidityState.baseTokenProgram
      )
    );
  }

  const withdrawIxs = await PUMP_AMM_SDK.withdrawInstructions(
    liquidityState,
    lpInRaw,
    slippagePct
  );

  const postIxs: TransactionInstruction[] = [];
  if (req.withdrawMode.kind === "all" && req.closeLpAtaIfAll !== false) {
    postIxs.push(
      createCloseAccountInstruction(
        liquidityState.userPoolTokenAccount,
        userPk,
        userPk,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
    "confirmed"
  );

  const msg = new TransactionMessage({
    payerKey: userPk,
    recentBlockhash: blockhash,
    instructions: [...cbIxs, ...preIxs, ...withdrawIxs, ...postIxs]
  }).compileToV0Message();

  const tx = new VersionedTransaction(msg);
  const base64 = Buffer.from(tx.serialize()).toString("base64");

  return {
    ok: true,
    user: userPk.toBase58(),
    baseMint: baseMintPk.toBase58(),
    canonicalPool: buildCanonicalPoolInfo({ poolKey, pool, liquidityState }),
    position: {
      lpBalanceRaw: lpBalanceRaw.toString(10),
      lpDecimals
    },
    quote: {
      baseDecimals,
      quoteDecimals,
      lpDecimals,
      lpInRaw: lpInRaw.toString(10),
      estBaseOutRaw: wr.base.toString(10),
      estQuoteOutRaw: wr.quote.toString(10),
      minBaseOutRaw: wr.minBase.toString(10),
      minQuoteOutRaw: wr.minQuote.toString(10)
    },
    tx: {
      version: "v0",
      base64,
      blockhash,
      lastValidBlockHeight
    }
  };
}

export function resolveWithdrawLpInRaw(
  withdrawMode: BuildPumpSwapWithdrawTxRequest["withdrawMode"],
  lpBalanceRaw: BN,
  lpDecimals: number
): { ok: true; lpInRaw: BN } | { ok: false; response: BuildPumpSwapWithdrawTxResponse } {
  const hundredPercentBps = new BN(10000);

  try {
    if (withdrawMode.kind === "lpInRaw") {
      const lpInRaw = new BN(withdrawMode.lpAmountRaw);
      if (lpInRaw.lte(new BN(0))) {
        return { ok: false, response: invalidAmount("LP amount must be greater than zero") };
      }
      if (lpInRaw.gt(lpBalanceRaw)) {
        return { ok: false, response: amountExceedsBalance("LP amount exceeds balance") };
      }
      return { ok: true, lpInRaw };
    }

    if (withdrawMode.kind === "lpInUi") {
      const lpInRaw = parseUiToRaw(withdrawMode.lpAmountUi, lpDecimals);
      if (lpInRaw.gt(lpBalanceRaw)) {
        return { ok: false, response: amountExceedsBalance("LP amount exceeds balance") };
      }
      return { ok: true, lpInRaw };
    }

    if (withdrawMode.kind === "percentBps") {
      if (
        !Number.isInteger(withdrawMode.percentBps) ||
        withdrawMode.percentBps < 1 ||
        withdrawMode.percentBps > 10000
      ) {
        return { ok: false, response: invalidAmount("Percent must be 1-10000 bps") };
      }
      const lpInRaw = lpBalanceRaw
        .mul(new BN(withdrawMode.percentBps))
        .div(hundredPercentBps);
      if (lpInRaw.isZero()) {
        return { ok: false, response: invalidAmount("Percent too small for LP balance") };
      }
      return { ok: true, lpInRaw };
    }

    if (withdrawMode.kind === "all") {
      if (lpBalanceRaw.isZero()) {
        return { ok: false, response: noLpPosition("User has no LP position") };
      }
      return { ok: true, lpInRaw: lpBalanceRaw };
    }
  } catch {
    return { ok: false, response: invalidAmount("Invalid withdraw amount") };
  }

  return { ok: false, response: invalidAmount("Invalid withdraw mode") };
}

function amountExceedsBalance(message: string): BuildPumpSwapWithdrawTxResponse {
  return { ok: false, error: { code: "AMOUNT_EXCEEDS_BALANCE", message } };
}

function noLpPosition(message: string): BuildPumpSwapWithdrawTxResponse {
  return { ok: false, error: { code: "NO_LP_POSITION", message } };
}
