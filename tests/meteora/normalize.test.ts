import { describe, expect, it } from "vitest";
import { normalizeDlmmPair } from "../../meteora/dlmm";
import { normalizeDammV2Pool } from "../../meteora/dammV2";
import { normalizeDammV1Pool } from "../../meteora/dammV1";

const mint = "So11111111111111111111111111111111111111112";

describe("meteora normalization", () => {
  it("normalizes DLMM pairs", () => {
    const pool = normalizeDlmmPair(
      {
        address: "DLMM_POOL",
        mint_x: mint,
        mint_y: "OtherMint",
        liquidity: "123.45",
        reserve_x_amount: "100",
        reserve_y_amount: "200",
        base_fee_percentage: "0.1"
      },
      mint
    );
    expect(pool.protocol).toBe("DLMM");
    expect(pool.poolAddress).toBe("DLMM_POOL");
    expect(pool.tokens.find((t) => t.isInputMint)?.mint).toBe(mint);
    expect(pool.liquidity.reserves[0].amount).toBe("100");
  });

  it("normalizes DAMM v2 pools", () => {
    const pool = normalizeDammV2Pool(
      {
        pool_address: "DAMM_V2_POOL",
        token_a_mint: mint,
        token_b_mint: "OtherMint",
        token_a_amount: 123,
        token_b_amount: 456,
        tvl: 789
      },
      mint
    );
    expect(pool.protocol).toBe("DAMM_V2");
    expect(pool.poolAddress).toBe("DAMM_V2_POOL");
    expect(pool.tokens[0].isInputMint).toBe(true);
    expect(pool.liquidity.reserves[0].amount).toBe("123");
  });

  it("normalizes DAMM v1 pools", () => {
    const pool = normalizeDammV1Pool(
      {
        pool_address: "DAMM_V1_POOL",
        pool_token_mints: [mint, "OtherMint"],
        pool_token_amounts: ["10", "20"],
        pool_tvl: "55.5"
      },
      mint
    );
    expect(pool.protocol).toBe("DAMM_V1");
    expect(pool.poolAddress).toBe("DAMM_V1_POOL");
    expect(pool.tokens[0].isInputMint).toBe(true);
    expect(pool.liquidity.reserves[0].amount).toBe("10");
  });
});
