import type { GetRaydiumPoolsByMintOptions } from "../../../raydium/raydiumPoolsService";
import type { PumpSwapPoolSnapshot, PumpSwapPoolNotFound } from "../../types/pumpswap";
import type { RaydiumPoolsByMintResponseDto } from "../../../raydium/dtos";

export type LiquidityProtocol = "raydium" | "pumpswap";

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
}
