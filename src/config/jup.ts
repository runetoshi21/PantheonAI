import { z } from "zod";

const schema = z.object({
  JUP_API_KEY: z.string().optional(),
  JUP_PRICE_CACHE_TTL_MS: z.coerce.number().int().positive().default(30000)
});

const parsed = schema.safeParse({
  JUP_API_KEY: process.env.JUP_API_KEY,
  JUP_PRICE_CACHE_TTL_MS: process.env.JUP_PRICE_CACHE_TTL_MS
});

if (!parsed.success) {
  const message = parsed.error.errors.map((e) => e.message).join(", ");
  throw new Error(`Invalid JUP config: ${message}`);
}

export const jupConfig = parsed.data;
