import type { Protocol } from "./types";

export const protocolMeta: Record<Protocol, { label: string; accent: string }> = {
  raydium: { label: "Raydium", accent: "#2be3a1" },
  meteora: { label: "Meteora", accent: "#f5b73a" },
  pumpswap: { label: "PumpSwap", accent: "#f05d5d" },
};

export const defaultProtocols: Record<Protocol, boolean> = {
  raydium: true,
  meteora: true,
  pumpswap: true,
};
