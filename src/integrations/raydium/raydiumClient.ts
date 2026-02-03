import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { Connection } from "@solana/web3.js";
import { raydiumConfig } from "../../config/raydium";

let raydiumPromise: Promise<Raydium> | null = null;
let connection: Connection | null = null;

export function getRaydiumConnection(): Connection {
  if (!connection) {
    connection = new Connection(raydiumConfig.SOLANA_RPC_URL);
  }
  return connection;
}

export async function getRaydiumClient(): Promise<Raydium> {
  if (!raydiumPromise) {
    const baseHost = raydiumConfig.RAYDIUM_API_BASE_HOST
      ? { BASE_HOST: raydiumConfig.RAYDIUM_API_BASE_HOST }
      : raydiumConfig.RAYDIUM_CLUSTER === "devnet"
        ? { BASE_HOST: "https://api-v3-devnet.raydium.io" }
        : undefined;

    raydiumPromise = Raydium.load({
      connection: getRaydiumConnection(),
      cluster: raydiumConfig.RAYDIUM_CLUSTER,
      apiRequestTimeout: raydiumConfig.RAYDIUM_API_TIMEOUT_MS,
      disableLoadToken: true,
      urlConfigs: baseHost
    });
  }

  return raydiumPromise;
}
