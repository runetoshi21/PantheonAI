import { z } from "zod";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

const schema = z.object({
  SOLANA_CLUSTER: z.enum(["mainnet-beta", "devnet"]).default("mainnet-beta"),
  SOLANA_RPC_URL: z.string().min(1, "SOLANA_RPC_URL is required"),
  RAYDIUM_API_BASE_URL: z.string().min(1, "RAYDIUM_API_BASE_URL is required"),
  SERVER_PAYER_SECRET_KEY: z.string().optional(),
  TX_VERSION: z.enum(["v0", "legacy"]).default("v0")
});

const parsed = schema.safeParse({
  SOLANA_CLUSTER: process.env.SOLANA_CLUSTER,
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
  RAYDIUM_API_BASE_URL: process.env.RAYDIUM_API_BASE_URL,
  SERVER_PAYER_SECRET_KEY: process.env.SERVER_PAYER_SECRET_KEY,
  TX_VERSION: process.env.TX_VERSION
});

if (!parsed.success) {
  const message = parsed.error.errors.map((e) => e.message).join(", ");
  throw new Error(`Invalid Solana config: ${message}`);
}

export const solanaConfig = parsed.data;

export function loadServerPayer(): Keypair | null {
  const secret = solanaConfig.SERVER_PAYER_SECRET_KEY;
  if (!secret) return null;

  try {
    if (secret.trim().startsWith("[")) {
      const bytes = Uint8Array.from(JSON.parse(secret) as number[]);
      return Keypair.fromSecretKey(bytes);
    }
    const decoded = bs58.decode(secret.trim());
    return Keypair.fromSecretKey(decoded);
  } catch {
    throw new Error("SERVER_PAYER_SECRET_KEY is invalid");
  }
}
