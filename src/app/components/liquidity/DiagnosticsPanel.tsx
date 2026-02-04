import { shortMint } from "../../lib/liquidity/format";
import { Panel } from "./Panel";

type DiagnosticsPanelProps = {
  raydiumPools: number;
  meteoraPools: number;
  pumpswapOnline: boolean;
  inputMint?: string | null;
};

export function DiagnosticsPanel({
  raydiumPools,
  meteoraPools,
  pumpswapOnline,
  inputMint,
}: DiagnosticsPanelProps) {
  return (
    <Panel label="Protocol diagnostics" title="Signal health" badge="Live">
      <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
        <div className="flex items-center justify-between">
          <span>Raydium pools</span>
          <span>{raydiumPools}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Meteora pools</span>
          <span>{meteoraPools}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>PumpSwap</span>
          <span>{pumpswapOnline ? "Online" : "No pool"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Input mint</span>
          <span>{inputMint ? shortMint(inputMint) : "—"}</span>
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">
        Results are fetched from the shared liquidity overview service. Provide a mint to refresh
        cross-protocol coverage.
      </p>
    </Panel>
  );
}
