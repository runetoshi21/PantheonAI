import { formatNumber, formatUsd, shortMint } from "../../lib/liquidity/format";
import { toNumber } from "../../lib/liquidity/math";
import type { PumpSwapPoolSnapshot, SelectedPool } from "../../lib/liquidity/types";
import { Panel } from "./Panel";

type PumpSwapPanelProps = {
  enabled: boolean;
  pool: PumpSwapPoolSnapshot | null;
  selected: SelectedPool | null;
  error: string | null;
  notFound: boolean;
  tvl: number | null;
  onSelect: (id: string) => void;
};

export function PumpSwapPanel({
  enabled,
  pool,
  selected,
  error,
  notFound,
  tvl,
  onSelect,
}: PumpSwapPanelProps) {
  return (
    <Panel label="PumpSwap" title="Canonical pool" badge={pool ? "1 pool" : "0 pools"}>
      {!enabled ? (
        <div className="empty mt-4">PumpSwap excluded by filters.</div>
      ) : error ? (
        <div className="empty mt-4">{error}</div>
      ) : null}

      {enabled && pool ? (
        <button
          type="button"
          onClick={() => onSelect(pool.canonicalPool.poolKey)}
          className={`table-row mt-4 ${selected?.protocol === "pumpswap" ? "active" : ""}`}
        >
          <div>
            <div className="text-sm font-semibold">
              {shortMint(pool.canonicalPool.baseMint)} / {shortMint(pool.canonicalPool.quoteMint)}
            </div>
            <div className="text-xs text-[var(--muted)]">
              {shortMint(pool.canonicalPool.poolKey)}
            </div>
          </div>
          <div>{formatNumber(toNumber(pool.spotPrice.quotePerBase))}</div>
          <div>{formatUsd(tvl)}</div>
          <div>—</div>
          <div>—</div>
        </button>
      ) : enabled ? (
        <div className="empty mt-4">
          {notFound ? "PumpSwap pool not found." : "No PumpSwap data."}
        </div>
      ) : null}
    </Panel>
  );
}
