import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { Connection, Keypair } from "@solana/web3.js";
import { raydiumConfig } from "../src/config/raydium";
import { solanaConfig } from "../src/config/solana";

let readonlyPromise: Promise<Raydium> | null = null;
const signerCache = new Map<string, Promise<Raydium>>();
let connection: Connection | null = null;

export function getRaydiumConnection(): Connection {
  if (!connection) {
    connection = new Connection(raydiumConfig.SOLANA_RPC_URL);
  }
  return connection;
}

export async function getRaydiumReadonly(): Promise<Raydium> {
  if (!readonlyPromise) {
    const baseHost = raydiumConfig.RAYDIUM_API_BASE_HOST
      ? { BASE_HOST: raydiumConfig.RAYDIUM_API_BASE_HOST }
      : raydiumConfig.RAYDIUM_CLUSTER === "devnet"
        ? { BASE_HOST: "https://api-v3-devnet.raydium.io" }
        : solanaConfig.RAYDIUM_API_BASE_URL
          ? { BASE_HOST: solanaConfig.RAYDIUM_API_BASE_URL }
          : undefined;

    readonlyPromise = Raydium.load({
      connection: getRaydiumConnection(),
      cluster: raydiumConfig.RAYDIUM_CLUSTER,
      apiRequestTimeout: raydiumConfig.RAYDIUM_API_TIMEOUT_MS,
      disableLoadToken: true,
      urlConfigs: baseHost
    });
  }

  return readonlyPromise;
}

export async function getRaydiumWithSigner(payer: Keypair): Promise<Raydium> {
  const key = payer.publicKey.toBase58();
  const existing = signerCache.get(key);
  if (existing) return existing;

  const baseHost = raydiumConfig.RAYDIUM_API_BASE_HOST
    ? { BASE_HOST: raydiumConfig.RAYDIUM_API_BASE_HOST }
    : raydiumConfig.RAYDIUM_CLUSTER === "devnet"
      ? { BASE_HOST: "https://api-v3-devnet.raydium.io" }
      : solanaConfig.RAYDIUM_API_BASE_URL
        ? { BASE_HOST: solanaConfig.RAYDIUM_API_BASE_URL }
        : undefined;

  const promise = Raydium.load({
    connection: getRaydiumConnection(),
    cluster: raydiumConfig.RAYDIUM_CLUSTER,
    apiRequestTimeout: raydiumConfig.RAYDIUM_API_TIMEOUT_MS,
    disableLoadToken: true,
    urlConfigs: baseHost,
    owner: payer
  });

  signerCache.set(key, promise);
  return promise;
}

export async function getRaydiumClient(): Promise<Raydium> {
  return getRaydiumReadonly();
}
