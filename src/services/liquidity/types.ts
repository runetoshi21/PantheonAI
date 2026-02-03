import type { GetRaydiumPoolsByMintOptions } from "../../../raydium/raydiumPoolsService";
import type { PumpSwapPoolSnapshot, PumpSwapPoolNotFound } from "../../types/pumpswap";
import type { RaydiumPoolsByMintResponseDto } from "../../../raydium/dtos";
import type { GetPoolsByMintResult } from "../../../meteora/types";
import type { MeteoraCluster } from "../../../meteora/config";

export type LiquidityProtocol = "raydium" | "pumpswap" | "meteora";

export type LiquidityProtocolResult =
  | {
      protocol: "raydium";
      ok: true;
      data: RaydiumPoolsByMintResponseDto;
    }
  | {
      protocol: "raydium";
      ok: false;
      error: string;
    }
  | {
      protocol: "pumpswap";
      ok: true;
      data: PumpSwapPoolSnapshot | PumpSwapPoolNotFound;
    }
  | {
      protocol: "pumpswap";
      ok: false;
      error: string;
    }
  | {
      protocol: "meteora";
      ok: true;
      data: GetPoolsByMintResult;
    }
  | {
      protocol: "meteora";
      ok: false;
      error: string;
    };

export interface LiquidityOverviewResponse {
  inputMint: string;
  fetchedAtUnixMs: number;
  results: LiquidityProtocolResult[];
}

export interface LiquidityOverviewOptions {
  protocols?: LiquidityProtocol[];
  raydium?: GetRaydiumPoolsByMintOptions;
  pumpswap?: {
    includeConfigs?: boolean;
  };
  meteora?: {
    cluster?: MeteoraCluster;
    includeUnknown?: boolean;
    includeVesting?: boolean;
    includeDlmmLocks?: boolean;
    minTvlUsd?: number;
    limitPerProtocol?: number;
    timeoutMs?: number;
  };
}
