import { formatNumber, formatPercent, formatUsd, shortMint } from "../../lib/liquidity/format";
import { toNumber } from "../../lib/liquidity/math";
import type { RaydiumPoolDto, SelectedPool } from "../../lib/liquidity/types";
import { Panel } from "./Panel";
import { PoolTable } from "./PoolTable";

type RaydiumPanelProps = {
  enabled: boolean;
  pools: RaydiumPoolDto[];
  selected: SelectedPool | null;
  error: string | null;
  onSelect: (id: string) => void;
};

const columns = ["Pool", "Price", "TVL", "Vol 24h", "APR 24h"];

export function RaydiumPanel({
  enabled,
  pools,
  selected,
  error,
  onSelect,
}: RaydiumPanelProps) {
  return (
    <Panel
      label="Raydium"
      title="Concentrated + CPMM pools"
      badge={`${pools.length} pools`}
    >
      {!enabled ? (
        <div className="empty mt-4">Raydium excluded by filters.</div>
      ) : error ? (
        <div className="empty mt-4">{error}</div>
      ) : null}

      {enabled && pools.length ? (
        <PoolTable columns={columns}>
          {pools.map((pool) => {
            const name = `${pool.mintA.symbol ?? shortMint(pool.mintA.address)} / ${
              pool.mintB.symbol ?? shortMint(pool.mintB.address)
            }`;
            const price = toNumber(pool.metrics.price);
            return (
              <button
                key={pool.id}
                type="button"
                onClick={() => onSelect(pool.id)}
                className={`table-row ${
                  selected?.protocol === "raydium" && selected.id === pool.id ? "active" : ""
                }`}
              >
                <div>
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {pool.kind.toUpperCase()} · {shortMint(pool.id)}
                  </div>
                </div>
                <div>{formatNumber(price)}</div>
                <div>{formatUsd(toNumber(pool.metrics.tvl))}</div>
                <div>{formatUsd(toNumber(pool.metrics.volume24h))}</div>
                <div>{formatPercent(toNumber(pool.metrics.apr24h))}</div>
              </button>
            );
          })}
        </PoolTable>
      ) : enabled ? (
        <div className="empty mt-4">No Raydium pools returned.</div>
      ) : null}
    </Panel>
  );
}
