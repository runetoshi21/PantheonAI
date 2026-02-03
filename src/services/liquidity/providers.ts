import { getCanonicalPumpSwapPoolSnapshot } from "../../../pumpswap/poolSnapshot";
import { getRaydiumPoolsByMint } from "../../../raydium/raydiumPoolsService";
import type {
  LiquidityOverviewOptions,
  LiquidityProtocol,
  LiquidityProtocolResult
} from "./types";

export interface LiquidityProvider {
  id: LiquidityProtocol;
  fetch: (mint: string, opts: LiquidityOverviewOptions) => Promise<LiquidityProtocolResult>;
}

export const raydiumProvider: LiquidityProvider = {
  id: "raydium",
  fetch: async (mint, opts) => {
    try {
      const data = await getRaydiumPoolsByMint(mint, opts.raydium ?? {});
      return { protocol: "raydium", ok: true, data };
    } catch (err) {
      return { protocol: "raydium", ok: false, error: formatError(err) };
    }
  }
};

export const pumpswapProvider: LiquidityProvider = {
  id: "pumpswap",
  fetch: async (mint, opts) => {
    try {
      const data = await getCanonicalPumpSwapPoolSnapshot(
        mint,
        opts.pumpswap?.includeConfigs ?? false
      );
      return { protocol: "pumpswap", ok: true, data };
    } catch (err) {
      return { protocol: "pumpswap", ok: false, error: formatError(err) };
    }
  }
};

const providerMap: Record<LiquidityProtocol, LiquidityProvider> = {
  raydium: raydiumProvider,
  pumpswap: pumpswapProvider
};

export function resolveProviders(protocols?: LiquidityProtocol[]): LiquidityProvider[] {
  if (!protocols || protocols.length === 0) {
    return Object.values(providerMap);
  }

  return protocols.map((protocol) => providerMap[protocol]);
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
