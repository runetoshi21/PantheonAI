import { Router } from "express";
import { BadRequestError } from "../core/errors";
import { getCanonicalPumpSwapPoolSnapshot } from "../services/pumpswap/poolSnapshot";

const router = Router();

router.get("/pool/:mint", async (req, res, next) => {
  try {
    const { mint } = req.params;
    const includeConfigs = parseIncludeConfigs(req.query.includeConfigs);

    const result = await getCanonicalPumpSwapPoolSnapshot(mint, includeConfigs);

    if (!result.found) {
      res.set("Cache-Control", "public, max-age=10");
      return res.status(404).json(result);
    }

    res.set("Cache-Control", "public, max-age=2");
    return res.json(result);
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({ error: err.code, message: err.message });
    }
    return next(err);
  }
});

function parseIncludeConfigs(value: unknown): boolean {
  if (value == null) return false;
  const str = String(value);
  if (str === "1" || str.toLowerCase() === "true") return true;
  if (str === "0" || str.toLowerCase() === "false") return false;
  throw new BadRequestError(`Invalid includeConfigs: ${str}`);
}

export const pumpswapRouter = router;
