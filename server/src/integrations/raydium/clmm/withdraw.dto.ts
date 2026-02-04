export type WithdrawMode = "harvest" | "decrease" | "close";

export type WithdrawRequest = {
  owner: string;
  positionNftMint: string;
  mode: WithdrawMode;
  decrease?: {
    liquidityBps: number;
  };
  slippageBps?: number;
  txVersion?: "v0" | "legacy";
  priority?: {
    computeUnitLimit?: number;
    computeUnitPriceMicroLamports?: number;
  };
  signing?: {
    mode?: "client" | "server";
  };
};

export type WithdrawTransaction = {
  base64?: string;
  signersRequired: string[];
  signature?: string;
};

export type WithdrawResponse = {
  owner: string;
  positionNftMint: string;
  mode: WithdrawMode;
  poolId: string;
  positionAddress: string;
  liquidity: {
    current: string;
    toRemove: string;
  };
  expected: {
    amountA: string;
    amountB: string;
  };
  minOut: {
    amountA: string;
    amountB: string;
  };
  transactions: WithdrawTransaction[];
};

export type WithdrawQuoteResponse = Omit<WithdrawResponse, "transactions" | "mode">;
