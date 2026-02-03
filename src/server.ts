import "dotenv/config";
import express from "express";
import { RaydiumApiError } from "./core/errors";
import { raydiumRouter } from "./routes/raydium";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/v1/raydium", raydiumRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof RaydiumApiError) {
    return res.status(502).json({ error: err.code, message: err.message });
  }
  const message = err instanceof Error ? err.message : "Internal error";
  return res.status(500).json({ error: "INTERNAL_ERROR", message });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`PantheonAI API listening on :${port}`);
});
