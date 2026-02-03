import BN from "bn.js";
import { describe, expect, it } from "vitest";
import { divDecimalStrings, formatUnits } from "../../src/services/pumpswap/bnFormat";

describe("formatUnits", () => {
  it("formats decimals", () => {
    expect(formatUnits(new BN("12345"), 2)).toBe("123.45");
    expect(formatUnits(new BN("1"), 9)).toBe("0.000000001");
  });

  it("handles zero decimals", () => {
    expect(formatUnits(new BN("42"), 0)).toBe("42");
  });
});

describe("divDecimalStrings", () => {
  it("divides with precision", () => {
    expect(divDecimalStrings("1", "2", 4)).toBe("0.5");
    expect(divDecimalStrings("10", "4", 4)).toBe("2.5");
  });

  it("returns 0 for division by zero", () => {
    expect(divDecimalStrings("1", "0", 6)).toBe("0");
  });
});
