import { describe, expect, it } from "vitest";
import { formatAmount } from "../src/core/format";

describe("formatAmount", () => {
  it("formats integers with decimals", () => {
    expect(formatAmount("1000000000", 9)).toBe("1");
    expect(formatAmount("123450000", 6)).toBe("123.45");
  });

  it("preserves raw when decimals is zero", () => {
    expect(formatAmount("42", 0)).toBe("42");
  });
});
