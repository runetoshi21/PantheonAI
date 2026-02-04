"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Pool = {
  id: string;
  name: string;
  base: string;
  quote: string;
  fee: string;
  tvl: number;
  volume: number;
  change: number;
  price: number;
  priceLow: number;
  priceHigh: number;
  recommendedRange: [number, number];
  apy: number;
  accent: string;
  liquidity: number[];
  depth: number[];
};

type Position = {
  id: string;
  poolId: string;
  range: [number, number];
  feeTier: string;
  depositBase: string;
  depositQuote: string;
  status: "Active" | "Withdrawing" | "Closed";
  createdAt: string;
};

type Eip1193Provider = {
  request: (args: { method: string }) => Promise<unknown>;
};

const buildLiquidity = (peak: number, skew: number, length = 36) => {
  return Array.from({ length }, (_, i) => {
    const x = i / (length - 1);
    const ridge = Math.exp(-Math.pow((x - peak) / 0.18, 2));
    const shoulder = 0.6 * Math.exp(-Math.pow((x - (peak + skew)) / 0.14, 2));
    const wave = 0.08 * Math.sin((i + 2) * 0.7);
    return Math.max(0.06, ridge + shoulder + wave);
  });
};

const buildDepth = (peak: number, length = 14) => {
  return Array.from({ length }, (_, i) => {
    const x = i / (length - 1);
    const ridge = Math.exp(-Math.pow((x - peak) / 0.22, 2));
    const ridgeTwo = 0.5 * Math.exp(-Math.pow((x - (peak + 0.18)) / 0.18, 2));
    return Math.max(0.1, ridge + ridgeTwo);
  });
};

const POOLS: Pool[] = [
  {
    id: "pump-sol",
    name: "PUMP / SOL",
    base: "PUMP",
    quote: "SOL",
    fee: "0.30%",
    tvl: 12800000,
    volume: 5380000,
    change: 8.4,
    price: 0.0314,
    priceLow: 0.008,
    priceHigh: 0.082,
    recommendedRange: [22, 78],
    apy: 92,
    accent: "#E57A3B",
    liquidity: buildLiquidity(0.46, 0.12),
    depth: buildDepth(0.48),
  },
  {
    id: "aura-usdc",
    name: "AURA / USDC",
    base: "AURA",
    quote: "USDC",
    fee: "0.05%",
    tvl: 8700000,
    volume: 2940000,
    change: -3.2,
    price: 1.48,
    priceLow: 0.62,
    priceHigh: 2.4,
    recommendedRange: [34, 64],
    apy: 41,
    accent: "#1B6B62",
    liquidity: buildLiquidity(0.42, 0.18),
    depth: buildDepth(0.36),
  },
  {
    id: "zen-sol",
    name: "ZEN / SOL",
    base: "ZEN",
    quote: "SOL",
    fee: "1.00%",
    tvl: 4200000,
    volume: 1680000,
    change: 14.6,
    price: 0.0048,
    priceLow: 0.0014,
    priceHigh: 0.0098,
    recommendedRange: [18, 58],
    apy: 148,
    accent: "#8C5E2A",
    liquidity: buildLiquidity(0.33, 0.22),
    depth: buildDepth(0.3),
  },
  {
    id: "io-usdc",
    name: "IO / USDC",
    base: "IO",
    quote: "USDC",
    fee: "0.01%",
    tvl: 15600000,
    volume: 7640000,
    change: 2.1,
    price: 4.83,
    priceLow: 3.1,
    priceHigh: 6.2,
    recommendedRange: [40, 70],
    apy: 26,
    accent: "#0F3E4A",
    liquidity: buildLiquidity(0.58, 0.08),
    depth: buildDepth(0.6),
  },
];

const FEE_TIERS = ["0.01%", "0.05%", "0.30%", "1.00%"];

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);

export default function Home() {
  const [selectedPoolId, setSelectedPoolId] = useState(POOLS[0].id);
  const selectedPool = POOLS.find((pool) => pool.id === selectedPoolId) ??
    POOLS[0];
  const [range, setRange] = useState<[number, number]>(
    selectedPool.recommendedRange,
  );
  const [feeTier, setFeeTier] = useState(FEE_TIERS[2]);
  const [baseAmount, setBaseAmount] = useState("1200");
  const [quoteAmount, setQuoteAmount] = useState("32.5");
  const [wallet, setWallet] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([
    {
      id: "pos-1",
      poolId: "pump-sol",
      range: [0.018, 0.052],
      feeTier: "0.30%",
      depositBase: "8,500 PUMP",
      depositQuote: "21.4 SOL",
      status: "Active",
      createdAt: "2 days ago",
    },
    {
      id: "pos-2",
      poolId: "aura-usdc",
      range: [1.22, 1.62],
      feeTier: "0.05%",
      depositBase: "1,400 AURA",
      depositQuote: "2,100 USDC",
      status: "Active",
      createdAt: "7 hours ago",
    },
  ]);
  const positionCounter = useRef(2);

  useEffect(() => {
    setRange(selectedPool.recommendedRange);
    setFeeTier(selectedPool.fee);
  }, [selectedPool]);

  const priceAt = (pct: number) =>
    selectedPool.priceLow +
    (selectedPool.priceHigh - selectedPool.priceLow) * (pct / 100);

  const minPrice = priceAt(range[0]);
  const maxPrice = priceAt(range[1]);
  const currentPct =
    ((selectedPool.price - selectedPool.priceLow) /
      (selectedPool.priceHigh - selectedPool.priceLow)) *
    100;

  const chart = useMemo(() => {
    const width = 1000;
    const height = 260;
    const max = Math.max(...selectedPool.liquidity);
    const step = width / (selectedPool.liquidity.length - 1);
    const points = selectedPool.liquidity.map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 30) - 10;
      return [x, y] as const;
    });
    const line = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point[0]},${point[1]}`)
      .join(" ");
    const area = `${line} L ${width},${height} L 0,${height} Z`;
    return { line, area };
  }, [selectedPool]);

  const handleMinChange = (value: number) => {
    setRange(([, max]) => {
      const nextMin = Math.min(value, max - 2);
      return [Math.max(0, nextMin), max];
    });
  };

  const handleMaxChange = (value: number) => {
    setRange(([min]) => {
      const nextMax = Math.max(value, min + 2);
      return [min, Math.min(100, nextMax)];
    });
  };

  const connectWallet = async () => {
    setStatusMessage(null);
    if (typeof window === "undefined") return;
    const ethereum = (window as { ethereum?: Eip1193Provider }).ethereum;
    if (!ethereum?.request) {
      setStatusMessage("No wallet detected. Install a wallet extension.");
      return;
    }
    try {
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      setWallet(accounts?.[0] ?? null);
      setStatusMessage("Wallet connected.");
    } catch {
      setStatusMessage("Connection rejected.");
    }
  };

  const createPosition = () => {
    if (!wallet) {
      setStatusMessage("Connect a wallet before creating a position.");
      return;
    }
    positionCounter.current += 1;
    const newPosition: Position = {
      id: `pos-${positionCounter.current}`,
      poolId: selectedPool.id,
      range: [minPrice, maxPrice],
      feeTier,
      depositBase: `${baseAmount} ${selectedPool.base}`,
      depositQuote: `${quoteAmount} ${selectedPool.quote}`,
      status: "Active",
      createdAt: "Just now",
    };
    setPositions((prev) => [newPosition, ...prev]);
    setStatusMessage("Position created. Liquidity is now active.");
  };

  const withdrawPosition = (id: string) => {
    setPositions((prev) =>
      prev.map((pos) =>
        pos.id === id ? { ...pos, status: "Withdrawing" } : pos,
      ),
    );
    setStatusMessage("Withdrawal queued. Funds will settle shortly.");
  };

  return (
    <div className="liquidity-shell">
      <div className="mx-auto w-full max-w-[1280px] px-6 pb-16 pt-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ink)] text-[var(--paper)] shadow-[0_10px_30px_rgba(15,20,18,0.25)]">
              <span className="text-lg font-[var(--font-display)]">P</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--ink-muted)]">
                Pantheon Liquidity
              </p>
              <h1 className="text-3xl font-[var(--font-display)] tracking-tight text-[var(--ink)]">
                Liquidity Atlas
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="pill">Solana Network</div>
            <div className="pill border-[var(--accent)] text-[var(--accent)]">
              {selectedPool.name}
            </div>
            <button className="btn-primary" onClick={connectWallet}>
              {wallet ? `Connected: ${wallet.slice(0, 6)}...` : "Connect Wallet"}
            </button>
          </div>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="flex flex-col gap-4">
            <div className="card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--ink-muted)]">
                Pools
              </h2>
              <div className="mt-5 flex flex-col gap-3">
                {POOLS.map((pool) => {
                  const isActive = pool.id === selectedPool.id;
                  return (
                    <button
                      key={pool.id}
                      onClick={() => setSelectedPoolId(pool.id)}
                      className={`flex w-full flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-transparent bg-[var(--ink)] text-[var(--paper)] shadow-[0_18px_35px_rgba(14,16,15,0.35)]"
                          : "border-black/10 bg-white/60 hover:border-black/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold tracking-[0.08em]">
                          {pool.name}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            pool.change >= 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {pool.change >= 0 ? "+" : ""}
                          {pool.change}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                        <span>TVL {formatCompact(pool.tvl)}</span>
                        <span>Vol {formatCompact(pool.volume)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--ink-muted)]">
                          Fee {pool.fee}
                        </span>
                        <span className="font-medium">
                          {formatPrice(pool.price)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--ink-muted)]">
                Range Stability
              </h3>
              <div className="mt-4 grid gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-muted)]">
                    Downside cushion
                  </span>
                  <span className="text-sm font-semibold">
                    {Math.max(0, range[0] - currentPct).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-[var(--accent-2)]"
                    style={{
                      width: `${Math.max(5, range[0] - currentPct)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-muted)]">
                    Upside cushion
                  </span>
                  <span className="text-sm font-semibold">
                    {Math.max(0, currentPct - range[1]).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{
                      width: `${Math.max(5, currentPct - range[1])}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--ink-muted)]">
                  Cushions show how far price can move before your liquidity
                  leaves the active zone.
                </p>
              </div>
            </div>
          </aside>

          <main className="flex flex-col gap-6">
            <section className="card card-ink p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    Liquidity Map
                  </p>
                  <h2 className="mt-2 text-2xl font-[var(--font-display)] tracking-tight text-white">
                    {selectedPool.base} / {selectedPool.quote} density curve
                  </h2>
                  <p className="mt-1 text-sm text-white/70">
                    Current price sits at {formatPrice(selectedPool.price)}.
                    Highlighted band is your active range.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="stat-pill">
                    <span>APY</span>
                    <strong>{selectedPool.apy}%</strong>
                  </div>
                  <div className="stat-pill">
                    <span>Fee tier</span>
                    <strong>{selectedPool.fee}</strong>
                  </div>
                  <div className="stat-pill">
                    <span>TVL</span>
                    <strong>{formatCompact(selectedPool.tvl)}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="relative h-[260px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                  <div
                    className="absolute inset-y-0 rounded-3xl bg-[rgba(27,107,98,0.2)]"
                    style={{
                      left: `${range[0]}%`,
                      width: `${range[1] - range[0]}%`,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 w-px bg-white/70"
                    style={{ left: `${currentPct}%` }}
                  />
                  <div
                    className="absolute top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--ink)]"
                    style={{ left: `calc(${currentPct}% - 26px)` }}
                  >
                    {formatPrice(selectedPool.price)}
                  </div>
                  <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox="0 0 1000 260"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="liquidityArea"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#F6C47C" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#F6C47C" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={chart.area} fill="url(#liquidityArea)" />
                    <path
                      d={chart.line}
                      fill="none"
                      stroke="#F6C47C"
                      strokeWidth="3"
                    />
                  </svg>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                      Active Range
                    </p>
                    <div className="mt-2 grid gap-3 lg:grid-cols-2">
                      <div className="range-chip">
                        <span>Min</span>
                        <strong>{formatPrice(minPrice)}</strong>
                      </div>
                      <div className="range-chip">
                        <span>Max</span>
                        <strong>{formatPrice(maxPrice)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPool.recommendedRange.map((value, index) => (
                      <button
                        key={`${selectedPool.id}-preset-${index}`}
                        className="chip"
                        onClick={() =>
                          setRange(
                            index === 0
                              ? [value, range[1]]
                              : [range[0], value],
                          )
                        }
                      >
                        {index === 0 ? "Floor" : "Ceiling"} {value}%
                      </button>
                    ))}
                    <button
                      className="chip"
                      onClick={() => setRange([20, 80])}
                    >
                      Balanced 20-80
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="range-track">
                    <div
                      className="range-highlight"
                      style={{
                        left: `${range[0]}%`,
                        width: `${range[1] - range[0]}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={range[0]}
                      onChange={(event) =>
                        handleMinChange(Number(event.target.value))
                      }
                      className="range-slider"
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={range[1]}
                      onChange={(event) =>
                        handleMaxChange(Number(event.target.value))
                      }
                      className="range-slider"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-white/60">
                  <span>
                    {formatPrice(selectedPool.priceLow)} (low)
                  </span>
                  <span>
                    {formatPrice(selectedPool.priceHigh)} (high)
                  </span>
                </div>
              </div>
            </section>

            <section className="card p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--ink-muted)]">
                    Liquidity Bands
                  </p>
                  <h3 className="mt-2 text-xl font-[var(--font-display)]">
                    Stabilization pressure around the range
                  </h3>
                </div>
                <div className="pill border-black/10 text-[var(--ink-muted)]">
                  Depth snapshot
                </div>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--ink-muted)]">
                      Defensive buy wall
                    </span>
                    <span className="text-sm font-semibold">
                      {formatPrice(minPrice)} - {formatPrice(selectedPool.price)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/10">
                    <div
                      className="h-full rounded-full bg-[var(--accent-2)]"
                      style={{ width: `${Math.min(90, range[0])}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--ink-muted)]">
                      Upside sell wall
                    </span>
                    <span className="text-sm font-semibold">
                      {formatPrice(selectedPool.price)} - {formatPrice(maxPrice)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/10">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${Math.min(90, 100 - range[1])}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-end gap-1">
                  {selectedPool.depth.map((value, index) => (
                    <div
                      key={`depth-${selectedPool.id}-${index}`}
                      className="w-3 rounded-full bg-[var(--ink)]/80"
                      style={{ height: `${value * 68 + 12}px` }}
                    />
                  ))}
                </div>
              </div>
            </section>
          </main>

          <aside className="flex flex-col gap-6">
            <section className="card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-[var(--font-display)]">
                  Create Position
                </h3>
                <div className="pill border-black/10 text-[var(--ink-muted)]">
                  {selectedPool.fee} fee
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                <label className="field">
                  <span>Fee tier</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {FEE_TIERS.map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setFeeTier(tier)}
                        className={`chip ${
                          tier === feeTier ? "chip-active" : ""
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="field">
                  <span>Deposit {selectedPool.base}</span>
                  <input
                    value={baseAmount}
                    onChange={(event) => setBaseAmount(event.target.value)}
                    className="input"
                    placeholder="0.0"
                  />
                </label>
                <label className="field">
                  <span>Deposit {selectedPool.quote}</span>
                  <input
                    value={quoteAmount}
                    onChange={(event) => setQuoteAmount(event.target.value)}
                    className="input"
                    placeholder="0.0"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="range-mini">
                    <span>Min</span>
                    <strong>{formatPrice(minPrice)}</strong>
                  </div>
                  <div className="range-mini">
                    <span>Max</span>
                    <strong>{formatPrice(maxPrice)}</strong>
                  </div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-black/5 p-4 text-xs text-[var(--ink-muted)]">
                  Liquidity concentrates between your range limits. Earnings are
                  higher, but leave the range and you stop earning fees.
                </div>
                <button className="btn-primary w-full" onClick={createPosition}>
                  Create Position
                </button>
                {statusMessage ? (
                  <p className="text-xs text-[var(--ink-muted)]">
                    {statusMessage}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-[var(--font-display)]">
                  Your Positions
                </h3>
                <div className="pill border-black/10 text-[var(--ink-muted)]">
                  {positions.length}
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                {positions.map((position) => {
                  const pool = POOLS.find((item) => item.id === position.poolId);
                  return (
                    <div
                      key={position.id}
                      className="rounded-2xl border border-black/10 bg-white/70 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {pool?.name ?? "Pool"}
                          </p>
                          <p className="text-xs text-[var(--ink-muted)]">
                            {position.depositBase} · {position.depositQuote}
                          </p>
                        </div>
                        <span className="pill border-black/10 text-[var(--ink-muted)]">
                          {position.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-[var(--ink-muted)]">
                        <span>
                          Range {formatPrice(position.range[0])} -{" "}
                          {formatPrice(position.range[1])}
                        </span>
                        <span>{position.createdAt}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-[var(--ink-muted)]">
                          Fee {position.feeTier}
                        </span>
                        <button
                          className="btn-ghost"
                          onClick={() => withdrawPosition(position.id)}
                        >
                          Withdraw
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
