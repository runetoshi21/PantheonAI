import { getTransferAmountFeeV2, PositionUtils } from "@raydium-io/raydium-sdk-v2";
import type { ApiV3PoolInfoConcentratedItem, ClmmPositionLayout } from "@raydium-io/raydium-sdk-v2";
import type { EpochInfo } from "@solana/web3.js";
import BN from "bn.js";

export type WithdrawQuote = {
  expectedA: BN;
  expectedB: BN;
};

export function computeWithdrawQuote(params: {
  poolInfo: ApiV3PoolInfoConcentratedItem;
  position: ClmmPositionLayout;
  liquidity: BN;
  epochInfo: EpochInfo;
}): WithdrawQuote {
  const { poolInfo, position, liquidity, epochInfo } = params;
  const { amountA, amountB } = PositionUtils.getAmountsFromLiquidity({
    poolInfo,
    ownerPosition: position,
    liquidity,
    slippage: 0,
    add: false,
    epochInfo
  });

  return {
    expectedA: amountA.amount,
    expectedB: amountB.amount
  };
}

export function applySlippage(params: {
  expectedA: BN;
  expectedB: BN;
  slippageBps: number;
  poolInfo: ApiV3PoolInfoConcentratedItem;
  epochInfo: EpochInfo;
  isHarvest: boolean;
}): { minA: BN; minB: BN } {
  const { expectedA, expectedB, slippageBps, poolInfo, epochInfo, isHarvest } = params;
  if (isHarvest) {
    return { minA: new BN(0), minB: new BN(0) };
  }

  const factor = Math.max(0, 10000 - slippageBps);
  const minA = expectedA.muln(factor).divn(10000);
  const minB = expectedB.muln(factor).divn(10000);

  const feeA = getTransferAmountFeeV2(minA, poolInfo.mintA.extensions?.feeConfig, epochInfo, false).fee ?? new BN(0);
  const feeB = getTransferAmountFeeV2(minB, poolInfo.mintB.extensions?.feeConfig, epochInfo, false).fee ?? new BN(0);

  const adjustedA = minA.sub(feeA);
  const adjustedB = minB.sub(feeB);

  return {
    minA: adjustedA.isNeg() ? new BN(0) : adjustedA,
    minB: adjustedB.isNeg() ? new BN(0) : adjustedB
  };
}
