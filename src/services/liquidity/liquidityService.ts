import { PublicKey } from "@solana/web3.js";
import { BadRequestError } from "../../core/errors";
import { resolveProviders } from "./providers";
import type { LiquidityOverviewOptions, LiquidityOverviewResponse } from "./types";

export async function getLiquidityOverviewByMint(
  mint: string,
  options: LiquidityOverviewOptions
): Promise<LiquidityOverviewResponse> {
  try {
    new PublicKey(mint);
  } catch {
    throw new BadRequestError(`Invalid mint: ${mint}`);
  }

  const providers = resolveProviders(options.protocols);
  const results = await Promise.all(
    providers.map((provider) => provider.fetch(mint, options))
  );

  return {
    inputMint: mint,
    fetchedAtUnixMs: Date.now(),
    results
  };
}
