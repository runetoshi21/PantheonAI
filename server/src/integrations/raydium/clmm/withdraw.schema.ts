import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

const publicKeySchema = z.string().refine((value) => {
  try {
    const key = new PublicKey(value);
    return Boolean(key);
  } catch {
    return false;
  }
}, "Invalid public key");

const prioritySchema = z
  .object({
    computeUnitLimit: z.number().int().min(200000).max(1000000).optional(),
    computeUnitPriceMicroLamports: z.number().int().min(0).max(500000).optional()
  })
  .optional();

const signingSchema = z
  .object({
    mode: z.enum(["client", "server"]).default("client")
  })
  .optional();

export const withdrawSchema = z
  .object({
    owner: publicKeySchema,
    positionNftMint: publicKeySchema,
    mode: z.enum(["harvest", "decrease", "close"]),
    decrease: z
      .object({
        liquidityBps: z.number().int().min(1).max(10000)
      })
      .optional(),
    slippageBps: z.number().int().min(0).max(5000).default(50),
    txVersion: z.enum(["v0", "legacy"]).optional(),
    priority: prioritySchema,
    signing: signingSchema
  })
  .superRefine((value, ctx) => {
    if (value.mode === "decrease" && !value.decrease?.liquidityBps) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decrease", "liquidityBps"],
        message: "decrease.liquidityBps is required when mode=decrease"
      });
    }
  });

export const withdrawQuoteSchema = z.object({
  owner: publicKeySchema,
  liquidityBps: z.number().int().min(1).max(10000),
  slippageBps: z.number().int().min(0).max(5000).default(50)
});
