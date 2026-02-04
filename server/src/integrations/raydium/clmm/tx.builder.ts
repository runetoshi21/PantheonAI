import type { Raydium, ApiV3PoolInfoConcentratedItem, ClmmKeys, MakeTxData } from "@raydium-io/raydium-sdk-v2";
import { InstructionType, TxVersion } from "@raydium-io/raydium-sdk-v2";
import type { ComputeBudgetConfig } from "@raydium-io/raydium-sdk-v2";
import type { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import type BN from "bn.js";
import type { ClmmPositionLayout } from "@raydium-io/raydium-sdk-v2";
import { solanaConfig } from "../../../config/solana";

export function resolveTxVersion(txVersion?: "v0" | "legacy"): TxVersion {
  const version = txVersion ?? solanaConfig.TX_VERSION;
  return version === "legacy" ? TxVersion.LEGACY : TxVersion.V0;
}

export async function buildDecreaseLiquidityTx(params: {
  raydium: Raydium;
  poolInfo: ApiV3PoolInfoConcentratedItem;
  poolKeys: ClmmKeys;
  position: ClmmPositionLayout;
  liquidity: BN;
  amountMinA: BN;
  amountMinB: BN;
  closePosition: boolean;
  computeBudgetConfig?: ComputeBudgetConfig;
  txVersion: TxVersion;
}): Promise<{ tx: MakeTxData<TxVersion>; closeIncluded: boolean }> {
  const { raydium, poolInfo, poolKeys, position, liquidity, amountMinA, amountMinB, closePosition, computeBudgetConfig, txVersion } = params;

  const tx = await raydium.clmm.decreaseLiquidity({
    poolInfo,
    poolKeys,
    ownerPosition: position,
    ownerInfo: {
      useSOLBalance: true,
      closePosition
    },
    liquidity,
    amountMinA,
    amountMinB,
    computeBudgetConfig,
    txVersion
  });

  const closeIncluded = tx.instructionTypes.includes(InstructionType.ClmmClosePosition);
  return { tx, closeIncluded };
}

export async function buildClosePositionTx(params: {
  raydium: Raydium;
  poolInfo: ApiV3PoolInfoConcentratedItem;
  poolKeys: ClmmKeys;
  position: ClmmPositionLayout;
  computeBudgetConfig?: ComputeBudgetConfig;
  txVersion: TxVersion;
}): Promise<MakeTxData<TxVersion>> {
  const { raydium, poolInfo, poolKeys, position, computeBudgetConfig, txVersion } = params;
  return raydium.clmm.closePosition({
    poolInfo,
    poolKeys,
    ownerPosition: position,
    computeBudgetConfig,
    txVersion
  });
}

export async function serializeTx(params: {
  tx: Transaction | VersionedTransaction;
  connection: Connection;
  txVersion: TxVersion;
}): Promise<string> {
  const { tx, connection, txVersion } = params;

  if (txVersion === TxVersion.LEGACY) {
    const latest = await connection.getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;
    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    return Buffer.from(serialized).toString("base64");
  }

  const serialized = tx.serialize();
  return Buffer.from(serialized).toString("base64");
}
