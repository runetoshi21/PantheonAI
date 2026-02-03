import BN from "bn.js";
import { describe, expect, it } from "vitest";
import { selectFeeTier } from "../../src/services/pumpswap/fees";

const feeTier = (threshold: string) => ({
  marketCapLamportsThreshold: new BN(threshold),
  fees: {
    lpFeeBps: new BN(10),
    protocolFeeBps: new BN(20),
    creatorFeeBps: new BN(30)
  }
});

describe("selectFeeTier", () => {
  it("selects first tier when below first threshold", () => {
    const tiers = [feeTier("100"), feeTier("200")];
    const selected = selectFeeTier(tiers, new BN(50));
    expect(selected.marketCapLamportsThreshold.toString(10)).toBe("100");
  });

  it("selects middle tier when between thresholds", () => {
    const tiers = [feeTier("100"), feeTier("200"), feeTier("300")];
    const selected = selectFeeTier(tiers, new BN(250));
    expect(selected.marketCapLamportsThreshold.toString(10)).toBe("200");
  });

  it("selects highest tier when above highest threshold", () => {
    const tiers = [feeTier("100"), feeTier("200")];
    const selected = selectFeeTier(tiers, new BN(500));
    expect(selected.marketCapLamportsThreshold.toString(10)).toBe("200");
  });
});
