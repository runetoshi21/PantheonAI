export class InvalidMintError extends Error {
  readonly code = "INVALID_MINT";
  constructor(mint: string) {
    super(`Invalid mint: ${mint}`);
    this.name = "InvalidMintError";
  }
}

export class BadRequestError extends Error {
  readonly code = "BAD_REQUEST";
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export class RaydiumApiError extends Error {
  readonly code = "RAYDIUM_API_ERROR";
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "RaydiumApiError";
  }
}
