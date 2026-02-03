import { describe, expect, it } from "vitest";
import { applyLimitPerProtocol, sortPools } from "../../meteora";
import type { NormalizedPool } from "../../meteora/types";

const pool = (protocol: NormalizedPool["protocol"], tvl: number, volume: number, address: string): NormalizedPool => ({
  protocol,
  poolAddress: address,
  poolName: null,
  tokens: [],
  metrics: {
    tvlUsd: tvl,
    volume24hUsd: volume,
    fees24hUsd: null,
    apr24h: null,
    apy24h: null
  },
  liquidity: { reserves: [] },
  setup: {
    fee: { baseFee: null, maxFee: null, protocolFee: null },
    binStep: null,
    currentPrice: null,
    tags: []
  },
  locks: {},
  raw: { dlmm: {}, dammV2: {}, dammV1: {} }
});

describe("meteora sorting and limits", () => {
  it("sorts by tvl then volume", () => {
    const pools = [
      pool("DLMM", 10, 5, "b"),
      pool("DLMM", 20, 1, "a"),
      pool("DLMM", 20, 10, "c")
    ];

    const sorted = sortPools(pools);
    expect(sorted[0].poolAddress).toBe("c");
    expect(sorted[1].poolAddress).toBe("a");
    expect(sorted[2].poolAddress).toBe("b");
  });

  it("applies limit per protocol", () => {
    const pools = [
      pool("DLMM", 10, 0, "a"),
      pool("DLMM", 9, 0, "b"),
      pool("DAMM_V2", 8, 0, "c"),
      pool("DAMM_V2", 7, 0, "d")
    ];

    const limited = applyLimitPerProtocol(pools, 1);
    expect(limited.filter((p) => p.protocol === "DLMM").length).toBe(1);
    expect(limited.filter((p) => p.protocol === "DAMM_V2").length).toBe(1);
  });
});
