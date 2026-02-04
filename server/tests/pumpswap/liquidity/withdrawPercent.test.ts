import BN from "bn.js";
import { describe, expect, it } from "vitest";
import { resolveWithdrawLpInRaw } from "../../../pumpswap/liquidity/buildWithdrawTx";

describe("PumpSwap withdraw percent math", () => {
  it("computes percent of LP balance", () => {
    const res = resolveWithdrawLpInRaw(
      { kind: "percentBps", percentBps: 2500 },
      new BN("1000"),
      6
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.lpInRaw.toString(10)).toBe("250");
    }
  });

  it("rejects percent that rounds to zero", () => {
    const res = resolveWithdrawLpInRaw(
      { kind: "percentBps", percentBps: 1 },
      new BN("1"),
      6
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      if (res.response.ok) throw new Error("expected error response");
      expect(res.response.error.code).toBe("INVALID_AMOUNT");
    }
  });
});
