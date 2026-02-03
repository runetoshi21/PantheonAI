import { describe, expect, it } from "vitest";
import { buildDlmmUrl } from "../../meteora/dlmm";
import { buildDammV2Url } from "../../meteora/dammV2";
import { buildDammV1Url } from "../../meteora/dammV1";

const mint = "So11111111111111111111111111111111111111112";

describe("meteora query construction", () => {
  it("builds DLMM URL with include_token_mints", () => {
    const url = buildDlmmUrl("https://dlmm-api.meteora.ag", {
      mint,
      includeUnknown: true,
      page: 0,
      limit: 50
    });
    expect(url).toContain("include_token_mints=" + mint);
    expect(url).toContain("page=0");
    expect(url).toContain("limit=50");
  });

  it("builds DAMM v2 URL with any=true and both mint params", () => {
    const url = buildDammV2Url("https://dammv2-api.meteora.ag", {
      mint,
      limit: 100,
      offset: 0
    });
    expect(url).toContain("token_a_mint=" + mint);
    expect(url).toContain("token_b_mint=" + mint);
    expect(url).toContain("any=true");
  });

  it("builds DAMM v1 URL with include_token_mints", () => {
    const url = buildDammV1Url("https://damm-api.meteora.ag", {
      mint,
      page: 0,
      size: 50,
      includeUnknown: true
    });
    expect(url).toContain("include_token_mints=" + mint);
    expect(url).toContain("page=0");
    expect(url).toContain("size=50");
  });
});
