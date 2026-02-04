import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { Connection } from "@solana/web3.js";
import type { Keypair, PublicKey } from "@solana/web3.js";
import { raydiumConfig } from "../../config/raydium";
import { solanaConfig } from "../../config/solana";

let readonlyPromise: Promise<Raydium> | null = null;
const signerCache = new Map<string, Promise<Raydium>>();
const ownerCache = new Map<string, Promise<Raydium>>();
let connection: Connection | null = null;

function resolveBaseHost(): { BASE_HOST: string } | undefined {
  if (raydiumConfig.RAYDIUM_API_BASE_HOST) {
    return { BASE_HOST: raydiumConfig.RAYDIUM_API_BASE_HOST };
  }
  if (raydiumConfig.RAYDIUM_CLUSTER === "devnet") {
    return { BASE_HOST: "https://api-v3-devnet.raydium.io" };
  }
  if (solanaConfig.RAYDIUM_API_BASE_URL) {
    return { BASE_HOST: solanaConfig.RAYDIUM_API_BASE_URL };
  }
  return undefined;
}

export function getRaydiumConnection(): Connection {
  if (!connection) {
    connection = new Connection(raydiumConfig.SOLANA_RPC_URL);
  }
  return connection;
}

export async function getRaydiumReadonly(): Promise<Raydium> {
  if (!readonlyPromise) {
    readonlyPromise = Raydium.load({
      connection: getRaydiumConnection(),
      cluster: raydiumConfig.RAYDIUM_CLUSTER,
      apiRequestTimeout: raydiumConfig.RAYDIUM_API_TIMEOUT_MS,
      disableLoadToken: true,
      urlConfigs: resolveBaseHost()
    });
  }

  return readonlyPromise;
}

export async function getRaydiumWithSigner(payer: Keypair): Promise<Raydium> {
  const key = payer.publicKey.toBase58();
  const existing = signerCache.get(key);
  if (existing) return existing;

  const promise = Raydium.load({
    connection: getRaydiumConnection(),
    cluster: raydiumConfig.RAYDIUM_CLUSTER,
    apiRequestTimeout: raydiumConfig.RAYDIUM_API_TIMEOUT_MS,
    disableLoadToken: true,
    urlConfigs: resolveBaseHost(),
    owner: payer
  });

  signerCache.set(key, promise);
  return promise;
}

export async function getRaydiumWithOwner(owner: PublicKey): Promise<Raydium> {
  const key = owner.toBase58();
  const existing = ownerCache.get(key);
  if (existing) return existing;

  const promise = Raydium.load({
    connection: getRaydiumConnection(),
    cluster: raydiumConfig.RAYDIUM_CLUSTER,
    apiRequestTimeout: raydiumConfig.RAYDIUM_API_TIMEOUT_MS,
    disableLoadToken: true,
    urlConfigs: resolveBaseHost(),
    owner
  });

  ownerCache.set(key, promise);
  return promise;
}

export async function getRaydiumClient(): Promise<Raydium> {
  return getRaydiumReadonly();
}
