import BN from "bn.js";
import { describe, expect, it } from "vitest";
import { parseUiToRaw } from "../../../pumpswap/liquidity/amounts";

describe("parseUiToRaw", () => {
  it("parses whole numbers", () => {
    expect(parseUiToRaw("1", 6).toString(10)).toBe("1000000");
  });

  it("parses LP decimals", () => {
    expect(parseUiToRaw("1", 9).toString(10)).toBe("1000000000");
  });

  it("parses fractional numbers", () => {
    expect(parseUiToRaw("0.000001", 6).toString(10)).toBe("1");
  });

  it("rejects too many decimals", () => {
    expect(() => parseUiToRaw("0.0000001", 6)).toThrow();
  });

  it("rejects negative or empty", () => {
    expect(() => parseUiToRaw("-1", 6)).toThrow();
    expect(() => parseUiToRaw("", 6)).toThrow();
  });

  it("rejects zero", () => {
    expect(() => parseUiToRaw("0", 6)).toThrow();
  });

  it("handles large numbers", () => {
    const raw = parseUiToRaw("123456789.123456", 6);
    expect(raw).toBeInstanceOf(BN);
  });
});
