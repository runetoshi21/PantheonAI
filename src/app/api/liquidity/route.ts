import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_API_BASE = "http://localhost:3001";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mint = searchParams.get("mint");

  if (!mint) {
    return NextResponse.json(
      { error: "MISSING_MINT", message: "Mint address is required." },
      { status: 400 },
    );
  }

  const baseUrl = process.env.PANTHEON_API_BASE_URL ?? DEFAULT_API_BASE;
  const target = new URL(`/v1/liquidity/by-mint/${mint}`, baseUrl);
  searchParams.forEach((value, key) => {
    if (key === "mint") return;
    target.searchParams.set(key, value);
  });

  try {
    const response = await fetch(target.toString(), {
      headers: { accept: "application/json" },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      return NextResponse.json(
        {
          error: "LIQUIDITY_PROXY_INVALID_RESPONSE",
          message: "Expected JSON from liquidity service.",
          target: target.toString(),
          contentType,
          sample: text.slice(0, 200),
        },
        { status: 502 },
      );
    }
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "LIQUIDITY_PROXY_ERROR", message, target: target.toString() },
      { status: 500 },
    );
  }
}
