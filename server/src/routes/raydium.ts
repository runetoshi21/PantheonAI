import { Router } from "express";
import { BadRequestError, InvalidMintError } from "../core/errors";
import { parseBoolean, parseEnum } from "../core/query";
import { getRaydiumPoolsByMint } from "../../raydium/raydiumPoolsService";

const router = Router();

const poolTypes = ["all", "standard", "concentrated"] as const;
const sortOptions = [
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
const orderOptions = ["asc", "desc"] as const;

router.get("/pools/by-mint/:mint", async (req, res, next) => {
  try {
    const { mint } = req.params;
    const poolType = parseEnum(req.query.poolType, poolTypes, {
      label: "poolType",
      defaultValue: "all",
    });
    const sort = parseEnum(req.query.sort, sortOptions, {
      label: "sort",
      defaultValue: "liquidity",
    });
    const order = parseEnum(req.query.order, orderOptions, {
      label: "order",
      defaultValue: "desc",
    });
    const includeKeys = parseBoolean(req.query.includeKeys, { defaultValue: false });
    const includeVaultBalances = parseBoolean(req.query.includeVaultBalances, {
      defaultValue: false,
    });

    const response = await getRaydiumPoolsByMint(mint, {
      poolType,
      sort,
      order,
      includeKeys,
      includeVaultBalances,
    });

    res.json(response);
  } catch (err) {
    if (err instanceof InvalidMintError || err instanceof BadRequestError) {
      return res.status(400).json({ error: err.code, message: err.message });
    }
    return next(err);
  }
});

export const raydiumRouter = router;
