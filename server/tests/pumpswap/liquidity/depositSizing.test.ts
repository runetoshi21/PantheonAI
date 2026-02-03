import BN from "bn.js";
import { describe, expect, it } from "vitest";
import { depositLpToken, PUMP_AMM_SDK } from "@pump-fun/pump-swap-sdk";
import type { LiquiditySolanaState } from "@pump-fun/pump-swap-sdk";

const liquidityState = {
  pool: { lpSupply: new BN("1000") },
  poolBaseTokenAccount: { amount: BigInt(1000) },
  poolQuoteTokenAccount: { amount: BigInt(1000) }
} as unknown as LiquiditySolanaState;

describe("PumpSwap deposit sizing", () => {
  it("computes lpOut from base input", () => {
    const { quote, lpToken } = PUMP_AMM_SDK.depositBaseInput(
      liquidityState,
      new BN("100"),
      0
    );

    expect(quote.toString(10)).toBe("100");
    expect(lpToken.toString(10)).toBe("100");
  });

  it("slippage increases max values", () => {
    const lpOut = new BN("100");
    const noSlip = depositLpToken(lpOut, 0, new BN(1000), new BN(1000), new BN(1000));
    const withSlip = depositLpToken(lpOut, 1, new BN(1000), new BN(1000), new BN(1000));

    expect(withSlip.maxBase.gt(noSlip.maxBase)).toBe(true);
    expect(withSlip.maxQuote.gt(noSlip.maxQuote)).toBe(true);
  });
});
