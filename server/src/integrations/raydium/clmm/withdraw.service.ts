import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import type { ComputeBudgetConfig, MakeTxData, Raydium } from "@raydium-io/raydium-sdk-v2";
import { getRaydiumConnection, getRaydiumReadonly, getRaydiumWithOwner, getRaydiumWithSigner } from "../raydiumClient";
import { loadServerPayer } from "../../../config/solana";
import { ClmmError } from "./errors";
import { loadPositionByNftMint } from "./position.loader";
import { loadClmmPoolContext } from "./pool.loader";
import { applySlippage, computeWithdrawQuote } from "./slippage";
import { buildClosePositionTx, buildDecreaseLiquidityTx, resolveTxVersion, serializeTx } from "./tx.builder";
import type { WithdrawQuoteResponse, WithdrawRequest, WithdrawResponse, WithdrawTransaction } from "./withdraw.dto";

const DEFAULT_SLIPPAGE_BPS = 50;

export async function prepareWithdraw(request: WithdrawRequest): Promise<WithdrawResponse> {
  const owner = new PublicKey(request.owner);
  const positionNftMint = new PublicKey(request.positionNftMint);
  const slippageBps = request.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const signingMode = request.signing?.mode ?? "client";
  const txVersion = resolveTxVersion(request.txVersion);
  const computeBudgetConfig = toComputeBudgetConfig(request.priority);

  const connection = getRaydiumConnection();
  const position = await loadPositionByNftMint({ connection, owner, positionNftMint });

  const raydium = await resolveRaydium(signingMode, owner);
  const poolContext = await loadClmmPoolContext({ raydium, poolId: position.poolId.toBase58() });

  const liquidityCurrent = position.liquidity;
  const liquidityToRemove = computeLiquidityToRemove({
    mode: request.mode,
    liquidityBps: request.decrease?.liquidityBps,
    liquidityCurrent
  });

  const liquidityBn = new BN(liquidityToRemove.toString());
  const isHarvest = liquidityToRemove === 0n;

  const epochInfo = await raydium.fetchEpochInfo();
  const { expectedA, expectedB } = computeWithdrawQuote({
    poolInfo: poolContext.poolInfo,
    position: position.position,
    liquidity: liquidityBn,
    epochInfo
  });
  const { minA, minB } = applySlippage({
    expectedA,
    expectedB,
    slippageBps,
    poolInfo: poolContext.poolInfo,
    epochInfo,
    isHarvest
  });

  const transactions = await buildWithdrawTransactions({
    raydium,
    mode: request.mode,
    position,
    poolContext,
    liquidityToRemove: liquidityBn,
    minA,
    minB,
    computeBudgetConfig,
    txVersion
  });

  if (signingMode === "server") {
    const signed = await executeTransactions(transactions);
    return buildResponse({
      owner: owner.toBase58(),
      positionNftMint: positionNftMint.toBase58(),
      mode: request.mode,
      poolId: position.poolId.toBase58(),
      positionAddress: position.positionAddress.toBase58(),
      liquidityCurrent,
      liquidityToRemove,
      expectedA,
      expectedB,
      minA,
      minB,
      transactions: signed
    });
  }

  const unsigned = await Promise.all(
    transactions.map(async (tx) => ({
      base64: await serializeTx({
        tx: tx.transaction,
        connection,
        txVersion
      }),
      signersRequired: ["owner"]
    }))
  );

  return buildResponse({
    owner: owner.toBase58(),
    positionNftMint: positionNftMint.toBase58(),
    mode: request.mode,
    poolId: position.poolId.toBase58(),
    positionAddress: position.positionAddress.toBase58(),
    liquidityCurrent,
    liquidityToRemove,
    expectedA,
    expectedB,
    minA,
    minB,
    transactions: unsigned
  });
}

export async function getWithdrawQuote(params: {
  owner: string;
  positionNftMint: string;
  liquidityBps: number;
  slippageBps?: number;
}): Promise<WithdrawQuoteResponse> {
  const owner = new PublicKey(params.owner);
  const positionNftMint = new PublicKey(params.positionNftMint);
  const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

  const connection = getRaydiumConnection();
  const position = await loadPositionByNftMint({ connection, owner, positionNftMint });
  const raydium = await getRaydiumReadonly();
  const poolContext = await loadClmmPoolContext({ raydium, poolId: position.poolId.toBase58() });

  const liquidityCurrent = position.liquidity;
  const liquidityToRemove = (liquidityCurrent * BigInt(params.liquidityBps)) / 10000n;
  const liquidityBn = new BN(liquidityToRemove.toString());
  const isHarvest = liquidityToRemove === 0n;

  const epochInfo = await raydium.fetchEpochInfo();
  const { expectedA, expectedB } = computeWithdrawQuote({
    poolInfo: poolContext.poolInfo,
    position: position.position,
    liquidity: liquidityBn,
    epochInfo
  });
  const { minA, minB } = applySlippage({
    expectedA,
    expectedB,
    slippageBps,
    poolInfo: poolContext.poolInfo,
    epochInfo,
    isHarvest
  });

  return {
    owner: owner.toBase58(),
    positionNftMint: positionNftMint.toBase58(),
    poolId: position.poolId.toBase58(),
    positionAddress: position.positionAddress.toBase58(),
    liquidity: {
      current: liquidityCurrent.toString(),
      toRemove: liquidityToRemove.toString()
    },
    expected: {
      amountA: expectedA.toString(),
      amountB: expectedB.toString()
    },
    minOut: {
      amountA: minA.toString(),
      amountB: minB.toString()
    }
  };
}

function computeLiquidityToRemove(params: {
  mode: WithdrawRequest["mode"];
  liquidityBps?: number;
  liquidityCurrent: bigint;
}): bigint {
  const { mode, liquidityBps, liquidityCurrent } = params;
  if (mode === "harvest") return 0n;
  if (mode === "close") return liquidityCurrent;
  if (!liquidityBps) return 0n;
  return (liquidityCurrent * BigInt(liquidityBps)) / 10000n;
}

function toComputeBudgetConfig(
  priority?: WithdrawRequest["priority"]
): ComputeBudgetConfig | undefined {
  if (!priority) return undefined;
  const config: ComputeBudgetConfig = {};
  if (priority.computeUnitLimit != null) config.units = priority.computeUnitLimit;
  if (priority.computeUnitPriceMicroLamports != null) config.microLamports = priority.computeUnitPriceMicroLamports;
  return Object.keys(config).length ? config : undefined;
}

async function resolveRaydium(mode: "client" | "server", owner: PublicKey): Promise<Raydium> {
  if (mode === "server") {
    const payer = loadServerPayer();
    if (!payer) {
      throw new ClmmError("TX_BUILD_FAILED", 500, "Server signing is not configured");
    }
    if (!payer.publicKey.equals(owner)) {
      throw new ClmmError("INVALID_INPUT", 400, "Server signing is only allowed for the server payer", {
        owner: owner.toBase58(),
        serverPayer: payer.publicKey.toBase58()
      });
    }
    return getRaydiumWithSigner(payer);
  }

  return getRaydiumWithOwner(owner);
}

async function buildWithdrawTransactions(params: {
  raydium: Raydium;
  mode: WithdrawRequest["mode"];
  position: Awaited<ReturnType<typeof loadPositionByNftMint>>;
  poolContext: Awaited<ReturnType<typeof loadClmmPoolContext>>;
  liquidityToRemove: BN;
  minA: BN;
  minB: BN;
  computeBudgetConfig?: ComputeBudgetConfig;
  txVersion: ReturnType<typeof resolveTxVersion>;
}): Promise<MakeTxData[]> {
  const { raydium, mode, position, poolContext, liquidityToRemove, minA, minB, computeBudgetConfig, txVersion } = params;

  try {
    if (mode === "close" && position.liquidity === 0n) {
      const decrease = await buildDecreaseLiquidityTx({
        raydium,
        poolInfo: poolContext.poolInfo,
        poolKeys: poolContext.poolKeys,
        position: position.position,
        liquidity: new BN(0),
        amountMinA: new BN(0),
        amountMinB: new BN(0),
        closePosition: false,
        computeBudgetConfig,
        txVersion
      });
      const close = await buildClosePositionTx({
        raydium,
        poolInfo: poolContext.poolInfo,
        poolKeys: poolContext.poolKeys,
        position: position.position,
        computeBudgetConfig,
        txVersion
      });
      return [decrease.tx, close];
    }

    const closePosition =
      mode === "close" && position.liquidity === BigInt(liquidityToRemove.toString()) && position.liquidity > 0n;

    const decrease = await buildDecreaseLiquidityTx({
      raydium,
      poolInfo: poolContext.poolInfo,
      poolKeys: poolContext.poolKeys,
      position: position.position,
      liquidity: liquidityToRemove,
      amountMinA: minA,
      amountMinB: minB,
      closePosition,
      computeBudgetConfig,
      txVersion
    });

    const txs: MakeTxData[] = [decrease.tx];

    if (closePosition && !decrease.closeIncluded) {
      const close = await buildClosePositionTx({
        raydium,
        poolInfo: poolContext.poolInfo,
        poolKeys: poolContext.poolKeys,
        position: position.position,
        computeBudgetConfig,
        txVersion
      });
      txs.push(close);
    }

    return txs;
  } catch (error) {
    if (error instanceof ClmmError) throw error;
    throw new ClmmError("TX_BUILD_FAILED", 500, "Failed to build CLMM withdraw transaction", {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function executeTransactions(transactions: MakeTxData[]): Promise<WithdrawTransaction[]> {
  const results: WithdrawTransaction[] = [];

  for (const tx of transactions) {
    try {
      const { txId, signedTx } = await tx.execute({ sendAndConfirm: true, skipPreflight: false });
      results.push({
        signature: txId,
        base64: Buffer.from(signedTx.serialize()).toString("base64"),
        signersRequired: []
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      const logs = (error as { logs?: string[]; simulationResponse?: { logs?: string[] } })?.logs
        ?? (error as { simulationResponse?: { logs?: string[] } })?.simulationResponse?.logs;
      if (logs) {
        throw new ClmmError("TX_SIMULATION_FAILED", 400, "Transaction simulation failed", { logs, details });
      }
      throw new ClmmError("TX_SEND_FAILED", 502, "Transaction send failed", { details });
    }
  }

  return results;
}

function buildResponse(params: {
  owner: string;
  positionNftMint: string;
  mode: WithdrawRequest["mode"];
  poolId: string;
  positionAddress: string;
  liquidityCurrent: bigint;
  liquidityToRemove: bigint;
  expectedA: BN;
  expectedB: BN;
  minA: BN;
  minB: BN;
  transactions: WithdrawTransaction[];
}): WithdrawResponse {
  const {
    owner,
    positionNftMint,
    mode,
    poolId,
    positionAddress,
    liquidityCurrent,
    liquidityToRemove,
    expectedA,
    expectedB,
    minA,
    minB,
    transactions
  } = params;

  return {
    owner,
    positionNftMint,
    mode,
    poolId,
    positionAddress,
    liquidity: {
      current: liquidityCurrent.toString(),
      toRemove: liquidityToRemove.toString()
    },
    expected: {
      amountA: expectedA.toString(),
      amountB: expectedB.toString()
    },
    minOut: {
      amountA: minA.toString(),
      amountB: minB.toString()
    },
    transactions
  };
}
