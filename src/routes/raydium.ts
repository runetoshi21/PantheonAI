import { Router } from "express";
import { BadRequestError, InvalidMintError } from "../core/errors";
import { getRaydiumPoolsByMint } from "../integrations/raydium/raydiumPoolsService";

const router = Router();

type SortParam =
  | "default"
  | "liquidity"
  | "volume24h"
  | "volume7d"
  | "volume30d"
  | "fee24h"
  | "fee7d"
  | "fee30d"
  | "apr24h"
  | "apr7d"
  | "apr30d";

const allowedSorts: SortParam[] = [
  "default",
  "liquidity",
  "volume24h",
  "volume7d",
  "volume30d",
  "fee24h",
  "fee7d",
  "fee30d",
  "apr24h",
  "apr7d",
  "apr30d"
];

router.get("/pools/by-mint/:mint", async (req, res, next) => {
  try {
    const { mint } = req.params;
    const poolType = parsePoolType(req.query.poolType);
    const sort = parseSort(req.query.sort);
    const order = parseOrder(req.query.order);
    const includeKeys = parseBoolean(req.query.includeKeys);
    const includeVaultBalances = parseBoolean(req.query.includeVaultBalances);

    const response = await getRaydiumPoolsByMint(mint, {
      poolType,
      sort,
      order,
      includeKeys,
      includeVaultBalances
    });

    res.json(response);
  } catch (err) {
    if (err instanceof InvalidMintError || err instanceof BadRequestError) {
      return res.status(400).json({ error: err.code, message: err.message });
    }
    return next(err);
  }
});

function parsePoolType(value: unknown): "all" | "standard" | "concentrated" {
  if (!value) return "all";
  const str = String(value);
  if (str === "all" || str === "standard" || str === "concentrated") return str;
  throw new BadRequestError(`Invalid poolType: ${str}`);
}

function parseSort(value: unknown): SortParam {
  if (!value) return "liquidity";
  const str = String(value) as SortParam;
  if (!allowedSorts.includes(str)) {
    throw new BadRequestError(`Invalid sort: ${str}`);
  }
  return str;
}

function parseOrder(value: unknown): "asc" | "desc" {
  if (!value) return "desc";
  const str = String(value);
  if (str === "asc" || str === "desc") return str;
  throw new BadRequestError(`Invalid order: ${str}`);
}

function parseBoolean(value: unknown): boolean {
  if (value == null) return false;
  const str = String(value).toLowerCase();
  if (str === "true") return true;
  if (str === "false") return false;
  throw new BadRequestError(`Invalid boolean: ${str}`);
}

export const raydiumRouter = router;
