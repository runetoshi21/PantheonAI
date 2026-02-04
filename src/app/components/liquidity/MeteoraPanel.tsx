import { formatNumber, formatPercent, formatUsd, shortMint } from "../../lib/liquidity/format";
import type { MeteoraPool, SelectedPool } from "../../lib/liquidity/types";
import { Panel } from "./Panel";
import { PoolTable } from "./PoolTable";

type MeteoraPanelProps = {
  enabled: boolean;
  pools: MeteoraPool[];
  selected: SelectedPool | null;
  error: string | null;
  onSelect: (id: string) => void;
};

const columns = ["Pool", "Price", "TVL", "Vol 24h", "APR 24h"];

export function MeteoraPanel({
  enabled,
  pools,
  selected,
  error,
  onSelect,
}: MeteoraPanelProps) {
  return (
    <Panel label="Meteora" title="DLMM + DAMM liquidity" badge={`${pools.length} pools`}>
      {!enabled ? (
        <div className="empty mt-4">Meteora excluded by filters.</div>
      ) : error ? (
        <div className="empty mt-4">{error}</div>
      ) : null}

      {enabled && pools.length ? (
        <PoolTable columns={columns}>
          {pools.map((pool) => {
            const base = shortMint(pool.tokens[0]?.mint ?? "");
            const quote = shortMint(pool.tokens[1]?.mint ?? "");
            const price = pool.setup.currentPrice ?? null;
            return (
              <button
                key={pool.poolAddress}
                type="button"
                onClick={() => onSelect(pool.poolAddress)}
                className={`table-row ${
                  selected?.protocol === "meteora" && selected.id === pool.poolAddress
                    ? "active"
                    : ""
                }`}
              >
                <div>
                  <div className="text-sm font-semibold">
                    {pool.poolName ?? `${base} / ${quote}`}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {pool.protocol} · {shortMint(pool.poolAddress)}
                  </div>
                </div>
                <div>{formatNumber(price)}</div>
                <div>{formatUsd(pool.metrics.tvlUsd)}</div>
                <div>{formatUsd(pool.metrics.volume24hUsd)}</div>
                <div>{formatPercent(pool.metrics.apr24h)}</div>
              </button>
            );
          })}
        </PoolTable>
      ) : enabled ? (
        <div className="empty mt-4">No Meteora pools returned.</div>
      ) : null}
    </Panel>
  );
}
