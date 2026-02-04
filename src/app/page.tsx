"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

type Protocol = "raydium" | "meteora" | "pumpswap";

type RaydiumPoolDto = {
  id: string;
  kind: string;
  mintA: { address: string; symbol?: string; name?: string };
  mintB: { address: string; symbol?: string; name?: string };
  metrics: {
    price?: string;
    tvl?: string;
    feeRate?: string;
    mintAmountA?: string;
    mintAmountB?: string;
    volume24h?: string;
    fee24h?: string;
    apr24h?: string;
  };
  vaultBalances?: {
    vaultA?: { amount: string };
    vaultB?: { amount: string };
  };
};

type RaydiumPoolsByMintResponseDto = {
  inputMint: string;
  fetchedAtUnixMs: number;
  pools: RaydiumPoolDto[];
};

type PumpSwapPoolSnapshot = {
  found: true;
  inputMint: string;
  canonicalPool: {
    poolKey: string;
    baseMint: string;
    quoteMint: string;
  };
  reserves: {
    base: { amountUi: string };
    quote: { amountUi: string };
  };
  spotPrice: { quotePerBase: string };
  feesBps: {
    lpFeeBps: string;
    protocolFeeBps: string;
    creatorFeeBps: string;
  };
};

type PumpSwapPoolNotFound = {
  found: false;
  inputMint: string;
  reason: string;
};

type MeteoraPool = {
  protocol: "DLMM" | "DAMM_V1" | "DAMM_V2";
  poolAddress: string;
  poolName: string | null;
  tokens: Array<{ mint: string; role: string; isInputMint: boolean }>;
  metrics: {
    tvlUsd: number | null;
    volume24hUsd: number | null;
    fees24hUsd: number | null;
    apr24h: number | null;
    apy24h: number | null;
  };
  liquidity: {
    reserves: Array<{ mint: string; amount: string; amountUsd: string | null }>;
  };
  setup: {
    fee: { baseFee: string | null; maxFee: string | null; protocolFee: string | null };
    binStep: number | null;
    currentPrice: number | null;
    tags: string[];
  };
};

type MeteoraResult = {
  mint: string;
  cluster: string;
  fetchedAt: string;
  summary: {
    totalPools: number;
    byProtocol: { DLMM: number; DAMM_V2: number; DAMM_V1: number };
    totalTvlUsd: number;
  };
  pools: MeteoraPool[];
  errors: Array<{ protocol: string; message: string }>;
};

type LiquidityProtocolResult =
  | { protocol: "raydium"; ok: true; data: RaydiumPoolsByMintResponseDto }
  | { protocol: "raydium"; ok: false; error: string }
  | { protocol: "pumpswap"; ok: true; data: PumpSwapPoolSnapshot | PumpSwapPoolNotFound }
  | { protocol: "pumpswap"; ok: false; error: string }
  | { protocol: "meteora"; ok: true; data: MeteoraResult }
  | { protocol: "meteora"; ok: false; error: string };

type LiquidityOverviewResponse = {
  inputMint: string;
  fetchedAtUnixMs: number;
  results: LiquidityProtocolResult[];
};

type SelectedPool = { protocol: Protocol; id: string };

type DepthBand = {
  min: number;
  max: number;
  impactPct: number;
};

const protocolMeta: Record<Protocol, { label: string; accent: string }> = {
  raydium: { label: "Raydium", accent: "#2be3a1" },
  meteora: { label: "Meteora", accent: "#f5b73a" },
  pumpswap: { label: "PumpSwap", accent: "#f05d5d" },
};

const defaultProtocols: Record<Protocol, boolean> = {
  raydium: true,
  meteora: true,
  pumpswap: true,
};

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const formatUsd = (value: number | null) =>
  value == null ? "—" : `$${compact.format(value)}`;

const formatNumber = (value: number | null, digits = 4) =>
  value == null ? "—" : value.toFixed(value < 1 ? digits : 2);

const formatPercent = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(2)}%`;

const shortMint = (mint: string) =>
  mint.length <= 10
    ? mint
    : `${mint.slice(0, 4)}…${mint.slice(mint.length - 4)}`;

const toNumber = (value: unknown): number | null => {
  if (value == null) return null;
  const num = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(num) ? num : null;
};

const computeDepthBand = (
  baseReserve: number | null,
  quoteReserve: number | null,
  impact = 0.02,
): DepthBand | null => {
  if (!baseReserve || !quoteReserve) return null;
  if (baseReserve <= 0 || quoteReserve <= 0) return null;
  const k = baseReserve * quoteReserve;
  const down = k / Math.pow(baseReserve * (1 + impact), 2);
  const up = Math.pow(quoteReserve * (1 + impact), 2) / k;
  return { min: down, max: up, impactPct: impact * 100 };
};

export default function Home() {
  const [mintInput, setMintInput] = useState("");
  const [protocols, setProtocols] = useState(defaultProtocols);
  const [cluster, setCluster] = useState("mainnet-beta");
  const [minTvlUsd, setMinTvlUsd] = useState("5000");
  const [overview, setOverview] = useState<LiquidityOverviewResponse | null>(null);
  const [selected, setSelected] = useState<SelectedPool | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProtocols = useMemo(
    () =>
      (Object.keys(protocols) as Protocol[]).filter((key) => protocols[key]),
    [protocols],
  );

  const raydiumResult = useMemo(
    () => overview?.results.find((res) => res.protocol === "raydium") ?? null,
    [overview],
  );
  const meteoraResult = useMemo(
    () => overview?.results.find((res) => res.protocol === "meteora") ?? null,
    [overview],
  );
  const pumpswapResult = useMemo(
    () => overview?.results.find((res) => res.protocol === "pumpswap") ?? null,
    [overview],
  );

  const raydiumPools = useMemo(
    () => (raydiumResult && raydiumResult.ok ? raydiumResult.data.pools : []),
    [raydiumResult],
  );
  const meteoraPools = useMemo(
    () => (meteoraResult && meteoraResult.ok ? meteoraResult.data.pools : []),
    [meteoraResult],
  );
  const pumpswapPool = useMemo(
    () =>
      pumpswapResult && pumpswapResult.ok && pumpswapResult.data.found
        ? pumpswapResult.data
        : null,
    [pumpswapResult],
  );

  useEffect(() => {
    if (!overview) return;
    if (raydiumPools.length) {
      setSelected({ protocol: "raydium", id: raydiumPools[0].id });
      return;
    }
    if (meteoraPools.length) {
      setSelected({ protocol: "meteora", id: meteoraPools[0].poolAddress });
      return;
    }
    if (pumpswapPool) {
      setSelected({ protocol: "pumpswap", id: pumpswapPool.canonicalPool.poolKey });
      return;
    }
    setSelected(null);
  }, [overview, raydiumPools, meteoraPools, pumpswapPool]);

  const totals = useMemo(() => {
    const raydiumTvl = raydiumPools.reduce((sum, pool) => {
      const tvl = toNumber(pool.metrics.tvl);
      return sum + (tvl ?? 0);
    }, 0);

    const meteoraTvl =
      meteoraResult && meteoraResult.ok ? meteoraResult.data.summary.totalTvlUsd : 0;

    const pumpswapTvl = pumpswapPool
      ? (() => {
          const base = toNumber(pumpswapPool.reserves.base.amountUi) ?? 0;
          const quote = toNumber(pumpswapPool.reserves.quote.amountUi) ?? 0;
          const price = toNumber(pumpswapPool.spotPrice.quotePerBase) ?? 0;
          return quote + base * price;
        })()
      : 0;

    return {
      pools: raydiumPools.length + meteoraPools.length + (pumpswapPool ? 1 : 0),
      tvl: raydiumTvl + meteoraTvl + pumpswapTvl,
    };
  }, [raydiumPools, meteoraPools, pumpswapPool, meteoraResult]);

  const pumpswapTvl = useMemo(() => {
    if (!pumpswapPool) return null;
    const base = toNumber(pumpswapPool.reserves.base.amountUi) ?? 0;
    const quote = toNumber(pumpswapPool.reserves.quote.amountUi) ?? 0;
    const price = toNumber(pumpswapPool.spotPrice.quotePerBase) ?? 0;
    return quote + base * price;
  }, [pumpswapPool]);

  const selectedDetail = useMemo(() => {
    if (!selected) return null;

    if (selected.protocol === "raydium") {
      const pool = raydiumPools.find((item) => item.id === selected.id);
      if (!pool) return null;
      const baseReserve =
        toNumber(pool.vaultBalances?.vaultA?.amount) ??
        toNumber(pool.metrics.mintAmountA);
      const quoteReserve =
        toNumber(pool.vaultBalances?.vaultB?.amount) ??
        toNumber(pool.metrics.mintAmountB);
      const price =
        toNumber(pool.metrics.price) ??
        (baseReserve != null && quoteReserve != null
          ? quoteReserve / baseReserve
          : null);
      const band = computeDepthBand(baseReserve, quoteReserve);
      const feeRate = toNumber(pool.metrics.feeRate);
      return {
        protocol: "Raydium",
        name: `${pool.mintA.symbol ?? shortMint(pool.mintA.address)} / ${
          pool.mintB.symbol ?? shortMint(pool.mintB.address)
        }`,
        address: pool.id,
        kind: pool.kind,
        price,
        band,
        baseLabel: pool.mintA.symbol ?? shortMint(pool.mintA.address),
        quoteLabel: pool.mintB.symbol ?? shortMint(pool.mintB.address),
        reserves:
          baseReserve != null && quoteReserve != null
            ? { base: baseReserve, quote: quoteReserve }
            : null,
        tvl: toNumber(pool.metrics.tvl),
        volume: toNumber(pool.metrics.volume24h),
        apr: toNumber(pool.metrics.apr24h),
        fee: feeRate != null ? feeRate * 100 : null,
      };
    }

    if (selected.protocol === "meteora") {
      const pool = meteoraPools.find((item) => item.poolAddress === selected.id);
      if (!pool) return null;
      const baseReserve = toNumber(pool.liquidity.reserves[0]?.amount);
      const quoteReserve = toNumber(pool.liquidity.reserves[1]?.amount);
      const band = computeDepthBand(baseReserve, quoteReserve);
      const price = pool.setup.currentPrice ?? null;
      const baseLabel = shortMint(pool.liquidity.reserves[0]?.mint ?? "");
      const quoteLabel = shortMint(pool.liquidity.reserves[1]?.mint ?? "");
      return {
        protocol: `Meteora ${pool.protocol}`,
        name: pool.poolName ?? `${baseLabel} / ${quoteLabel}`,
        address: pool.poolAddress,
        kind: pool.protocol,
        price,
        band,
        baseLabel,
        quoteLabel,
        reserves:
          baseReserve != null && quoteReserve != null
            ? { base: baseReserve, quote: quoteReserve }
            : null,
        tvl: pool.metrics.tvlUsd,
        volume: pool.metrics.volume24hUsd,
        apr: pool.metrics.apr24h,
        fee: pool.setup.fee.baseFee ? toNumber(pool.setup.fee.baseFee) : null,
        binStep: pool.setup.binStep,
      };
    }

    if (selected.protocol === "pumpswap" && pumpswapPool) {
      const baseReserve = toNumber(pumpswapPool.reserves.base.amountUi);
      const quoteReserve = toNumber(pumpswapPool.reserves.quote.amountUi);
      const price = toNumber(pumpswapPool.spotPrice.quotePerBase);
      const band = computeDepthBand(baseReserve, quoteReserve);
      const lpFeeBps = toNumber(pumpswapPool.feesBps.lpFeeBps);
      return {
        protocol: "PumpSwap",
        name: `${shortMint(pumpswapPool.canonicalPool.baseMint)} / ${shortMint(
          pumpswapPool.canonicalPool.quoteMint,
        )}`,
        address: pumpswapPool.canonicalPool.poolKey,
        kind: "CPMM",
        price,
        band,
        baseLabel: shortMint(pumpswapPool.canonicalPool.baseMint),
        quoteLabel: shortMint(pumpswapPool.canonicalPool.quoteMint),
        reserves:
          baseReserve != null && quoteReserve != null
            ? { base: baseReserve, quote: quoteReserve }
            : null,
        tvl: null,
        volume: null,
        apr: null,
        fee: lpFeeBps != null ? lpFeeBps / 100 : null,
      };
    }

    return null;
  }, [selected, raydiumPools, meteoraPools, pumpswapPool]);

  const bandPosition = useMemo(() => {
    if (!selectedDetail?.band || selectedDetail.price == null) return null;
    const span = selectedDetail.band.max - selectedDetail.band.min;
    if (!Number.isFinite(span) || span <= 0) return 50;
    const raw = ((selectedDetail.price - selectedDetail.band.min) / span) * 100;
    return Math.min(95, Math.max(5, raw));
  }, [selectedDetail]);

  const reserveSplit = useMemo(() => {
    if (!selectedDetail?.reserves) return null;
    const total = selectedDetail.reserves.base + selectedDetail.reserves.quote;
    if (!Number.isFinite(total) || total <= 0) {
      return { basePct: 0, quotePct: 0 };
    }
    return {
      basePct: (selectedDetail.reserves.base / total) * 100,
      quotePct: (selectedDetail.reserves.quote / total) * 100,
    };
  }, [selectedDetail]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const mint = mintInput.trim();
    if (!mint) {
      setError("Enter a Solana mint address.");
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("mint", mint);
    if (activeProtocols.length) {
      params.set("protocols", activeProtocols.join(","));
    }
    params.set("meteoraCluster", cluster);
    const minTvlValue = Number(minTvlUsd);
    if (Number.isFinite(minTvlValue)) {
      params.set("meteoraMinTvlUsd", String(minTvlValue));
    }

    try {
      const response = await fetch(`/api/liquidity?${params.toString()}`);
      const data = (await response.json()) as LiquidityOverviewResponse;
      if (!response.ok) {
        throw new Error((data as { message?: string }).message ?? "Failed to load");
      }
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="terminal-shell">
      <div className="mx-auto w-full max-w-[1320px] px-6 pt-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[rgba(9,12,16,0.9)] text-lg font-[var(--font-display)] text-[var(--accent)] shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
              P
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]">
                Pantheon Liquidity Terminal
              </p>
              <h1 className="text-3xl font-[var(--font-display)] tracking-tight">
                Liquidity Range Visualizer
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">Cluster {cluster}</span>
            {overview ? (
              <span className="badge">
                Fetched {new Date(overview.fetchedAtUnixMs).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
        </header>

        <section className="panel mt-8 p-6">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 lg:flex-row lg:items-end"
          >
            <div className="flex-1">
              <label className="label">Token mint address</label>
              <input
                className="input mt-2"
                placeholder="Paste Solana mint (e.g. So11111111111111111111111111111111111111112)"
                value={mintInput}
                onChange={(event) => setMintInput(event.target.value)}
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
                    onClick={() =>
                      setProtocols((prev) => ({
                        ...prev,
                        [protocol]: !prev[protocol],
                      }))
                    }
                  >
                    {protocolMeta[protocol].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <span className="label">Meteora cluster</span>
              <select
                className="input"
                value={cluster}
                onChange={(event) => setCluster(event.target.value)}
              >
                <option value="mainnet-beta">mainnet-beta</option>
                <option value="devnet">devnet</option>
              </select>
            </div>
            <div className="grid gap-2">
              <span className="label">Min TVL (USD)</span>
              <input
                className="input"
                value={minTvlUsd}
                onChange={(event) => setMinTvlUsd(event.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Scanning..." : "Scan Liquidity"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="kpi">
              <span>Protocols</span>
              <strong>{activeProtocols.length}</strong>
            </div>
            <div className="kpi">
              <span>Pools found</span>
              <strong>{overview ? totals.pools : "—"}</strong>
            </div>
            <div className="kpi">
              <span>Total TVL</span>
              <strong>{overview ? formatUsd(totals.tvl) : "—"}</strong>
            </div>
            <div className="kpi">
              <span>Status</span>
              <strong>{loading ? "Fetching" : overview ? "Ready" : "Idle"}</strong>
            </div>
            {error ? <span className="text-sm text-[var(--danger)]">{error}</span> : null}
          </div>
        </section>

        <div className="mt-10 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <section className="panel p-6">
              <div className="panel-header">
                <div>
                  <p className="label">Raydium</p>
                  <h2 className="mt-1 text-lg font-[var(--font-display)]">
                    Concentrated + CPMM pools
                  </h2>
                </div>
                <span className="badge">{raydiumPools.length} pools</span>
              </div>

              {!protocols.raydium ? (
                <div className="empty mt-4">Raydium excluded by filters.</div>
              ) : raydiumResult && !raydiumResult.ok ? (
                <div className="empty mt-4">{raydiumResult.error}</div>
              ) : null}

              {protocols.raydium && raydiumPools.length ? (
                <div className="table mt-4">
                  <div className="table-head">
                    <span>Pool</span>
                    <span>Price</span>
                    <span>TVL</span>
                    <span>Vol 24h</span>
                    <span>APR 24h</span>
                  </div>
                  {raydiumPools.map((pool) => {
                    const name = `${pool.mintA.symbol ?? shortMint(pool.mintA.address)} / ${
                      pool.mintB.symbol ?? shortMint(pool.mintB.address)
                    }`;
                    const price = toNumber(pool.metrics.price);
                    return (
                      <button
                        key={pool.id}
                        type="button"
                        onClick={() => setSelected({ protocol: "raydium", id: pool.id })}
                        className={`table-row ${
                          selected?.protocol === "raydium" && selected.id === pool.id
                            ? "active"
                            : ""
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
                </div>
              ) : protocols.raydium ? (
                <div className="empty mt-4">No Raydium pools returned.</div>
              ) : null}
            </section>

            <section className="panel p-6">
              <div className="panel-header">
                <div>
                  <p className="label">Meteora</p>
                  <h2 className="mt-1 text-lg font-[var(--font-display)]">
                    DLMM + DAMM liquidity
                  </h2>
                </div>
                <span className="badge">{meteoraPools.length} pools</span>
              </div>

              {!protocols.meteora ? (
                <div className="empty mt-4">Meteora excluded by filters.</div>
              ) : meteoraResult && !meteoraResult.ok ? (
                <div className="empty mt-4">{meteoraResult.error}</div>
              ) : null}

              {protocols.meteora && meteoraPools.length ? (
                <div className="table mt-4">
                  <div className="table-head">
                    <span>Pool</span>
                    <span>Price</span>
                    <span>TVL</span>
                    <span>Vol 24h</span>
                    <span>APR 24h</span>
                  </div>
                  {meteoraPools.map((pool) => {
                    const base = shortMint(pool.tokens[0]?.mint ?? "");
                    const quote = shortMint(pool.tokens[1]?.mint ?? "");
                    const price = pool.setup.currentPrice ?? null;
                    return (
                      <button
                        key={pool.poolAddress}
                        type="button"
                        onClick={() =>
                          setSelected({ protocol: "meteora", id: pool.poolAddress })
                        }
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
                </div>
              ) : protocols.meteora ? (
                <div className="empty mt-4">No Meteora pools returned.</div>
              ) : null}
            </section>

            <section className="panel p-6">
              <div className="panel-header">
                <div>
                  <p className="label">PumpSwap</p>
                  <h2 className="mt-1 text-lg font-[var(--font-display)]">Canonical pool</h2>
                </div>
                <span className="badge">{pumpswapPool ? "1 pool" : "0 pools"}</span>
              </div>

              {!protocols.pumpswap ? (
                <div className="empty mt-4">PumpSwap excluded by filters.</div>
              ) : pumpswapResult && !pumpswapResult.ok ? (
                <div className="empty mt-4">{pumpswapResult.error}</div>
              ) : null}

              {protocols.pumpswap && pumpswapPool ? (
                <button
                  type="button"
                  onClick={() =>
                    setSelected({
                      protocol: "pumpswap",
                      id: pumpswapPool.canonicalPool.poolKey,
                    })
                  }
                  className={`table-row mt-4 ${
                    selected?.protocol === "pumpswap" ? "active" : ""
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {shortMint(pumpswapPool.canonicalPool.baseMint)} / {" "}
                      {shortMint(pumpswapPool.canonicalPool.quoteMint)}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {shortMint(pumpswapPool.canonicalPool.poolKey)}
                    </div>
                  </div>
                  <div>{formatNumber(toNumber(pumpswapPool.spotPrice.quotePerBase))}</div>
                  <div>{formatUsd(pumpswapTvl)}</div>
                  <div>—</div>
                  <div>—</div>
                </button>
              ) : protocols.pumpswap ? (
                <div className="empty mt-4">
                  {pumpswapResult && pumpswapResult.ok && !pumpswapResult.data.found
                    ? "PumpSwap pool not found."
                    : "No PumpSwap data."}
                </div>
              ) : null}
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="panel p-6">
              <div className="panel-header">
                <div>
                  <p className="label">Selected pool</p>
                  <h2 className="mt-1 text-xl font-[var(--font-display)]">
                    {selectedDetail?.name ?? "Awaiting selection"}
                  </h2>
                </div>
                {selectedDetail ? <span className="badge">{selectedDetail.protocol}</span> : null}
              </div>

              {selectedDetail ? (
                <div className="mt-4 grid gap-4">
                  <div className="data-grid">
                    <div className="kpi">
                      <span>Current price</span>
                      <strong>{formatNumber(selectedDetail.price)}</strong>
                    </div>
                    <div className="kpi">
                      <span>TVL</span>
                      <strong>{formatUsd(selectedDetail.tvl)}</strong>
                    </div>
                    <div className="kpi">
                      <span>Volume 24h</span>
                      <strong>{formatUsd(selectedDetail.volume)}</strong>
                    </div>
                    <div className="kpi">
                      <span>APR 24h</span>
                      <strong>{formatPercent(selectedDetail.apr)}</strong>
                    </div>
                    <div className="kpi">
                      <span>Fee tier</span>
                      <strong>{formatPercent(selectedDetail.fee)}</strong>
                    </div>
                    {selectedDetail.binStep != null ? (
                      <div className="kpi">
                        <span>Bin step</span>
                        <strong>{selectedDetail.binStep}</strong>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <p className="label">
                      Depth band
                      {selectedDetail.band
                        ? ` (±${selectedDetail.band.impactPct}% reserves)`
                        : " (pending)"}
                    </p>
                    {selectedDetail.band && selectedDetail.price != null ? (
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
                    {selectedDetail.band ? (
                      <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
                        <span>Min {formatNumber(selectedDetail.band.min)}</span>
                        <span>Max {formatNumber(selectedDetail.band.max)}</span>
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Band is derived from pool reserves to show stabilization depth. Use pool-side
                      bin/tick distribution for precise CLMM ranges.
                    </p>
                  </div>

                  {selectedDetail.reserves ? (
                    <div>
                      <p className="label">Reserve composition</p>
                      <div className="mt-3 grid gap-2">
                        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                          <span>{selectedDetail.baseLabel}</span>
                          <span>{compact.format(selectedDetail.reserves.base)}</span>
                        </div>
                        <div className="spark" style={{
                          "--spark-width": `${reserveSplit?.basePct ?? 0}%`,
                        } as CSSProperties} />
                        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                          <span>{selectedDetail.quoteLabel}</span>
                          <span>{compact.format(selectedDetail.reserves.quote)}</span>
                        </div>
                        <div className="spark" style={{
                          "--spark-width": `${reserveSplit?.quotePct ?? 0}%`,
                        } as CSSProperties} />
                      </div>
                    </div>
                  ) : null}

                  <div className="text-xs text-[var(--muted)]">
                    Pool address: {selectedDetail.address}
                  </div>
                </div>
              ) : (
                <div className="empty mt-4">Select a pool to see depth analysis.</div>
              )}
            </section>

            <section className="panel p-6">
              <div className="panel-header">
                <div>
                  <p className="label">Protocol diagnostics</p>
                  <h2 className="mt-1 text-lg font-[var(--font-display)]">Signal health</h2>
                </div>
                <span className="badge">Live</span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
                <div className="flex items-center justify-between">
                  <span>Raydium pools</span>
                  <span>{raydiumPools.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Meteora pools</span>
                  <span>{meteoraPools.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>PumpSwap</span>
                  <span>{pumpswapPool ? "Online" : "No pool"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Input mint</span>
                  <span>{overview ? shortMint(overview.inputMint) : "—"}</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-[var(--muted)]">
                Results are fetched from the shared liquidity overview service. Provide a mint to
                refresh cross-protocol coverage.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
