export function LiquidityHeader() {
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/5 text-lg font-[var(--font-display)] text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
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
    </header>
  );
}
