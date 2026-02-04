import BN from "bn.js";
import { describe, expect, it } from "vitest";
import { withdraw } from "@pump-fun/pump-swap-sdk";

describe("PumpSwap withdraw sizing", () => {
  it("scales outputs linearly with lpAmount", () => {
    const baseReserve = new BN("1000");
    const quoteReserve = new BN("2000");
    const totalLp = new BN("1000");

    const low = withdraw(new BN("100"), 0, baseReserve, quoteReserve, totalLp);
    const high = withdraw(new BN("200"), 0, baseReserve, quoteReserve, totalLp);

    expect(high.base.toString(10)).toBe("200");
    expect(high.quote.toString(10)).toBe("400");
    expect(high.base.gt(low.base)).toBe(true);
    expect(high.quote.gt(low.quote)).toBe(true);
  });

  it("reduces min outs as slippage increases", () => {
    const baseReserve = new BN("1000");
    const quoteReserve = new BN("1000");
    const totalLp = new BN("1000");
    const lpAmount = new BN("100");

    const noSlip = withdraw(lpAmount, 0, baseReserve, quoteReserve, totalLp);
    const withSlip = withdraw(lpAmount, 5, baseReserve, quoteReserve, totalLp);

    expect(withSlip.minBase.lt(noSlip.minBase)).toBe(true);
    expect(withSlip.minQuote.lt(noSlip.minQuote)).toBe(true);
  });
});
