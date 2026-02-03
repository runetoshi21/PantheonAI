import { Router } from "express";
import { BadRequestError } from "../core/errors";
import { getLiquidityOverviewByMint } from "../services/liquidity/liquidityService";
import { parseProtocols } from "../services/liquidity/registry";

const router = Router();

router.get("/by-mint/:mint", async (req, res, next) => {
  try {
    const { mint } = req.params;
    const protocols = parseProtocols(asString(req.query.protocols));

    const response = await getLiquidityOverviewByMint(mint, {
      protocols,
      raydium: {
        poolType: parsePoolType(req.query.raydiumPoolType),
        sort: parseSort(req.query.raydiumSort),
        order: parseOrder(req.query.raydiumOrder),
        includeKeys: parseBoolean(req.query.raydiumIncludeKeys),
        includeVaultBalances: parseBoolean(req.query.raydiumIncludeVaultBalances)
      },
      pumpswap: {
        includeConfigs: parseBoolean(req.query.pumpswapIncludeConfigs)
      }
    });

    return res.json(response);
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({ error: err.code, message: err.message });
    }
    return next(err);
  }
});

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  return String(value);
}

function parsePoolType(value: unknown): "all" | "standard" | "concentrated" | undefined {
  if (!value) return undefined;
  const str = String(value);
  if (str === "all" || str === "standard" || str === "concentrated") return str;
  throw new BadRequestError(`Invalid raydiumPoolType: ${str}`);
}

type RaydiumSort =
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

const allowedSorts: RaydiumSort[] = [
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

function parseSort(value: unknown): RaydiumSort | undefined {
  if (!value) return undefined;
  const str = String(value) as RaydiumSort;
  if (!allowedSorts.includes(str)) {
    throw new BadRequestError(`Invalid raydiumSort: ${str}`);
  }
  return str;
}

function parseOrder(value: unknown): "asc" | "desc" | undefined {
  if (!value) return undefined;
  const str = String(value);
  if (str === "asc" || str === "desc") return str;
  throw new BadRequestError(`Invalid raydiumOrder: ${str}`);
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value == null) return undefined;
  const str = String(value).toLowerCase();
  if (str === "true" || str === "1") return true;
  if (str === "false" || str === "0") return false;
  throw new BadRequestError(`Invalid boolean: ${str}`);
}

export const liquidityRouter = router;
