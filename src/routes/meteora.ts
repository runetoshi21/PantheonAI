import { Router } from "express";
import { BadRequestError } from "../core/errors";
import { getMeteoraPoolsByMint, resolveDefaults } from "../../meteora";
import type { MeteoraCluster } from "../../meteora/config";

const router = Router();

router.get("/pools/:mint", async (req, res, next) => {
  try {
    const { mint } = req.params;
    const cluster = parseCluster(req.query.cluster);

    const params = resolveDefaults({
      mint,
      cluster,
      includeUnknown: parseBoolean(req.query.includeUnknown),
      includeVesting: parseBoolean(req.query.includeVesting),
      includeDlmmLocks: parseBoolean(req.query.includeDlmmLocks),
      minTvlUsd: parseNumber(req.query.minTvlUsd),
      limitPerProtocol: parseNumber(req.query.limitPerProtocol),
      timeoutMs: parseNumber(req.query.timeoutMs)
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

function parseCluster(value: unknown): MeteoraCluster | undefined {
  if (!value) return undefined;
  const str = String(value);
  if (str === "mainnet-beta" || str === "devnet") return str;
  throw new BadRequestError(`Invalid cluster: ${str}`);
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value == null) return undefined;
  const str = String(value).toLowerCase();
  if (str === "true" || str === "1") return true;
  if (str === "false" || str === "0") return false;
  throw new BadRequestError(`Invalid boolean: ${str}`);
}

function parseNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new BadRequestError(`Invalid number: ${value}`);
  }
  return num;
}

export const meteoraRouter = router;
