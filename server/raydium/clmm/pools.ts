import { PoolFetchType } from "@raydium-io/raydium-sdk-v2";
import { PublicKey } from "@solana/web3.js";
import { getRaydiumReadonly } from "../raydiumClient";

export type ExistingClmmPool = {
  id: string;
  mintA: string;
  mintB: string;
  configId?: string;
};

export async function findExistingClmmPool(params: {
  mintA: PublicKey;
  mintB: PublicKey;
  configId: string;
}): Promise<ExistingClmmPool | null> {
  const raydium = await getRaydiumReadonly();
  const result = await raydium.api.fetchPoolByMints({
    mint1: params.mintA,
    mint2: params.mintB,
    type: PoolFetchType.Concentrated,
    order: "desc",
    page: 1
  });

  const pools = (result.data ?? []) as Array<Record<string, any>>;
  const match = pools.find((pool) => {
    const config = pool.config as { id?: string } | undefined;
    return pool.type === "Concentrated" && config?.id === params.configId;
  });

  if (!match) return null;

  return {
    id: String(match.id ?? ""),
    mintA: String(match.mintA?.address ?? ""),
    mintB: String(match.mintB?.address ?? ""),
    configId: match.config?.id
  };
}
