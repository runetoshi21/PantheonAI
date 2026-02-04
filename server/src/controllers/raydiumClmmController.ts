import { PublicKey } from "@solana/web3.js";
import type { Request, Response, NextFunction } from "express";
import { withdrawSchema, withdrawQuoteSchema } from "../integrations/raydium/clmm/withdraw.schema";
import { isClmmError } from "../integrations/raydium/clmm/errors";
import { getWithdrawQuote, prepareWithdraw } from "../integrations/raydium/clmm/withdraw.service";

export async function prepareClmmWithdraw(req: Request, res: Response, next: NextFunction) {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      details: parsed.error.flatten()
    });
  }

  try {
    const response = await prepareWithdraw(parsed.data);
    return res.json(response);
  } catch (error) {
    if (isClmmError(error)) {
      return res.status(error.status).json({
        code: error.code,
        message: error.message,
        details: error.details
      });
    }
    return next(error);
  }
}

export async function getClmmWithdrawQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const positionNftMint = String(req.params.positionNftMint ?? "");
    try {
      new PublicKey(positionNftMint);
    } catch {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Invalid positionNftMint"
      });
    }

    const parsed = withdrawQuoteSchema.safeParse({
      owner: req.query.owner,
      liquidityBps: req.query.liquidityBps ? Number(req.query.liquidityBps) : undefined,
      slippageBps: req.query.slippageBps ? Number(req.query.slippageBps) : undefined
    });

    if (!parsed.success) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Invalid query parameters",
        details: parsed.error.flatten()
      });
    }

    const response = await getWithdrawQuote({
      owner: parsed.data.owner,
      positionNftMint,
      liquidityBps: parsed.data.liquidityBps,
      slippageBps: parsed.data.slippageBps
    });

    return res.json(response);
  } catch (error) {
    if (isClmmError(error)) {
      return res.status(error.status).json({
        code: error.code,
        message: error.message,
        details: error.details
      });
    }
    return next(error);
  }
}
