import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_API_BASE = "http://localhost:3000";

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
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "LIQUIDITY_PROXY_ERROR", message },
      { status: 500 },
    );
  }
}
