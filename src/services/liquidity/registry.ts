import { BadRequestError } from "../../core/errors";
import type { LiquidityProtocol } from "./types";

const allowedProtocols: LiquidityProtocol[] = ["raydium", "pumpswap", "meteora"];

export function parseProtocols(value?: string): LiquidityProtocol[] | undefined {
  if (!value) return undefined;
  const raw = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (!raw.length) return undefined;

  for (const protocol of raw) {
    if (!allowedProtocols.includes(protocol as LiquidityProtocol)) {
      throw new BadRequestError(`Unknown protocol: ${protocol}`);
    }
  }

  return raw as LiquidityProtocol[];
}
