import { describe, expect, it } from "vitest";
import { parseProtocols } from "../../src/services/liquidity/registry";

describe("parseProtocols", () => {
  it("returns undefined when empty", () => {
    expect(parseProtocols(undefined)).toBeUndefined();
    expect(parseProtocols(" ")).toBeUndefined();
  });

  it("parses known protocols", () => {
    expect(parseProtocols("raydium,pumpswap")).toEqual(["raydium", "pumpswap"]);
    expect(parseProtocols("pumpswap")).toEqual(["pumpswap"]);
  });

  it("throws on unknown protocols", () => {
    expect(() => parseProtocols("unknown")).toThrow("Unknown protocol");
  });
});
