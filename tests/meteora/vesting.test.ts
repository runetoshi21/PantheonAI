import { afterEach, describe, expect, it, vi } from "vitest";
import { attachVesting } from "../../meteora/dammV2";
import { createLimiter } from "../../meteora/http";
import type { NormalizedPool } from "../../meteora/types";

const pool = (address: string): NormalizedPool => ({
  protocol: "DAMM_V2",
  poolAddress: address,
  poolName: null,
  tokens: [],
  metrics: { tvlUsd: null, volume24hUsd: null, fees24hUsd: null, apr24h: null, apy24h: null },
  liquidity: { reserves: [] },
  setup: { fee: { baseFee: null, maxFee: null, protocolFee: null }, binStep: null, currentPrice: null, tags: [] },
  locks: {},
  raw: { dlmm: {}, dammV2: {}, dammV1: {} }
});

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("meteora vesting enrichment", () => {
  it("attaches vesting data when requested", async () => {
    const mockResponse = {
      total_locked_liquidity_string: "100",
      total_released_liquidity_string: "20",
      position_vesting: [
        {
          position_address: "pos1",
          vesting_end_timestamp: 123,
          cliff_point: 0,
          total_locked_liquidity_string: "100",
          total_released_liquidity_string: "20"
        }
      ]
    };

    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify(mockResponse), { status: 200 })
    ) as unknown as typeof fetch;

    const pools = [pool("POOL1")];
    await attachVesting(pools, "https://dammv2-api.meteora.ag", 5000, createLimiter(1));

    expect(pools[0].locks.dammV2?.vesting?.totalLockedLiquidity).toBe("100");
    expect(pools[0].locks.dammV2?.vesting?.positions[0].positionAddress).toBe("pos1");
  });
});
