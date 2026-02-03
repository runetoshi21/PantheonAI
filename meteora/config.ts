export type MeteoraCluster = "mainnet-beta" | "devnet";

export type MeteoraApiConfig = {
  dlmmBaseUrl: string;
  dammV2BaseUrl: string;
  dammV1BaseUrl: string;
  rateLimits: {
    dlmmRps: number;
    dammV2Rps: number;
    dammV1Rps: number;
  };
  concurrency: {
    dlmm: number;
    dammV2: number;
    dammV1: number;
  };
  defaults: {
    timeoutMs: number;
    limitPerProtocol: number;
    pageSizeDlmm: number;
    pageSizeDammV1: number;
    limitDammV2: number;
  };
};

export function getMeteoraApiConfig(cluster: MeteoraCluster): MeteoraApiConfig {
  const isDevnet = cluster === "devnet";

  return {
    dlmmBaseUrl: isDevnet ? "https://devnet-dlmm-api.meteora.ag" : "https://dlmm-api.meteora.ag",
    dammV2BaseUrl: isDevnet ? "https://dammv2-api.devnet.meteora.ag" : "https://dammv2-api.meteora.ag",
    dammV1BaseUrl: isDevnet ? "https://damm-api.devnet.meteora.ag" : "https://damm-api.meteora.ag",
    rateLimits: {
      dlmmRps: 30,
      dammV2Rps: 10,
      dammV1Rps: 10
    },
    concurrency: {
      dlmm: 10,
      dammV2: 3,
      dammV1: 3
    },
    defaults: {
      timeoutMs: 10000,
      limitPerProtocol: 200,
      pageSizeDlmm: 50,
      pageSizeDammV1: 50,
      limitDammV2: 100
    }
  };
}
