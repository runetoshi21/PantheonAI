import { LRUCache } from "lru-cache";
import { PublicKey } from "@solana/web3.js";
import { getRaydiumConnection } from "../raydiumClient";

export type MintInfo = {
  mint: string;
  decimals: number;
  programId: string;
};

const cache = new LRUCache<string, MintInfo>({ max: 2000, ttl: 10 * 60 * 1000 });

export async function getMintInfo(mint: PublicKey): Promise<MintInfo> {
  const key = mint.toBase58();
  const cached = cache.get(key);
  if (cached) return cached;

  const connection = getRaydiumConnection();
  const info = await connection.getParsedAccountInfo(mint);
  if (!info.value) {
    throw new Error(`Mint account not found: ${key}`);
  }

  const parsed = info.value.data as any;
  const decimals = parsed?.parsed?.info?.decimals;
  const programId = info.value.owner?.toBase58?.() ?? String(info.value.owner);

  if (typeof decimals !== "number") {
    throw new Error(`Unable to parse mint decimals for ${key}`);
  }

  const mintInfo = { mint: key, decimals, programId };
  cache.set(key, mintInfo);
  return mintInfo;
}
