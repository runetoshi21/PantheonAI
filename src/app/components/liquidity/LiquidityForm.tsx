import type { FormEvent } from "react";
import { protocolMeta } from "../../lib/liquidity/config";
import type { Protocol } from "../../lib/liquidity/types";

type LiquidityFormProps = {
  mintInput: string;
  protocols: Record<Protocol, boolean>;
  minTvlUsd: string;
  loading: boolean;
  onMintChange: (value: string) => void;
  onToggleProtocol: (protocol: Protocol) => void;
  onMinTvlUsdChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LiquidityForm({
  mintInput,
  protocols,
  minTvlUsd,
  loading,
  onMintChange,
  onToggleProtocol,
  onMinTvlUsdChange,
  onSubmit,
}: LiquidityFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 lg:flex-row lg:items-end">
      <div className="flex-1">
        <label className="label">Token mint address</label>
        <input
          className="input mt-2"
          placeholder="Paste Solana mint (e.g. So11111111111111111111111111111111111111112)"
          value={mintInput}
          onChange={(event) => onMintChange(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <span className="label">Protocols</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(protocolMeta) as Protocol[]).map((protocol) => (
            <button
              type="button"
              key={protocol}
              className={`toggle ${protocols[protocol] ? "active" : ""}`}
              onClick={() => onToggleProtocol(protocol)}
            >
              {protocolMeta[protocol].label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <span className="label">Min TVL (USD)</span>
        <input
          className="input"
          value={minTvlUsd}
          onChange={(event) => onMinTvlUsdChange(event.target.value)}
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Scanning..." : "Scan Liquidity"}
      </button>
    </form>
  );
}
