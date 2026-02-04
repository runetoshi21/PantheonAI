import { Router } from "express";
import { BadRequestError } from "../core/errors";
import { parseBoolean, parseEnum, parseNumber } from "../core/query";
import { getMeteoraPoolsByMint, resolveDefaults } from "../../meteora";
import type { MeteoraCluster } from "../../meteora/config";

const router = Router();

const clusters: MeteoraCluster[] = ["mainnet-beta", "devnet"];

router.get("/pools/:mint", async (req, res, next) => {
  try {
    const { mint } = req.params;
    const cluster = parseEnum(req.query.cluster, clusters, { label: "cluster" });

    const params = resolveDefaults({
      mint,
      cluster,
      includeUnknown: parseBoolean(req.query.includeUnknown, { allowNumeric: true }),
      includeVesting: parseBoolean(req.query.includeVesting, { allowNumeric: true }),
      includeDlmmLocks: parseBoolean(req.query.includeDlmmLocks, { allowNumeric: true }),
      minTvlUsd: parseNumber(req.query.minTvlUsd),
      limitPerProtocol: parseNumber(req.query.limitPerProtocol),
      timeoutMs: parseNumber(req.query.timeoutMs),
    });

    const result = await getMeteoraPoolsByMint(params);
    return res.json(result);
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({ error: err.code, message: err.message });
    }
    return next(err);
  }
});

export const meteoraRouter = router;
