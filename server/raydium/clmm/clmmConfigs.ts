import { LRUCache } from "lru-cache";
import { solanaConfig } from "../../src/config/solana";
import type { ClmmConfig, ClmmConfigSelection } from "../../src/types/clmm";

const cache = new LRUCache<string, ClmmConfig[]>({ max: 1, ttl: 10 * 60 * 1000 });

export async function fetchClmmConfigs(): Promise<ClmmConfig[]> {
  const cached = cache.get("clmm-configs");
  if (cached) return cached;

  const url = `${solanaConfig.RAYDIUM_API_BASE_URL}/main/clmm-config`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CLMM configs: ${response.status}`);
  }

  const payload = await response.json();
  const rawList = extractConfigs(payload);
  const configs = rawList.map(normalizeConfig);
  cache.set("clmm-configs", configs);
  return configs;
}

export function selectClmmConfig(configs: ClmmConfig[], selection: ClmmConfigSelection): ClmmConfig {
  if ("configId" in selection && selection.configId) {
    const found = configs.find((c) => c.id === selection.configId);
    if (!found) {
      throw new Error(`CLMM config not found: ${selection.configId}`);
    }
    return found;
  }

  const matches = configs.filter((c) => {
    if ("tickSpacing" in selection && selection.tickSpacing != null) {
      if (c.tickSpacing !== selection.tickSpacing) return false;
    }
    if ("tradeFeeRate" in selection && selection.tradeFeeRate != null) {
      if (c.tradeFeeRate !== selection.tradeFeeRate) return false;
    }
    return true;
  });

  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new Error("No matching CLMM config for selection");
  }

  throw new Error(
    `Multiple CLMM configs match selection: ${matches
      .map((c) => `${c.id}:${c.tickSpacing ?? "?"}:${c.tradeFeeRate ?? "?"}`)
      .join(", ")}`
  );
}

function extractConfigs(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const data = obj.data ?? obj.configs ?? obj.items;
    if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  }
  return [];
}

function normalizeConfig(raw: Record<string, unknown>): ClmmConfig {
  return {
    id: String(raw.id ?? raw.configId ?? ""),
    index: typeof raw.index === "number" ? raw.index : undefined,
    tickSpacing: typeof raw.tickSpacing === "number" ? raw.tickSpacing : undefined,
    tradeFeeRate: typeof raw.tradeFeeRate === "number" ? raw.tradeFeeRate : undefined,
    protocolFeeRate: typeof raw.protocolFeeRate === "number" ? raw.protocolFeeRate : undefined,
    fundFeeRate: typeof raw.fundFeeRate === "number" ? raw.fundFeeRate : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    defaultRange: typeof raw.defaultRange === "number" ? raw.defaultRange : undefined,
    defaultRangePoint: Array.isArray(raw.defaultRangePoint)
      ? (raw.defaultRangePoint as number[])
      : undefined
  };
}
