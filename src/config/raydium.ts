import { z } from "zod";

const schema = z.object({
  SOLANA_RPC_URL: z.string().min(1, "SOLANA_RPC_URL is required"),
  RAYDIUM_CLUSTER: z.enum(["mainnet", "devnet"]).default("mainnet"),
  RAYDIUM_API_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  RAYDIUM_API_BASE_HOST: z.string().optional(),
  RAYDIUM_POOLS_CACHE_TTL_MS: z.coerce.number().int().positive().default(15000),
  RAYDIUM_POOL_KEYS_CACHE_TTL_MS: z.coerce.number().int().positive().default(3600000),
  RAYDIUM_MAX_PAGES: z.coerce.number().int().positive().default(5)
});

const parsed = schema.safeParse({
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
  RAYDIUM_CLUSTER: process.env.RAYDIUM_CLUSTER,
  RAYDIUM_API_TIMEOUT_MS: process.env.RAYDIUM_API_TIMEOUT_MS,
  RAYDIUM_API_BASE_HOST: process.env.RAYDIUM_API_BASE_HOST,
  RAYDIUM_POOLS_CACHE_TTL_MS: process.env.RAYDIUM_POOLS_CACHE_TTL_MS,
  RAYDIUM_POOL_KEYS_CACHE_TTL_MS: process.env.RAYDIUM_POOL_KEYS_CACHE_TTL_MS,
  RAYDIUM_MAX_PAGES: process.env.RAYDIUM_MAX_PAGES
});

if (!parsed.success) {
  const message = parsed.error.errors.map((e) => e.message).join(", ");
  throw new Error(`Invalid Raydium config: ${message}`);
}

const env = parsed.data;

const baseHost = env.RAYDIUM_API_BASE_HOST?.trim() || undefined;

export const raydiumConfig = {
  SOLANA_RPC_URL: env.SOLANA_RPC_URL,
  RAYDIUM_CLUSTER: env.RAYDIUM_CLUSTER,
  RAYDIUM_API_TIMEOUT_MS: env.RAYDIUM_API_TIMEOUT_MS,
  RAYDIUM_API_BASE_HOST: baseHost,
  RAYDIUM_POOLS_CACHE_TTL_MS: env.RAYDIUM_POOLS_CACHE_TTL_MS,
  RAYDIUM_POOL_KEYS_CACHE_TTL_MS: env.RAYDIUM_POOL_KEYS_CACHE_TTL_MS,
  RAYDIUM_MAX_PAGES: env.RAYDIUM_MAX_PAGES
};
