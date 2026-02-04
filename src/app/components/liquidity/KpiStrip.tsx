import { formatUsd } from "../../lib/liquidity/format";

type KpiStripProps = {
  activeProtocols: number;
  pools: number;
  totalTvl: number;
  loading: boolean;
  hasOverview: boolean;
  error: string | null;
};

export function KpiStrip({
  activeProtocols,
  pools,
  totalTvl,
  loading,
  hasOverview,
  error,
}: KpiStripProps) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <div className="kpi">
        <span>Protocols</span>
        <strong>{activeProtocols}</strong>
      </div>
      <div className="kpi">
        <span>Pools found</span>
        <strong>{hasOverview ? pools : "—"}</strong>
      </div>
      <div className="kpi">
        <span>Total TVL</span>
        <strong>{hasOverview ? formatUsd(totalTvl) : "—"}</strong>
      </div>
      <div className="kpi">
        <span>Status</span>
        <strong>{loading ? "Fetching" : hasOverview ? "Ready" : "Idle"}</strong>
      </div>
      {error ? <span className="text-sm text-[var(--danger)]">{error}</span> : null}
    </div>
  );
}
