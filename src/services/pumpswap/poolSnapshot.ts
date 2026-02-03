import BN from "bn.js";
import {
  canonicalPumpPoolPda,
  GLOBAL_CONFIG_PDA,
  PUMP_AMM_FEE_CONFIG_PDA,
  PUMP_AMM_SDK
} from "@pump-fun/pump-swap-sdk";
import { AccountLayout, MintLayout, NATIVE_MINT } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { LRUCache } from "lru-cache";
import { getSolanaConnection } from "../../solana/connection";
import { BadRequestError } from "../../core/errors";
import type { PumpSwapPoolSnapshot, PumpSwapPoolNotFound } from "../../types/pumpswap";
import { divDecimalStrings, formatUnits } from "./bnFormat";
import { selectFeesBps } from "./fees";

const snapshotCache = new LRUCache<string, PumpSwapPoolSnapshot | PumpSwapPoolNotFound>({
  max: 500,
  ttl: 3000
});

const globalConfigCache = new LRUCache<string, ReturnType<typeof PUMP_AMM_SDK.decodeGlobalConfig>>({
  max: 1,
  ttl: 60000
});

const feeConfigCache = new LRUCache<string, ReturnType<typeof PUMP_AMM_SDK.decodeFeeConfig> | null>({
  max: 1,
  ttl: 60000
});

export async function getCanonicalPumpSwapPoolSnapshot(
  mint: string,
  includeConfigs: boolean
): Promise<PumpSwapPoolSnapshot | PumpSwapPoolNotFound> {
  let baseMint: PublicKey;
  try {
    baseMint = new PublicKey(mint);
  } catch {
    throw new BadRequestError(`Invalid mint: ${mint}`);
  }

  const cached = snapshotCache.get(mint);
  if (cached) {
    return includeConfigs ? cached : stripConfigs(cached);
  }

  const poolKey = canonicalPumpPoolPda(baseMint);
  const derivedPoolKey = poolKey.toBase58();
  const connection = getSolanaConnection();

  const [globalCfgAI, feeCfgAI, poolAI] = await connection.getMultipleAccountsInfo([
    GLOBAL_CONFIG_PDA,
    PUMP_AMM_FEE_CONFIG_PDA,
    poolKey
  ]);

  if (!poolAI) {
    const notFound: PumpSwapPoolNotFound = {
      found: false,
      inputMint: baseMint.toBase58(),
      derivedCanonicalPoolKey: derivedPoolKey,
      reason: "POOL_ACCOUNT_NOT_FOUND"
    };
    snapshotCache.set(mint, notFound);
    return notFound;
  }

  if (!globalCfgAI) {
    throw new Error("GLOBAL_CONFIG_PDA account not found");
  }

  const globalConfig = decodeGlobalConfig(globalCfgAI);
  const feeConfig = decodeFeeConfig(feeCfgAI);
  const pool = PUMP_AMM_SDK.decodePool(poolAI);

  const [baseMintAI, quoteMintAI, baseVaultAI, quoteVaultAI] =
    await connection.getMultipleAccountsInfo([
      pool.baseMint,
      pool.quoteMint,
      pool.poolBaseTokenAccount,
      pool.poolQuoteTokenAccount
    ]);

  if (!baseMintAI || !quoteMintAI || !baseVaultAI || !quoteVaultAI) {
    throw new Error("Pool accounts are missing");
  }

  const baseTokenProgram = baseMintAI.owner.toBase58();
  const quoteTokenProgram = quoteMintAI.owner.toBase58();

  const decodedBaseMint = MintLayout.decode(baseMintAI.data);
  const baseDecimals = decodedBaseMint.decimals;
  const baseSupplyRaw = new BN(decodedBaseMint.supply.toString());

  const quoteDecimals = pool.quoteMint.equals(NATIVE_MINT)
    ? 9
    : MintLayout.decode(quoteMintAI.data).decimals;

  const decodedBaseVault = AccountLayout.decode(baseVaultAI.data);
  const decodedQuoteVault = AccountLayout.decode(quoteVaultAI.data);

  const baseReserveRaw = new BN(decodedBaseVault.amount.toString());
  const quoteReserveRaw = new BN(decodedQuoteVault.amount.toString());

  const baseUi = formatUnits(baseReserveRaw, baseDecimals);
  const quoteUi = formatUnits(quoteReserveRaw, quoteDecimals);
  const spotPrice = baseReserveRaw.isZero()
    ? "0"
    : divDecimalStrings(quoteUi, baseUi, 12);

  const marketCapLamports = baseReserveRaw.isZero()
    ? new BN(0)
    : quoteReserveRaw.mul(baseSupplyRaw).div(baseReserveRaw);

  const feesBps = selectFeesBps(pool, globalConfig, feeConfig, marketCapLamports);

  const snapshot: PumpSwapPoolSnapshot = {
    found: true,
    inputMint: baseMint.toBase58(),
    canonicalPool: {
      poolKey: derivedPoolKey,
      baseMint: pool.baseMint.toBase58(),
      quoteMint: pool.quoteMint.toBase58(),
      index: pool.index,
      creator: pool.creator.toBase58(),
      lpMint: pool.lpMint.toBase58(),
      poolBaseVault: pool.poolBaseTokenAccount.toBase58(),
      poolQuoteVault: pool.poolQuoteTokenAccount.toBase58(),
      coinCreator: pool.coinCreator.toBase58(),
      isMayhemMode: pool.isMayhemMode
    },
    tokenPrograms: {
      baseTokenProgram,
      quoteTokenProgram
    },
    reserves: {
      base: {
        amountRaw: baseReserveRaw.toString(10),
        decimals: baseDecimals,
        amountUi: baseUi
      },
      quote: {
        amountRaw: quoteReserveRaw.toString(10),
        decimals: quoteDecimals,
        amountUi: quoteUi
      }
    },
    baseMintSupply: {
      supplyRaw: baseSupplyRaw.toString(10),
      decimals: baseDecimals,
      supplyUi: formatUnits(baseSupplyRaw, baseDecimals)
    },
    spotPrice: {
      quotePerBase: spotPrice
    },
    marketCap: {
      quoteLamports: marketCapLamports.toString(10),
      quoteSol: formatUnits(marketCapLamports, 9)
    },
    feesBps,
    configs: includeConfigs
      ? {
          globalConfig: {
            lpFeeBasisPoints: globalConfig.lpFeeBasisPoints.toString(10),
            protocolFeeBasisPoints: globalConfig.protocolFeeBasisPoints.toString(10),
            coinCreatorFeeBasisPoints: globalConfig.coinCreatorFeeBasisPoints.toString(10),
            disableFlags: globalConfig.disableFlags
          },
          feeConfig: feeConfig
            ? {
                flatFees: {
                  lpFeeBps: feeConfig.flatFees.lpFeeBps.toString(10),
                  protocolFeeBps: feeConfig.flatFees.protocolFeeBps.toString(10),
                  creatorFeeBps: feeConfig.flatFees.creatorFeeBps.toString(10)
                },
                feeTiers: feeConfig.feeTiers.map((tier) => ({
                  marketCapLamportsThreshold: tier.marketCapLamportsThreshold.toString(10),
                  fees: {
                    lpFeeBps: tier.fees.lpFeeBps.toString(10),
                    protocolFeeBps: tier.fees.protocolFeeBps.toString(10),
                    creatorFeeBps: tier.fees.creatorFeeBps.toString(10)
                  }
                }))
              }
            : null
        }
      : undefined
  };

  snapshotCache.set(mint, snapshot);
  return includeConfigs ? snapshot : stripConfigs(snapshot);
}

function decodeGlobalConfig(accountInfo: Parameters<typeof PUMP_AMM_SDK.decodeGlobalConfig>[0]) {
  const cached = globalConfigCache.get("global");
  if (cached) return cached;
  const decoded = PUMP_AMM_SDK.decodeGlobalConfig(accountInfo);
  globalConfigCache.set("global", decoded);
  return decoded;
}

function decodeFeeConfig(accountInfo: Parameters<typeof PUMP_AMM_SDK.decodeFeeConfig>[0] | null) {
  if (!accountInfo) return null;
  const cached = feeConfigCache.get("fee");
  if (cached) return cached;
  const decoded = PUMP_AMM_SDK.decodeFeeConfig(accountInfo);
  feeConfigCache.set("fee", decoded);
  return decoded;
}

function stripConfigs(
  snapshot: PumpSwapPoolSnapshot | PumpSwapPoolNotFound
): PumpSwapPoolSnapshot | PumpSwapPoolNotFound {
  if (!snapshot.found) return snapshot;
  const { configs: _configs, ...rest } = snapshot;
  return rest as PumpSwapPoolSnapshot;
}
