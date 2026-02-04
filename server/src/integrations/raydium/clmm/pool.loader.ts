import type { Raydium, ApiV3PoolInfoConcentratedItem, ClmmKeys } from "@raydium-io/raydium-sdk-v2";
import { ClmmError } from "./errors";

export type ClmmPoolContext = {
  poolInfo: ApiV3PoolInfoConcentratedItem;
  poolKeys: ClmmKeys;
  ammConfig: ApiV3PoolInfoConcentratedItem["config"];
};

export async function loadClmmPoolContext(params: {
  raydium: Raydium;
  poolId: string;
}): Promise<ClmmPoolContext> {
  const { raydium, poolId } = params;

  try {
    const [poolInfoList, poolKeysList] = await Promise.all([
      raydium.api.fetchPoolById({ ids: poolId }),
      raydium.api.fetchPoolKeysById({ idList: [poolId] })
    ]);

    const poolInfo = (poolInfoList ?? []).find(
      (pool) => (pool as ApiV3PoolInfoConcentratedItem).type === "Concentrated"
    ) as ApiV3PoolInfoConcentratedItem | undefined;
    const poolKeys = (poolKeysList ?? []).find(
      (keys) => String(keys.id) === poolId
    ) as ClmmKeys | undefined;

    if (poolInfo && poolKeys) {
      return { poolInfo, poolKeys, ammConfig: poolInfo.config };
    }
  } catch {
    // fall back to RPC loader below
  }

  try {
    const rpc = await raydium.clmm.getPoolInfoFromRpc(poolId);
    return {
      poolInfo: rpc.poolInfo,
      poolKeys: rpc.poolKeys,
      ammConfig: rpc.poolInfo.config
    };
  } catch {
    throw new ClmmError("POOL_NOT_FOUND", 404, "CLMM pool not found", { poolId });
  }
}
