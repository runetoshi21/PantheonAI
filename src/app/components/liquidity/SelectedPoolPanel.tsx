import type { CSSProperties } from "react";
import { formatCompact, formatNumber, formatPercent, formatUsd } from "../../lib/liquidity/format";
import type { SelectedPoolDetail } from "../../lib/liquidity/types";
import { Panel } from "./Panel";

type SelectedPoolPanelProps = {
  detail: SelectedPoolDetail | null;
  bandPosition: number | null;
  reserveSplit: { basePct: number; quotePct: number } | null;
};

export function SelectedPoolPanel({
  detail,
  bandPosition,
  reserveSplit,
}: SelectedPoolPanelProps) {
  return (
    <Panel
      label="Selected pool"
      title={detail?.name ?? "Awaiting selection"}
      badge={detail ? detail.protocol : null}
      titleClassName="text-xl"
    >
      {detail ? (
        <div className="mt-4 grid gap-4">
          <div className="data-grid">
            <div className="kpi">
              <span>Current price</span>
              <strong>{formatNumber(detail.price)}</strong>
            </div>
            <div className="kpi">
              <span>TVL</span>
              <strong>{formatUsd(detail.tvl)}</strong>
            </div>
            <div className="kpi">
              <span>Volume 24h</span>
              <strong>{formatUsd(detail.volume)}</strong>
            </div>
            <div className="kpi">
              <span>APR 24h</span>
              <strong>{formatPercent(detail.apr)}</strong>
            </div>
            <div className="kpi">
              <span>Fee tier</span>
              <strong>{formatPercent(detail.fee)}</strong>
            </div>
            {detail.binStep != null ? (
              <div className="kpi">
                <span>Bin step</span>
                <strong>{detail.binStep}</strong>
              </div>
            ) : null}
          </div>

          <div>
            <p className="label">
              Depth band
              {detail.band ? ` (±${detail.band.impactPct}% reserves)` : " (pending)"}
            </p>
            {detail.band && detail.price != null ? (
              <div className="range-rail mt-3">
                <div className="range-band" />
                <div
                  className="range-marker"
                  style={{
                    left: `${bandPosition ?? 50}%`,
                  }}
                />
              </div>
            ) : (
              <div className="empty mt-3">Not enough data to compute a band.</div>
            )}
            {detail.band ? (
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
                <span>Min {formatNumber(detail.band.min)}</span>
                <span>Max {formatNumber(detail.band.max)}</span>
              </div>
            ) : null}
            <p className="mt-2 text-xs text-[var(--muted)]">
              Band is derived from pool reserves to show stabilization depth. Use pool-side
              bin/tick distribution for precise CLMM ranges.
            </p>
          </div>

          {detail.reserves ? (
            <div>
              <p className="label">Reserve composition</p>
              <div className="mt-3 grid gap-2">
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{detail.baseLabel}</span>
                  <span>{formatCompact(detail.reserves.base)}</span>
                </div>
                <div
                  className="spark"
                  style={{
                    "--spark-width": `${reserveSplit?.basePct ?? 0}%`,
                  } as CSSProperties}
                />
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{detail.quoteLabel}</span>
                  <span>{formatCompact(detail.reserves.quote)}</span>
                </div>
                <div
                  className="spark"
                  style={{
                    "--spark-width": `${reserveSplit?.quotePct ?? 0}%`,
                  } as CSSProperties}
                />
              </div>
            </div>
          ) : null}

          <div className="text-xs text-[var(--muted)]">Pool address: {detail.address}</div>
        </div>
      ) : (
        <div className="empty mt-4">Select a pool to see depth analysis.</div>
      )}
    </Panel>
  );
}
