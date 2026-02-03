export class InvalidMintError extends Error {
  readonly code = "INVALID_MINT";
  constructor(mint: string) {
    super(`Invalid mint: ${mint}`);
    this.name = "InvalidMintError";
  }
}

export class RaydiumApiError extends Error {
  readonly code = "RAYDIUM_API_ERROR";
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "RaydiumApiError";
  }
}
