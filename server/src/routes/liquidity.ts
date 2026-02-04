import { Router } from "express";
import { BadRequestError } from "../core/errors";
import { asString, parseBoolean, parseEnum, parseNumber } from "../core/query";
import { getLiquidityOverviewByMint } from "../services/liquidity/liquidityService";
import { parseProtocols } from "../services/liquidity/registry";

const router = Router();

const raydiumPoolTypes = ["all", "standard", "concentrated"] as const;
const raydiumSorts = [
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
  "apr30d",
] as const;
const raydiumOrders = ["asc", "desc"] as const;
const meteoraClusters = ["mainnet-beta", "devnet"] as const;

router.get("/by-mint/:mint", async (req, res, next) => {
  try {
    const { mint } = req.params;
    const protocols = parseProtocols(asString(req.query.protocols));

    const response = await getLiquidityOverviewByMint(mint, {
      protocols,
      raydium: {
        poolType: parseEnum(req.query.raydiumPoolType, raydiumPoolTypes, {
          label: "raydiumPoolType",
        }),
        sort: parseEnum(req.query.raydiumSort, raydiumSorts, { label: "raydiumSort" }),
        order: parseEnum(req.query.raydiumOrder, raydiumOrders, { label: "raydiumOrder" }),
        includeKeys: parseBoolean(req.query.raydiumIncludeKeys, { allowNumeric: true }),
        includeVaultBalances: parseBoolean(req.query.raydiumIncludeVaultBalances, {
          allowNumeric: true,
        }),
      },
      pumpswap: {
        includeConfigs: parseBoolean(req.query.pumpswapIncludeConfigs, {
          label: "includeConfigs",
          allowNumeric: true,
        }),
      },
      meteora: {
        cluster: parseEnum(req.query.meteoraCluster, meteoraClusters, {
          label: "meteoraCluster",
        }),
        includeUnknown: parseBoolean(req.query.meteoraIncludeUnknown, { allowNumeric: true }),
        includeVesting: parseBoolean(req.query.meteoraIncludeVesting, { allowNumeric: true }),
        includeDlmmLocks: parseBoolean(req.query.meteoraIncludeDlmmLocks, { allowNumeric: true }),
        minTvlUsd: parseNumber(req.query.meteoraMinTvlUsd),
        limitPerProtocol: parseNumber(req.query.meteoraLimitPerProtocol),
        timeoutMs: parseNumber(req.query.meteoraTimeoutMs),
      },
    });

    return res.json(response);
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({ error: err.code, message: err.message });
    }
    return next(err);
  }
});

export const liquidityRouter = router;
