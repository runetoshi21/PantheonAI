import { BadRequestError } from "./errors";

type EnumOptions<T extends string> = {
  defaultValue?: T;
  label?: string;
};

type BooleanOptions = {
  defaultValue?: boolean;
  label?: string;
  allowNumeric?: boolean;
};

type NumberOptions = {
  defaultValue?: number;
  label?: string;
};

export function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  return String(value);
}

export function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  options: EnumOptions<T> = {},
): T | undefined {
  if (value == null || value === "") return options.defaultValue;
  const str = String(value) as T;
  if (allowed.includes(str)) return str;
  const label = options.label ?? "value";
  throw new BadRequestError(`Invalid ${label}: ${str}`);
}

export function parseBoolean(value: unknown, options: BooleanOptions = {}): boolean | undefined {
  if (value == null) return options.defaultValue;
  const str = String(value).toLowerCase();
  if (str === "true") return true;
  if (str === "false") return false;
  if (options.allowNumeric) {
    if (str === "1") return true;
    if (str === "0") return false;
  }
  const label = options.label ?? "boolean";
  throw new BadRequestError(`Invalid ${label}: ${str}`);
}

export function parseNumber(value: unknown, options: NumberOptions = {}): number | undefined {
  if (value == null || value === "") return options.defaultValue;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    const label = options.label ?? "number";
    throw new BadRequestError(`Invalid ${label}: ${value}`);
  }
  return num;
}
