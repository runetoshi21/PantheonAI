import { Router } from "express";
import { buildPumpSwapDepositTx } from "../../pumpswap/liquidity/buildDepositTx";
import type { BuildPumpSwapDepositTxRequest } from "../types/pumpswapLiquidity";

const router = Router();

router.post("/liquidity/deposit/build", async (req, res, next) => {
  try {
    const result = await buildPumpSwapDepositTx(req.body as BuildPumpSwapDepositTxRequest);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

export const pumpswapLiquidityRouter = router;
