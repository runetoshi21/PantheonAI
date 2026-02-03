import { LRUCache } from "lru-cache";
import { jupConfig } from "../../config/jup";

const priceCache = new LRUCache<string, number>({
  max: 2000,
  ttl: jupConfig.JUP_PRICE_CACHE_TTL_MS
});

let lastRequestAt = 0;
let inFlight: Promise<Map<string, number>> | null = null;

export async function getJupPrices(mints: string[]): Promise<Map<string, number>> {
  const unique = Array.from(new Set(mints.filter(Boolean)));
  if (!unique.length) {
    return new Map();
  }

  const cached = new Map<string, number>();
  const missing: string[] = [];

  for (const mint of unique) {
    const price = priceCache.get(mint);
    if (price != null) {
      cached.set(mint, price);
    } else {
      missing.push(mint);
    }
  }

  if (!missing.length) {
    return cached;
  }

  if (!jupConfig.JUP_API_KEY) {
    return cached;
  }

  if (inFlight) {
    const fresh = await inFlight;
    return mergeMaps(cached, fresh);
  }

  inFlight = fetchJupPrices(missing)
    .catch(() => new Map<string, number>())
    .finally(() => {
      inFlight = null;
    });

  const fresh = await inFlight;
  return mergeMaps(cached, fresh);
}

async function fetchJupPrices(mints: string[]): Promise<Map<string, number>> {
  await throttle();

  const url = `https://api.jup.ag/price/v3?ids=${encodeURIComponent(mints.join(","))}`;
  const response = await fetch(url, {
    headers: {
      "x-api-key": jupConfig.JUP_API_KEY ?? "",
      "User-Agent": "PantheonAI"
    }
  });

  if (!response.ok) {
    return new Map();
  }

  const payload = (await response.json()) as {
    data?: Record<string, { price?: number }>;
  };

  const result = new Map<string, number>();
  const data = payload.data ?? {};

  for (const mint of mints) {
    const price = data[mint]?.price;
    if (typeof price === "number" && Number.isFinite(price)) {
      priceCache.set(mint, price);
      result.set(mint, price);
    }
  }

  return result;
}

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  const waitMs = elapsed >= 1000 ? 0 : 1000 - elapsed;
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestAt = Date.now();
}

function mergeMaps(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
  const merged = new Map(a);
  for (const [key, value] of b.entries()) {
    merged.set(key, value);
  }
  return merged;
}
