import BN from "bn.js";
import { pumpPoolAuthorityPda } from "@pump-fun/pump-swap-sdk";
import type { FeeConfig, GlobalConfig, Pool } from "@pump-fun/pump-swap-sdk";

export type FeeSelectionResult = {
  lpFeeBps: string;
  protocolFeeBps: string;
  creatorFeeBps: string;
  source: "feeConfigTier" | "feeConfigFlat" | "globalConfig";
};

export function selectFeesBps(
  pool: Pool,
  globalConfig: GlobalConfig,
  feeConfig: FeeConfig | null,
  marketCapLamports: BN
): FeeSelectionResult {
  if (feeConfig) {
    const isPumpPool = pumpPoolAuthorityPda(pool.baseMint).equals(pool.creator);
    if (isPumpPool && feeConfig.feeTiers.length > 0) {
      const tier = selectFeeTier(feeConfig.feeTiers, marketCapLamports);
      return {
        lpFeeBps: tier.fees.lpFeeBps.toString(10),
        protocolFeeBps: tier.fees.protocolFeeBps.toString(10),
        creatorFeeBps: tier.fees.creatorFeeBps.toString(10),
        source: "feeConfigTier"
      };
    }

    return {
      lpFeeBps: feeConfig.flatFees.lpFeeBps.toString(10),
      protocolFeeBps: feeConfig.flatFees.protocolFeeBps.toString(10),
      creatorFeeBps: feeConfig.flatFees.creatorFeeBps.toString(10),
      source: "feeConfigFlat"
    };
  }

  return {
    lpFeeBps: globalConfig.lpFeeBasisPoints.toString(10),
    protocolFeeBps: globalConfig.protocolFeeBasisPoints.toString(10),
    creatorFeeBps: globalConfig.coinCreatorFeeBasisPoints.toString(10),
    source: "globalConfig"
  };
}

export function selectFeeTier(
  tiers: Array<{ marketCapLamportsThreshold: BN; fees: { lpFeeBps: BN; protocolFeeBps: BN; creatorFeeBps: BN } }>,
  marketCapLamports: BN
) {
  if (!tiers.length) {
    return { marketCapLamportsThreshold: new BN(0), fees: { lpFeeBps: new BN(0), protocolFeeBps: new BN(0), creatorFeeBps: new BN(0) } };
  }

  const sorted = [...tiers].sort((a, b) => a.marketCapLamportsThreshold.cmp(b.marketCapLamportsThreshold));

  if (marketCapLamports.lt(sorted[0].marketCapLamportsThreshold)) {
    return sorted[0];
  }

  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (marketCapLamports.gte(sorted[i].marketCapLamportsThreshold)) {
      return sorted[i];
    }
  }

  return sorted[0];
}
