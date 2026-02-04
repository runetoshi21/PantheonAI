import { Router } from "express";
import { getClmmWithdrawQuote, prepareClmmWithdraw } from "../controllers/raydiumClmmController";

const router = Router();

router.post("/positions/withdraw", prepareClmmWithdraw);
router.get("/positions/:positionNftMint/withdraw-quote", getClmmWithdrawQuote);

export const raydiumClmmRouter = router;
