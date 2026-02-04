import { BadRequestError } from "../../core/errors";
import { availableProtocols } from "./providers";
import type { LiquidityProtocol } from "./types";

export function parseProtocols(value?: string): LiquidityProtocol[] | undefined {
  if (!value) return undefined;
  const raw = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (!raw.length) return undefined;

  for (const protocol of raw) {
    if (!availableProtocols.includes(protocol as LiquidityProtocol)) {
      throw new BadRequestError(`Unknown protocol: ${protocol}`);
    }
  }

  return raw as LiquidityProtocol[];
}
