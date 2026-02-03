import { describe, expect, it } from "vitest";
import { collectPriceMints, getPoolUsdLiquidity } from "../raydium/liquidity";
import type { RaydiumPoolDto } from "../raydium/dtos";

const basePool: RaydiumPoolDto = {
  id: "1",
  kind: "standard",
  programId: "prog",
  mintA: { address: "MintA", decimals: 6 },
  mintB: { address: "MintB", decimals: 6 },
  metrics: {}
};

describe("liquidity helpers", () => {
  it("uses tvl when present", () => {
    const pool = { ...basePool, metrics: { tvl: "12345" } };
    expect(getPoolUsdLiquidity(pool, new Map())).toBe(12345);
  });

  it("sums usd amounts when present", () => {
    const pool = {
      ...basePool,
      metrics: { mintAmountAUsd: "100", mintAmountBUsd: "250" }
    };
    expect(getPoolUsdLiquidity(pool, new Map())).toBe(350);
  });

  it("uses price map when usd amounts missing", () => {
    const pool = {
      ...basePool,
      metrics: { mintAmountA: "2", mintAmountB: "3" }
    };
    const prices = new Map([
      ["MintA", 10],
      ["MintB", 5]
    ]);
    expect(getPoolUsdLiquidity(pool, prices)).toBe(35);
  });

  it("collects price mints when usd is missing", () => {
    const pools: RaydiumPoolDto[] = [
      { ...basePool, metrics: { mintAmountA: "1", mintAmountBUsd: "10" } },
      { ...basePool, id: "2", mintA: { address: "MintC" }, metrics: { tvl: "9999" } }
    ];

    expect(collectPriceMints(pools)).toEqual(["MintA"]);
  });
});
