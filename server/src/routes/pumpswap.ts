import { Router } from "express";
import { BadRequestError } from "../core/errors";
import { parseBoolean } from "../core/query";
import { getCanonicalPumpSwapPoolSnapshot } from "../../pumpswap/poolSnapshot";

const router = Router();

router.get("/pool/:mint", async (req, res, next) => {
  try {
    const { mint } = req.params;
    const includeConfigs = parseBoolean(req.query.includeConfigs, {
      defaultValue: false,
      allowNumeric: true,
      label: "includeConfigs",
    });

    const result = await getCanonicalPumpSwapPoolSnapshot(mint, includeConfigs ?? false);

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

export const pumpswapRouter = router;
