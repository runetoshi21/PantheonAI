export class ClmmError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ClmmError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isClmmError(error: unknown): error is ClmmError {
  return error instanceof ClmmError;
}
